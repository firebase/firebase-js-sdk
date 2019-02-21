/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { exec } = require('child-process-promise');
const { argv } = require('yargs');
const fs = require('mz/fs');
const path = require('path');
const yaml = require('js-yaml');

const repoPath = path.resolve(`${__dirname}/../..`);
const docPath = path.resolve(`${__dirname}/html`);
const sourceFile = argv.source
  ? path.resolve(argv.source)
  : `${repoPath}/packages/firebase/index.d.ts`;

const command = `${repoPath}/node_modules/.bin/typedoc ${sourceFile} \
--out ${docPath} \
--readme ${__dirname}/HOME_TEMP.md \
--options ${__dirname}/typedoc.js \
--theme ${__dirname}/theme`;

console.log('Running command:\n', command);

function moveFilesToRoot(subdir) {
  return exec(`mv ${docPath}/${subdir}/* ${docPath}`)
    .then(() => {
      exec(`rmdir ${docPath}/${subdir}`);
    })
    .catch(e => console.error(e));
}

// Reformat links to match flat structure.
function fixLinks(path) {
  return fs.readFile(path, 'utf8').then(data => {
    const fixedLinks = data
      .replace(/\.\.\//g, '')
      .replace(/(modules|interfaces|classes)\//g, '');
    return fs.writeFile(path, fixedLinks);
  });
}

function stripPath(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

let tocLower = '';

Promise.all([
  fs.readFile(`${__dirname}/toc.yaml`, 'utf8'),
  fs.readFile(`${__dirname}/HOME.md`, 'utf8')
])
  // Read TOC and homepage text and assemble a homepage markdown file.
  .then(([tocRaw, homeRaw]) => {
    // In case we need to paste in toc.yaml from old docs.
    tocLower = tocRaw.replace(/path:.*/g, x => x.toLowerCase());
    const { toc } = yaml.safeLoad(tocLower);
    let tocPageLines = [homeRaw, '# API Reference'];
    toc.forEach(group => {
      tocPageLines.push(`\n## [${group.title}](${stripPath(group.path)})`);
      group.section.forEach(item => {
        tocPageLines.push(`- [${item.title}](${stripPath(item.path)})`);
      });
    });
    return fs.writeFile(`${__dirname}/HOME_TEMP.md`, tocPageLines.join('\n'));
  })
  // Run main Typedoc process (uses HOME_TEMP.md)
  .then(() => exec(command))
  .then(output => {
    console.log(output.stdout);
    // Clean up temp home markdown file. (Nothing needs to wait for this.)
    fs.unlink(`${__dirname}/HOME_TEMP.md`);
    // Devsite doesn't like css.map files.
    return fs.unlink(`${docPath}/assets/css/main.css.map`);
  })
  // Write out TOC file.
  .then(() => fs.writeFile(`${docPath}/_toc.yaml`, tocLower))
  // Flatten file structure.
  .then(() => {
    return Promise.all([
      moveFilesToRoot('classes'),
      moveFilesToRoot('modules'),
      moveFilesToRoot('interfaces')
    ]);
  })
  // Check for files listed in TOC that are missing.
  .then(() => {
    const filenames = tocLower
      .split('\n')
      .filter(line => line.includes('path:'))
      .map(line => line.split('js/')[1]);
    filenames.forEach(filename => {
      // This is just a warning, it doesn't need to finish before
      // the process continues.
      fs.exists(`${docPath}/${filename}.html`).then(exists => {
        if (!exists) {
          console.warn(
            `Missing file: ${filename}.html requested ` +
              `in toc.yaml but not found in ${docPath}`
          );
        }
      });
    });
  })
  // Correct the links in all the html files to match flat structure.
  .then(() => {
    return fs.readdir(docPath);
  })
  .then(files => {
    const htmlFiles = files.filter(filename => filename.slice(-4) === 'html');
    htmlFiles.forEach(file => fixLinks(`${docPath}/${file}`));
  })
  .catch(e => {
    if (e.stdout) {
      console.error(e.stdout);
    } else {
      console.error(e);
    }
  });
