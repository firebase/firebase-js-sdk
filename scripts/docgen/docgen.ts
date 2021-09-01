/**
 * @license
 * Copyright 2020 Google LLC
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

import { spawn } from 'child-process-promise';
import { mapWorkspaceToPackages } from '../release/utils/workspace';
import { projectRoot } from '../utils';
import fs from 'fs';
import glob from 'glob';
import * as yargs from 'yargs';

const tmpDir = `${projectRoot}/temp`;

yargs
  .command('$0', 'generate standard reference docs', {}, _argv =>
    generateDocs(/* forDevsite */ false)
  )
  .command('devsite', 'generate reference docs for devsite', {}, _argv =>
    generateDocs(/* forDevsite */ true)
  )
  .demandCommand()
  .help().argv;

// create *.api.json files
async function generateDocs(forDevsite: boolean = false) {
  const outputFolder = forDevsite ? 'docs-devsite' : 'docs';
  const command = forDevsite ? 'api-documenter-devsite' : 'api-documenter';

  // Use a special d.ts file for auth for doc gen only.
  const authApiConfigOriginal = fs.readFileSync(
    `${projectRoot}/packages/auth/api-extractor.json`,
    'utf8'
  );
  const authApiConfigModified = authApiConfigOriginal.replace(
    `"mainEntryPointFilePath": "<projectFolder>/dist/esm5/index.d.ts"`,
    `"mainEntryPointFilePath": "<projectFolder>/dist/esm5/index.doc.d.ts"`
  );
  fs.writeFileSync(
    `${projectRoot}/packages/auth/api-extractor.json`,
    authApiConfigModified
  );

  await spawn('yarn', ['build'], {
    stdio: 'inherit'
  });

  await spawn('yarn', ['api-report'], {
    stdio: 'inherit'
  });

  // Restore original auth api-extractor.json contents.
  fs.writeFileSync(
    `${projectRoot}/packages/auth/api-extractor.json`,
    authApiConfigOriginal
  );

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  // TODO: Throw error if path doesn't exist once all packages add markdown support.
  const apiJsonDirectories = (
    await mapWorkspaceToPackages([`${projectRoot}/packages/*`])
  )
    .map(path => `${path}/temp`)
    .filter(path => fs.existsSync(path));

  for (const dir of apiJsonDirectories) {
    const paths = await new Promise<string[]>(resolve =>
      glob(`${dir}/*.api.json`, (err, paths) => {
        if (err) throw err;
        resolve(paths);
      })
    );

    if (paths.length === 0) {
      throw Error(`*.api.json file is missing in ${dir}`);
    }

    // there will be only 1 api.json file
    const fileName = paths[0].split('/').pop();
    fs.copyFileSync(paths[0], `${tmpDir}/${fileName}`);
  }

  await spawn(
    'yarn',
    [command, 'markdown', '--input', 'temp', '--output', outputFolder],
    { stdio: 'inherit' }
  );

  moveRulesUnitTestingDocs(outputFolder, command);
}

async function moveRulesUnitTestingDocs(
  mainDocsFolder: string,
  command: string
) {
  const rulesOutputFolder = `${projectRoot}/docs-rut`;

  // Generate from rules-unit-testing.api.json only, to get an index.md.
  // Hide output warnings about being unable to link to external packages.
  await spawn(
    'yarn',
    [
      command,
      'markdown',
      '--input',
      'packages/rules-unit-testing/temp',
      '--output',
      rulesOutputFolder
    ],
    { stdio: ['inherit', 'ignore', 'inherit'] }
  );

  const rulesDocPaths = await new Promise<string[]>(resolve =>
    glob(`${mainDocsFolder}/rules-unit-testing.*`, (err, paths) => {
      if (err) throw err;
      resolve(paths);
    })
  );

  // Overwrite non-index files with files generated from global docgen script,
  // which have links to external packages.
  // These paths also need to be adjusted to point to a sibling directory.
  for (const sourcePath of rulesDocPaths) {
    const destinationPath = sourcePath.replace(
      mainDocsFolder,
      rulesOutputFolder
    );
    const originalText = fs.readFileSync(sourcePath, 'utf-8');
    let alteredPathText = originalText.replace(
      /\.\/database/g,
      '../js/database'
    );
    alteredPathText = alteredPathText.replace(/\.\/storage/g, '../js/storage');
    alteredPathText = alteredPathText.replace(
      /\.\/firestore/g,
      '../js/firestore'
    );
    fs.writeFileSync(destinationPath, alteredPathText);
    fs.unlinkSync(sourcePath);
  }
}
