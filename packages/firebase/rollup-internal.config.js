/**
 * @license
 * Copyright 2019 Google LLC
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

/**
 * Specialized config only for internal deployment to google3 repo, adds required license header to
 * generated code.
 */

// When run in google3, original rollup.config.js will have been renamed to rollup-main.config.js.
import baseBuilds from './rollup-main.config.js';
import license from 'rollup-plugin-license';

const firebaseLicense = license({
  banner: `@license
  Copyright ${new Date().getFullYear()} Google Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.`
});

const buildsWithLicense = baseBuilds.map(build => {
  return Object.assign({}, build, {
    plugins: build.plugins.concat(firebaseLicense)
  });
});

export default buildsWithLicense;
