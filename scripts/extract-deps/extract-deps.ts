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

import * as fs from 'fs';
import * as path from 'path';
import * as yargs from 'yargs';
import {
  ExportData,
  extractDependenciesAndSize,
  extractDeclarations,
  MemberList
} from './extract-deps.helpers';

// Small command line app that builds a JSON file with a list of the
// dependencies for each individual exported type. This can then be used to
// verify dependencies in tree-shakeable SDKs.

const argv = yargs.options({
  types: {
    type: 'string',
    demandOption: true,
    desc: 'The location of the index.d.ts file that describes the Public API'
  },
  bundle: {
    type: 'string',
    demandOption: true,
    desc:
      'The location of transpiled JavaScript bundle that contains all code for the SDK'
  },
  output: {
    type: 'string',
    demandOption: true,
    desc: 'The location to write the JSON output to'
  }
}).argv;

async function buildJson(
  publicApi: MemberList,
  jsFile: string
): Promise<string> {
  const result: { [key: string]: ExportData } = {};
  for (const exp of publicApi.classes) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile);
  }
  for (const exp of publicApi.functions) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile);
  }
  for (const exp of publicApi.variables) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile);
  }
  return JSON.stringify(result, null, 4);
}

const publicApi = extractDeclarations(path.resolve(argv.types));
buildJson(publicApi, path.resolve(argv.bundle)).then(json => {
  fs.writeFileSync(path.resolve(argv.output), json);
});
