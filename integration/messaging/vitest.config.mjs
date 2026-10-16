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

import { BaseSequencer } from 'vitest/node';
import { createBaseConfig } from '../../config/vitest.base.mjs';

const TEST_FILE_ORDER = [
  'test-token-delete.js',
  'test-token-update.js',
  'test-useValidManifest.js',
  'test-useDefaultServiceWorker.js',
  'test-receive-foreground.js',
  'test-receive-background.js'
];

class MessagingSequencer extends BaseSequencer {
  async sort(files) {
    return [...files].sort((a, b) => {
      const aIndex = TEST_FILE_ORDER.findIndex(name =>
        a.moduleId.endsWith(name)
      );
      const bIndex = TEST_FILE_ORDER.findIndex(name =>
        b.moduleId.endsWith(name)
      );
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }
}

const config = createBaseConfig(import.meta.url, {
  test: {
    sequence: {
      sequencer: MessagingSequencer
    }
  }
});

config.test.projects = config.test.projects
  .filter(project => project.test?.name === 'node')
  .map(project => ({
    ...project,
    test: {
      ...project.test,
      fileParallelism: false,
      include: ['test/test-*.js']
    }
  }));

export default config;
