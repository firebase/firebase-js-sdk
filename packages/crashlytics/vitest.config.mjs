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

const baseConfig = createBaseConfig(import.meta.url);

for (const project of baseConfig.test.projects) {
  if (project.test.name === 'node') {
    project.test.exclude.push('src/angular/**');
  }
  if (project.test.name === 'browser') {
    project.test.include.push('src/**/*.test.tsx');
    project.optimizeDeps = {
      ...project.optimizeDeps,
      include: [
        ...(project.optimizeDeps?.include || []),
        'next/navigation',
        'next/dist/shared/lib/hooks-client-context.shared-runtime'
      ]
    };
  }
}

export default baseConfig;
