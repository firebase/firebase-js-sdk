/**
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
/**
 * @fileoverview Bootstrapper for local development.
 *
 * This script can be used during development instead of the compiled firebase.js.
 * It pulls in the raw source files, so no compilation step is required (though if you
 * change any dependencies, e.g. by adding goog.require statements, you'll need to
 * run:
 *
 *   $ build-client deps
 *
 * This script pulls in google closure's base.js and our generated-deps.js file
 * automatically. All other required scripts will be pulled in based on goog.require
 * statements.
 */
document.write('<script type="text/javascript" src="/libraries/closure-library/closure/goog/base.js"></script>');
document.write('<script type="text/javascript" src="/libraries/generated-deps.js"></script>');
document.write('<script type="text/javascript" src="/libraries/js-client/firebase-require.js"></script>');
