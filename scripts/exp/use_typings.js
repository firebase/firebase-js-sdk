/* eslint-disable @typescript-eslint/no-require-imports */
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

const { writeFileSync } = require('fs');
const { argv } = require('yargs');

const path = require('path');
const cwd = path.resolve('./');
const packageJsonPath = path.resolve(cwd, 'package.json');

const packageJson = require(packageJsonPath);

const originalTypings = packageJson.typings;
if (!argv.public && packageJson.typings.includes('-public')) {
  packageJson.typings = packageJson.typings.replace('-public', '');
} else if (argv.public && !packageJson.typings.includes('-public')) {
  packageJson.typings = packageJson.typings.replace('.d.ts', '-public.d.ts');
} else {
  console.log(
    `${packageJson.name} typings field already points to correct file: ${originalTypings}`
  );
  return;
}

console.log(
  `Updating the ${packageJson.name} typings field from ${originalTypings} to ${packageJson.typings}`
);

writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, {
  encoding: 'utf-8'
});
