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

import * as yargs from 'yargs';
import { run as runBundleAnalysis } from './bundle-analysis';
import { analyzePackageSize } from './package-analysis';

yargs
  .command(
    '$0',
    'Analyze the size of individual exports from packages',
    {
      inputModule: {
        type: 'array',
        alias: 'im',
        desc:
          'The name of the module(s) to be analyzed. example: --inputModule "@firebase/functions-exp" "firebase/auth-exp"'
      },
      inputDtsFile: {
        type: 'string',
        alias: 'if',
        desc: 'support for adhoc analysis. requires a path to dts file'
      },
      inputBundleFile: {
        type: 'string',
        alias: 'ib',
        desc: 'support for adhoc analysis. requires a path to a bundle file'
      },
      output: {
        type: 'string',
        alias: 'o',
        required: true,
        desc:
          'The location where report(s) will be generated, a directory path if module(s) are analyzed; a file path if ad hoc analysis is to be performed'
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args => analyzePackageSize(args as any).catch(e => console.log(e))
  )
  .command(
    'bundle',
    'Analyze bundle size',
    {
      input: {
        type: 'string',
        alias: 'i',
        required: true,
        desc: 'Path to the JSON file that describes the bundles to be analyzed'
      },
      mode: {
        choices: ['npm', 'local'],
        alias: 'm',
        default: 'npm',
        desc: 'Use Firebase packages from npm or the local repo'
      },
      bundler: {
        choices: ['rollup', 'webpack', 'both'],
        alias: 'b',
        default: 'rollup',
        desc: 'The bundler(s) to be used'
      },
      output: {
        type: 'string',
        alias: 'o',
        default: './size-analysis-bundles.json',
        desc: 'The output location'
      }
    },
    argv => runBundleAnalysis(argv as any)
  )
  .help().argv;
