/**
 * @license
 * Copyright 2026 Google LLC
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

import createBaseConfig from '../../config/vitest.base.mjs';

function generateAliasConfig(platform) {
  return [
    {
      find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
      replacement: `$1/platform/${platform}/$2.ts`
    }
  ];
}

const config = createBaseConfig(import.meta.url);

for (const project of config.test.projects) {
  project.test.exclude = [...(project.test.exclude || []), 'test/integration/**'];
  project.resolve = {
    alias: generateAliasConfig(project.test.name)
  };
}

export default config;
