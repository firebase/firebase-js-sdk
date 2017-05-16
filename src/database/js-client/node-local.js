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
// Define a global firebase since our test files load as independent modules.
global.firebase = require('firebase/app');

require('../closure-library/closure/goog/bootstrap/nodejs.js');
require('../generated-node-deps.js');

goog.require('fb.core.registerService');

// Magic stuff: I think our tests use the export of this
// module to be the Firebase variable.
module.exports = Firebase;
