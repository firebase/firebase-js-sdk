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

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'firebase/app': resolve(
        import.meta.dirname,
        '../../../app/dist/esm/index.esm.js'
      ),
      'firebase/sql': resolve(import.meta.dirname, '../../dist/index.esm.js'),
      '@firebase/app': resolve(
        import.meta.dirname,
        '../../../app/dist/esm/index.esm.js'
      ),
      '@firebase/component': resolve(
        import.meta.dirname,
        '../../../component/dist/esm/index.esm.js'
      ),
      '@firebase/logger': resolve(
        import.meta.dirname,
        '../../../logger/dist/esm/index.esm.js'
      ),
      '@firebase/util': resolve(
        import.meta.dirname,
        '../../../util/dist/index.esm.js'
      )
    }
  },
  server: {
    port: 5179
  }
});
