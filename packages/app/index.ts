/**
 * @license
 * Copyright 2017 Google Inc.
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

import { FirebaseNamespace } from '@firebase/app-types';
import { createFirebaseNamespace } from './src/firebaseApp';

// Node detection logic from: https://github.com/iliakan/detect-node/
let isNode = false;
try {
  isNode =
    Object.prototype.toString.call(global.process) === '[object process]';
} catch (e) {}

isNode &&
  console.warn(`
Warning: This is a browser-targeted Firebase bundle but it appears it is being run in a Node
environment.  This may be because you are using ES module resolution and the Node bundle is
only provided as a CommonJS module.

In order to get the CommonJS Node bundle try setting your bundler to use CommonJS module
resolution if the option is available, or specify that it should look at "main" for modules.
`);

export const firebase = createFirebaseNamespace();

export default firebase;
