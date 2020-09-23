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
import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation,
  NumericIncrementTransformOperation,
  ServerTimestampTransform
} from '../model/transform_operation';
import { ParseContext, parseData, UserDataSource } from './user_data_reader';
import { debugAssert } from '../util/assert';
import { toNumber } from '../remote/serializer';
import { FieldValue } from '../../lite/src/api/field_value';

export class DeleteFieldValueImpl extends FieldValue {
  _toFieldTransform(context: ParseContext): null {
    if (context.dataSource === UserDataSource.MergeSet) {
      // No transform to add for a delete, but we need to add it to our
      // fieldMask so it gets deleted.
      context.fieldMask.push(context.path!);
    } else if (context.dataSource === UserDataSource.Update) {
      debugAssert(
        context.path!.length > 0,
        `${this._methodName}() at the top level should have already ` +
          'been handled.'
      );
      throw context.createError(
        `${this._methodName}() can only appear at the top level ` +
          'of your update data'
      );
    } else {
      // We shouldn't encounter delete sentinels for queries or non-merge set() calls.
      throw context.createError(
        `${this._methodName}() cannot be used with set() unless you pass ` +
          '{merge:true}'
      );
    }
    return null;
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof DeleteFieldValueImpl;
  }
}

/**
 * Creates a child context for parsing SerializableFieldValues.
 *
 * This is different than calling `ParseContext.contextWith` because it keeps
 * the fieldTransforms and fieldMask separate.
 *
 * The created context has its `dataSource` set to `UserDataSource.Argument`.
 * Although these values are used with writes, any elements in these FieldValues
 * are not considered writes since they cannot contain any FieldValue sentinels,
 * etc.
 *
 * @param fieldValue The sentinel FieldValue for which to create a child
 *     context.
 * @param context The parent context.
 * @param arrayElement Whether or not the FieldValue has an array.
 */
function createSentinelChildContext(
  fieldValue: FieldValue,
  context: ParseContext,
  arrayElement: boolean
): ParseContext {
  return new ParseContext(
    {
      dataSource: UserDataSource.Argument,
      targetDoc: context.settings.targetDoc,
      methodName: fieldValue._methodName,
      arrayElement
    },
    context.databaseId,
    context.serializer,
    context.ignoreUndefinedProperties
  );
}

export class ServerTimestampFieldValueImpl extends FieldValue {
  _toFieldTransform(context: ParseContext): FieldTransform {
    return new FieldTransform(context.path!, new ServerTimestampTransform());
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof ServerTimestampFieldValueImpl;
  }
}

export class ArrayUnionFieldValueImpl extends FieldValue {
  constructor(methodName: string, private readonly _elements: unknown[]) {
    super(methodName);
  }

  _toFieldTransform(context: ParseContext): FieldTransform {
    const parseContext = createSentinelChildContext(
      this,
      context,
      /*array=*/ true
    );
    const parsedElements = this._elements.map(
      element => parseData(element, parseContext)!
    );
    const arrayUnion = new ArrayUnionTransformOperation(parsedElements);
    return new FieldTransform(context.path!, arrayUnion);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}

export class ArrayRemoveFieldValueImpl extends FieldValue {
  constructor(methodName: string, readonly _elements: unknown[]) {
    super(methodName);
  }

  _toFieldTransform(context: ParseContext): FieldTransform {
    const parseContext = createSentinelChildContext(
      this,
      context,
      /*array=*/ true
    );
    const parsedElements = this._elements.map(
      element => parseData(element, parseContext)!
    );
    const arrayUnion = new ArrayRemoveTransformOperation(parsedElements);
    return new FieldTransform(context.path!, arrayUnion);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}

export class NumericIncrementFieldValueImpl extends FieldValue {
  constructor(methodName: string, private readonly _operand: number) {
    super(methodName);
  }

  _toFieldTransform(context: ParseContext): FieldTransform {
    const numericIncrement = new NumericIncrementTransformOperation(
      context.serializer,
      toNumber(context.serializer, this._operand)
    );
    return new FieldTransform(context.path!, numericIncrement);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}
