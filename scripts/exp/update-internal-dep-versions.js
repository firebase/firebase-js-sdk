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

/**
 * Update `@firebase` dependency versions in a package.json to reflect the latest versions.
 * These can get out of sync when working on a new unreleased component in a branch while the
 * already-released component versions in its deps keep being updated with each release.
 *
 * Usage: node scripts/exp/update-internal-dep-versions.js --file [package.json file path]
 *
 * Example: node scripts/exp/update-internal-dep-versions.js --file packages-exp/functions-exp/package.json
 */

const { projectRoot } = require('../utils');
const { mapPkgNameToPkgJson } = require('../release/utils/workspace');
const { argv } = require('yargs');
const fs = require('mz/fs');
async function updateField(pkg, fieldName) {
  const field = pkg[fieldName];
  for (const depName in field) {
    if (!depName.includes('@firebase')) continue;
    const depJson = await mapPkgNameToPkgJson(depName);
    if (!depJson.version) continue;
    field[depName] = depJson.version;
  }
  return { ...pkg, [fieldName]: field };
}

async function updateInternalDepVersions() {
  const fileName = argv.file;
  if (!fileName) return;
  const pkg = require(`${projectRoot}/${fileName}`);
  let newPkg = await updateField(pkg, 'devDependencies');
  newPkg = await updateField(newPkg, 'dependencies');
  await fs.writeFile(
    `${projectRoot}/${fileName}`,
    JSON.stringify(newPkg, null, 2),
    { encoding: 'utf-8' }
  );
}

updateInternalDepVersions();
