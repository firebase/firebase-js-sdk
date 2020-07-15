/**
 * @license
 * Copyright 2017 Google LLC
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

import { ChangelogFunctions } from '@changesets/types';
import { getInfo } from '@changesets/get-github-info';

const changelogFunctions: ChangelogFunctions = {
  getDependencyReleaseLine: async (
    changesets,
    dependenciesUpdated,
    options
  ) => {
    if (!options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]'
      );
    }
    if (dependenciesUpdated.length === 0) return '';

    const changesetLink = `- Updated dependencies [${(
      await Promise.all(
        changesets.map(async cs => {
          if (cs.commit) {
            let { links } = await getInfo({
              repo: options.repo,
              commit: cs.commit
            });
            return links.commit;
          }
        })
      )
    )
      .filter(_ => _)
      .join(', ')}]:`;

    const updatedDepenenciesList = dependenciesUpdated.map(
      dependency => `  - ${dependency.name}@${dependency.newVersion}`
    );

    return [changesetLink, ...updatedDepenenciesList].join('\n');
  },
  getReleaseLine: async (changeset, type, options) => {
    if (!options || !options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]'
      );
    }
    const [firstLine, ...futureLines] = changeset.summary
      .split('\n')
      .map(l => l.trimRight());

    if (changeset.commit) {
      let { links } = await getInfo({
        repo: options.repo,
        commit: changeset.commit
      });
      return `\n\n- ${links.commit}${
        links.pull === null ? '' : ` ${links.pull}`
      }${
        links.user === null ? '' : ` Thanks ${links.user}!`
      } - ${firstLine}\n${futureLines.map(l => `  ${l}`).join('\n')}`;
    } else {
      return `\n\n- ${firstLine}\n${futureLines.map(l => `  ${l}`).join('\n')}`;
    }
  }
};

export default changelogFunctions;
