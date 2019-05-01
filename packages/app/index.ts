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
import { createFirebaseNamespace } from './src/firebaseNamespace';

// Node detection logic from: https://github.com/iliakan/detect-node/
let isNode = false;
try {
  isNode =
    Object.prototype.toString.call(global.process) === '[object process]';
} catch (e) {}

isNode &&
  console.warn(`
Warning: This is a browser-targeted Firebase bundle but it appears it is being
run in a Node environment.  If running in a Node environment, make sure you
are using the bundle specified by the "main" field in package.json.

If you are using Webpack, you can specify "main" as the first item in
"resolve.mainFields":
https://webpack.js.org/configuration/resolve/#resolvemainfields

If using Rollup, use the rollup-plugin-node-resolve plugin and set "module"
to false and "main" to true:
https://github.com/rollup/rollup-plugin-node-resolve
`);

// Firebase Lite detection
if (self && 'firebase' in self) {
  console.warn(`
    Warning: Firebase is already defined in the global scope. Please make sure
    Firebase library is only loaded once.
  `);

  const sdkVersion = ((self as any).firebase as FirebaseNamespace).SDK_VERSION;
  if (sdkVersion && sdkVersion.indexOf('LITE') >= 0) {
    console.warn(`
    Warning: You are trying to load Firebase while using Firebase Performance standalone script.
    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.
    `);
  }
}

export const firebase = createFirebaseNamespace();

export default firebase;
