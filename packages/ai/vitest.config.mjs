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

const hasIntegrationArg = process.argv.some(arg => arg.includes('integration'));

const config = createBaseConfig(import.meta.url);

for (const project of config.test.projects) {
  project.test = project.test || {};
  if (hasIntegrationArg) {
    project.test.include = ['integration/**/*.test.ts'];
  } else {
    project.test.exclude = project.test.exclude || [];
    project.test.exclude.push('integration/**');
  }
  if (project.test.name === 'browser' && project.test.browser) {
    project.test.browser.screenshotFailures = false;
  }
}

config.test.projects
  .find(project => project.test?.name === 'node')
  ?.test?.exclude?.push('**/*-browser.test.ts');

export default config;
