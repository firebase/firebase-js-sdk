/**
 * @license
 * Copyright 2017 Google LLC
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
import { Bytes } from '../../lite/src/api/bytes';
/**
 * Immutable class holding a blob (binary data).
 *
 * This class is directly exposed in the public API. It extends the Bytes class
 * of the firestore-exp API to support `instanceof Bytes` checks during user
 * data conversion.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */
export declare class Blob extends Bytes {
    static fromBase64String(base64: string): Blob;
    static fromUint8Array(array: Uint8Array): Blob;
    toBase64(): string;
    toUint8Array(): Uint8Array;
    toString(): string;
}
