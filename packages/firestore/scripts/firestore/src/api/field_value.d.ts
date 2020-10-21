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
import { FieldTransform } from '../model/mutation';
import { ParseContext } from './user_data_reader';
import { FieldValue } from '../../lite/src/api/field_value';
export declare class DeleteFieldValueImpl extends FieldValue {
    _toFieldTransform(context: ParseContext): null;
    isEqual(other: FieldValue): boolean;
}
export declare class ServerTimestampFieldValueImpl extends FieldValue {
    _toFieldTransform(context: ParseContext): FieldTransform;
    isEqual(other: FieldValue): boolean;
}
export declare class ArrayUnionFieldValueImpl extends FieldValue {
    private readonly _elements;
    constructor(methodName: string, _elements: unknown[]);
    _toFieldTransform(context: ParseContext): FieldTransform;
    isEqual(other: FieldValue): boolean;
}
export declare class ArrayRemoveFieldValueImpl extends FieldValue {
    readonly _elements: unknown[];
    constructor(methodName: string, _elements: unknown[]);
    _toFieldTransform(context: ParseContext): FieldTransform;
    isEqual(other: FieldValue): boolean;
}
export declare class NumericIncrementFieldValueImpl extends FieldValue {
    private readonly _operand;
    constructor(methodName: string, _operand: number);
    _toFieldTransform(context: ParseContext): FieldTransform;
    isEqual(other: FieldValue): boolean;
}
