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
goog.provide('fb.constants');

/**
 * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
 */


/**
 * @define {boolean} Whether this is the client Node.js SDK.
 */
var NODE_CLIENT = false;


/**
 * @define {boolean} Whether this is the Admin Node.js SDK.
 */
var NODE_ADMIN = false;


/**
 * Public export for NODE_CLIENT and NODE_ADMIN. The linter really hates the way we consume globals
 * from other pacakges.
 */
fb.constants.NODE_ADMIN = NODE_ADMIN;
fb.constants.NODE_CLIENT = NODE_CLIENT;
