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
// 'firebase/app' has the whole of firebase namespace in its type. We recommend
// just using require statement for the side effect of loading other services.
import * as firebase from '../../dist/package/firebase-browser';
import { assert } from 'chai';
describe("Typescript (app + database) tests", function () {
    it("firebase namespace", function () {
        assert.isDefined(firebase);
    });
    it("firebase.database()", function () {
        assert.isFunction(firebase.database);
    });
    it("SDK_VERSION", function () {
        assert.isDefined(firebase.SDK_VERSION);
    });
    it("TIMESTAMP", function () {
        assert.isDefined(firebase.database.ServerValue.TIMESTAMP);
    });
});
