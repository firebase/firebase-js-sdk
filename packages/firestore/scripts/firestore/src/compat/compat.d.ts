/**
 * @license
 * Copyright 2020 Google LLC
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
 * A class implemented by all API types of the legacy Firestore API which
 * contains a reference to the API type in the firestore-exp API. All internal
 * code unwraps these references, which allows us to only use firestore-exp
 * types in the SDK.
 */
export declare abstract class Compat<T> {
    readonly _delegate: T;
    constructor(_delegate: T);
}
