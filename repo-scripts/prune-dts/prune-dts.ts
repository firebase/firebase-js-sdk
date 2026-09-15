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
import { pruneDts, removeUnusedImports } from './src/index';

export { pruneDts };

const argv = yargs
  .options({
    input: {
      type: 'string',
      desc: 'The location of the index.ts file'
    },
    output: {
      type: 'string',
      desc: 'The location for the index.d.ts file'
    }
  })
  .parseSync();

if (argv.input && argv.output) {
  console.log('Removing private exports...');
  pruneDts(argv.input, argv.output);
  console.log('Removing unused imports...');
  removeUnusedImports(argv.output)
    .then(() => console.log('Done.'))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
