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
import * as exp from '../../exp/index';
import * as legacy from '@firebase/firestore-types';
import { Compat } from './compat';
export declare class FieldValue extends Compat<exp.FieldValue> implements legacy.FieldValue {
    static serverTimestamp(): FieldValue;
    static delete(): FieldValue;
    static arrayUnion(...elements: unknown[]): FieldValue;
    static arrayRemove(...elements: unknown[]): FieldValue;
    static increment(n: number): FieldValue;
    isEqual(other: FieldValue): boolean;
}
