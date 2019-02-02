/**
 * @license
 * Copyright 2019 Google Inc.
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
 * Config for internal deployment, adds required license header to generated code.
 */

import baseBuilds from './rollup.config.js';
import license from 'rollup-plugin-license';
import gitRev from 'git-rev-sync';

const license = license({
  banner: `@license Firebase v${pkg.version}
    Build: rev-${gitRev.short()}
    Terms: https://firebase.google.com/terms/`
});

const buildsWithLicense = baseBuilds.map(build => {
  return Object.assign({}, build, { plugins: build.plugins.concat(license) });
});

export default buildsWithLicense;
