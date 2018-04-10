/**
 * Copyright 2018 Google Inc.
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

const { resolve, extname } = require('path');
const { spawn, exec } = require('child-process-promise');
const { stripIndent } = require('common-tags');
const root = resolve(__dirname, '../');
const Listr = require('listr');
const fs = require('mz/fs');
const { existsSync } = require('fs');

/**
 * Checks if the files in question have associated diffs
 */
async function hasDiff(files) {
  let { stdout } = await exec(`git diff ${files.join(' ')}`, { cwd: root });
  stdout = stdout.trim();
  return !!stdout.length;
}

const tasks = new Listr([
  {
    title: 'License Headers',
    /**
     * This task will append the Google License Header to any file that is
     * missing it.
     */
    task: async ({ files }) => {
      /**
       * Only apply the license header to .js/.ts files
       */
      files = files.filter(file => extname(file) !== '.json');
      const licenseHeader = stripIndent`
        /**
         * Copyright 2018 Google Inc.
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
      `;
      const fileContents = await Promise.all(
        files.map(path => fs.readFile(path))
      );
      const filesMissingPaths = fileContents
        .map((buffer, idx) => ({ buffer, path: files[idx] }))
        .filter(
          ({ buffer }) =>
            String(buffer).match(/Copyright \d{4} Google Inc\./) == null
        );

      await Promise.all(
        filesMissingPaths.map(({ buffer, path }) => {
          const contents = Buffer.concat([new Buffer(licenseHeader), buffer]);
          return fs.writeFile(path, contents, 'utf8');
        })
      );

      if (await hasDiff(files)) {
        await exec(`git add ${files.join(' ')}`, { cwd: root });
        await exec('git commit -m "[AUTOMATED]: License Headers"', {
          cwd: root
        });
      }
    }
  },
  {
    title: 'Prettier Formatting',
    /**
     * This function will run prettier on the files that have changed and
     * format them appropriately
     */
    task: async ({ files }) => {
      await spawn(
        'prettier',
        [...files, '--write', '--config', `${resolve(root, '.prettierrc')}`],
        {
          stdio: ['ignore', 'ignore', process.stderr],
          cwd: root,
          env: {
            PATH: `${resolve(root, 'node_modules/.bin')}:${process.env.PATH}`
          }
        }
      );

      if (await hasDiff(files)) {
        await exec(`git add ${files.join(' ')}`, { cwd: root });
        await exec('git commit -m "[AUTOMATED]: Prettier Code Styling"', {
          cwd: root
        });
      }
    }
  }
]);

(async () => {
  try {
    /**
     * Get the list of changed files from git
     */
    const result = await exec(
      'git diff-tree --no-commit-id --name-only -r HEAD',
      { cwd: root }
    );

    /**
     * Filter this list to only the changed/added .js/.ts/.json files
     */
    const files = result.stdout
      .split('\n')
      .filter(Boolean)
      .filter(
        file =>
          extname(file) === '.js' ||
          extname(file) === '.ts' ||
          extname(file) === '.json'
      )
      .map(file => resolve(root, file))
      .filter(file => existsSync(file));

    await tasks.run({ files });
  } catch (err) {
    console.error(err);
  }
})();
