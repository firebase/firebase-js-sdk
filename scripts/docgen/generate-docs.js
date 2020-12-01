/**
 * @license
 * Copyright 2019 Google LLC
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
const yargs = require('yargs');
const fs = require('mz/fs');
const path = require('path');
const yaml = require('js-yaml');
const typescript = require('typescript');

const repoPath = path.resolve(`${__dirname}/../..`);

// Command-line options.
const { api: apiType, source: sourceFile } = yargs
  .option('api', {
    default: 'js',
    describe: 'api to generate docs for ("js" or "node")',
    type: 'string'
  })
  .option('source', {
    default: `${repoPath}/packages/firebase/index.d.ts`,
    describe: 'Typescript source file(s)',
    type: 'string'
  })
  .version(false)
  .help().argv;

const docPath = path.resolve(`${__dirname}/html/${apiType}`);
const contentPath = path.resolve(`${__dirname}/content-sources/${apiType}`);
const tempHomePath = path.resolve(`${contentPath}/HOME_TEMP.md`);
const tempNodeSourcePath = path.resolve(`${__dirname}/index.node.d.ts`);
const devsitePath = `/docs/reference/${apiType}/`;

/**
 * Strips path prefix and returns only filename.
 * @param {string} path
 */
function stripPath(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Runs Typedoc command.
 *
 * Additional config options come from ./typedoc.js
 */
function runTypedoc() {
  const typeSource = apiType === 'node' ? tempNodeSourcePath : sourceFile;
  const command = `${repoPath}/node_modules/.bin/typedoc ${typeSource} \
  --tsconfig ${repoPath}/scripts/docgen/tsconfig.json \
  --out ${docPath} \
  --readme ${tempHomePath} \
  --options ${__dirname}/typedoc.js \
  --theme ${__dirname}/theme`;

  console.log('Running command:\n', command);
  return exec(command);
}

/**
 * Moves files from subdir to root.
 * @param {string} subdir Subdir to move files out of.
 */
function moveFilesToRoot(subdir) {
  const srcDir = `${docPath}/${subdir}`;
  return fs
    .exists(srcDir)
    .then(exists => {
      if (exists) {
        return exec(`mv ${srcDir}/* ${docPath}`).then(() => {
          exec(`rmdir ${srcDir}`);
        });
      }
    })
    .catch(e => console.error(e));
}

/**
 * Reformat links to match flat structure.
 * @param {string} file File to fix links in.
 */
function fixLinks(file) {
  return fs.readFile(file, 'utf8').then(data => {
    const flattenedLinks = data
      .replace(/\.\.\//g, '')
      .replace(/(modules|interfaces|classes|enums)\//g, '');
    let caseFixedLinks = flattenedLinks;
    for (const lower in lowerToUpperLookup) {
      const re = new RegExp(lower, 'g');
      caseFixedLinks = caseFixedLinks.replace(re, lowerToUpperLookup[lower]);
    }
    let badLinkCleanup = caseFixedLinks.replace(
      /{@link (.+)}/g,
      (all, text) => {
        // It's expected to have some broken @link tags in Node docs
        // since they could reference some pages only generated for JS.
        // Just render as plain text. Warn if it's not a Node doc.
        if (!file.includes('/node/')) {
          console.log(
            `Unable to generate link for "${all} in ${file}", ` +
              `removing markup and rendering as plain text.`
          );
        }
        return text;
      }
    );
    return fs.writeFile(file, badLinkCleanup);
  });
}

let tocText = '';

/**
 * Generates temporary markdown file that will be sourced by Typedoc to
 * create index.html.
 *
 * @param {string} tocRaw
 * @param {string} homeRaw
 */
function generateTempHomeMdFile(tocRaw, homeRaw) {
  const { toc } = yaml.safeLoad(tocRaw);
  let tocPageLines = [homeRaw, '# API Reference'];
  toc.forEach(group => {
    tocPageLines.push(`\n## [${group.title}](${stripPath(group.path)}.html)`);
    group.section.forEach(item => {
      tocPageLines.push(`- [${item.title}](${stripPath(item.path)}.html)`);
    });
  });
  return fs.writeFile(tempHomePath, tocPageLines.join('\n'));
}

/**
 * Mapping between lowercase file name and correctly cased name.
 * Used to update links when filenames are capitalized.
 */
const lowerToUpperLookup = {};

/**
 * Checks to see if any files listed in toc.yaml were not generated.
 * If files exist, fixes filename case to match toc.yaml version.
 */
function checkForMissingFilesAndFixFilenameCase() {
  // Get filenames from toc.yaml.
  const filenames = tocText
    .split('\n')
    .filter(line => line.includes('path:'))
    .map(line => {
      const parts = line.split(devsitePath);
      if (parts[1]) {
        return parts[1];
      }
      return { line };
    });
  // Logs warning to console if a file from TOC is not found.
  const fileCheckPromises = filenames.map(filename => {
    // Warns if file does not exist, fixes filename case if it does.
    // Preferred filename for devsite should be capitalized and taken from
    // toc.yaml.
    if (!filename) {
      return Promise.resolve();
    } else if (filename && filename.line) {
      console.warn(
        `Unable to parse filename from toc.yaml line:\n${filename.line}` +
          `\nPath may be incorrect.\n`
      );
      return Promise.resolve();
    }
    const tocFilePath = `${docPath}/${filename}.html`;
    // Generated filename from Typedoc will be lowercase.
    const generatedFilePath = `${docPath}/${filename.toLowerCase()}.html`;
    return fs.exists(generatedFilePath).then(exists => {
      if (exists) {
        // Store in a lookup table for link fixing.
        lowerToUpperLookup[
          `${filename.toLowerCase()}.html`
        ] = `${filename}.html`;
        return fs.rename(generatedFilePath, tocFilePath);
      } else {
        console.warn(
          `Missing file: ${filename}.html requested ` +
            `in toc.yaml but not found in ${docPath}`
        );
      }
    });
  });
  return Promise.all(fileCheckPromises).then(() => filenames);
}

/**
 * Gets a list of html files in generated dir and checks if any are not
 * found in toc.yaml.
 * Option to remove the file if not found (used for node docs).
 *
 * @param {Array} filenamesFromToc Filenames pulled from toc.yaml
 * @param {boolean} shouldRemove Should just remove the file
 */
function checkForUnlistedFiles(filenamesFromToc, shouldRemove) {
  return fs.readdir(docPath).then(files => {
    const htmlFiles = files
      .filter(filename => filename.slice(-4) === 'html')
      .map(filename => filename.slice(0, -5));
    const removePromises = [];
    htmlFiles.forEach(filename => {
      if (
        !filenamesFromToc.includes(filename) &&
        filename !== 'index' &&
        filename !== 'globals'
      ) {
        if (shouldRemove) {
          console.log(
            `REMOVING ${docPath}/${filename}.html - not listed in toc.yaml.`
          );
          removePromises.push(fs.unlink(`${docPath}/${filename}.html`));
        } else {
          // This is just a warning, it doesn't need to finish before
          // the process continues.
          console.warn(
            `Unlisted file: ${filename} generated ` +
              `but not listed in toc.yaml.`
          );
        }
      }
    });
    if (shouldRemove) {
      return Promise.all(removePromises).then(() =>
        htmlFiles.filter(filename => filenamesFromToc.includes(filename))
      );
    } else {
      return htmlFiles;
    }
  });
}

/**
 * Writes a _toc_autogenerated.yaml as a record of all files that were
 * autogenerated.  Helpful to tech writers.
 *
 * @param {Array} htmlFiles List of html files found in generated dir.
 */
function writeGeneratedFileList(htmlFiles) {
  const fileList = htmlFiles.map(filename => {
    return {
      title: filename,
      path: `${devsitePath}${filename}`
    };
  });
  const generatedTocYAML = yaml.safeDump({ toc: fileList });
  return fs
    .writeFile(`${docPath}/_toc_autogenerated.yaml`, generatedTocYAML)
    .then(() => htmlFiles);
}

/**
 * Fix all links in generated files to other generated files to point to top
 * level of generated docs dir.
 *
 * @param {Array} htmlFiles List of html files found in generated dir.
 */
function fixAllLinks(htmlFiles) {
  const writePromises = [];
  htmlFiles.forEach(file => {
    // Update links in each html file to match flattened file structure.
    writePromises.push(fixLinks(`${docPath}/${file}.html`));
  });
  return Promise.all(writePromises);
}

/**
 * Generate an temporary abridged version of index.d.ts used to create
 * Node docs.
 */
async function generateNodeSource() {
  const sourceText = await fs.readFile(sourceFile, 'utf8');

  // Parse index.d.ts. A dummy filename is required but it doesn't create a
  // file.
  let typescriptSourceFile = typescript.createSourceFile(
    'temp.d.ts',
    sourceText,
    typescript.ScriptTarget.ES2015,
    /*setParentNodes */ false
  );

  /**
   * Typescript transformer function. Removes nodes tagged with @webonly.
   */
  const removeWebOnlyNodes = context => rootNode => {
    function visit(node) {
      if (
        node.jsDoc &&
        node.jsDoc.some(
          item =>
            item.tags &&
            item.tags.some(tag => tag.tagName.escapedText === 'webonly')
        )
      ) {
        return null;
      }
      return typescript.visitEachChild(node, visit, context);
    }
    return typescript.visitNode(rootNode, visit);
  };

  // Use above transformer on source AST to remove nodes tagged with @webonly.
  const result = typescript.transform(typescriptSourceFile, [
    removeWebOnlyNodes
  ]);

  // Convert transformed AST to text and write to file.
  const printer = typescript.createPrinter();
  return fs.writeFile(
    tempNodeSourcePath,
    printer.printFile(result.transformed[0])
  );
}

/**
 * Main document generation process.
 *
 * Steps for generating documentation:
 * 1) Create temporary md file as source of homepage.
 * 2) Run Typedoc, sourcing index.d.ts for API content and temporary md file
 *    for index.html content.
 * 3) Write table of contents file.
 * 4) Flatten file structure by moving all items up to root dir and fixing
 *    links as needed.
 * 5) Check for mismatches between TOC list and generated file list.
 */
Promise.all([
  fs.readFile(`${contentPath}/toc.yaml`, 'utf8'),
  fs.readFile(`${contentPath}/HOME.md`, 'utf8')
])
  // Read TOC and homepage text and assemble a homepage markdown file.
  // This file will be sourced by Typedoc to generate index.html.
  .then(([tocRaw, homeRaw]) => {
    tocText = tocRaw;
    return generateTempHomeMdFile(tocRaw, homeRaw);
  })
  .then(() => {
    if (apiType === 'node') {
      return generateNodeSource();
    }
  })
  // Run main Typedoc process (uses index.d.ts and generated temp file above).
  .then(runTypedoc)
  .then(async output => {
    // Typedoc output.
    console.log(output.stdout);
    // Clean up temp home markdown file. (Nothing needs to wait for this.)
    fs.unlink(tempHomePath);
    // Clean up temp node index.d.ts file if it exists.
    if (await fs.exists(tempNodeSourcePath)) {
      fs.unlink(tempNodeSourcePath);
    }
  })
  // Write out TOC file.  Do this after Typedoc step to prevent Typedoc
  // erroring when it finds an unexpected file in the target dir.
  .then(() => fs.writeFile(`${docPath}/_toc.yaml`, tocText))
  // Flatten file structure. These categories don't matter to us and it makes
  // it easier to manage the docs directory.
  .then(() => {
    return Promise.all([
      moveFilesToRoot('classes'),
      moveFilesToRoot('modules'),
      moveFilesToRoot('interfaces'),
      moveFilesToRoot('enums')
    ]);
  })
  // Check for files listed in TOC that are missing and warn if so.
  // Not blocking.
  .then(checkForMissingFilesAndFixFilenameCase)
  // Check for files that exist but aren't listed in the TOC and warn.
  // (If API is node, actually remove the file.)
  // Removal is blocking, warnings aren't.
  .then(filenamesFromToc =>
    checkForUnlistedFiles(filenamesFromToc, apiType === 'node')
  )
  // Write a _toc_autogenerated.yaml to record what files were created.
  .then(htmlFiles => writeGeneratedFileList(htmlFiles))
  // Correct the links in all the generated html files now that files have
  // all been moved to top level.
  .then(fixAllLinks)
  // Add local variable include line to index.html (to access current SDK
  // version number).
  .then(() => {
    fs.readFile(`${docPath}/index.html`, 'utf8').then(data => {
      // String to include devsite local variables.
      const localVariablesIncludeString = `{% include "docs/web/_local_variables.html" %}\n`;
      return fs.writeFile(
        `${docPath}/index.html`,
        localVariablesIncludeString + data
      );
    });
  })
  .catch(e => {
    if (e.stdout) {
      console.error(e.stdout);
    } else {
      console.error(e);
    }
  });
