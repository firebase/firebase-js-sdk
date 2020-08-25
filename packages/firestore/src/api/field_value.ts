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

import { FieldValue as PublicFieldValue } from '@firebase/firestore-types';
import {
  validateArgType,
  validateAtLeastNumberOfArgs,
  validateExactNumberOfArgs,
  validateNoArgs
} from '../util/input_validation';
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

/**
 * An opaque base class for FieldValue sentinel objects in our public API that
 * is shared between the full, lite and legacy SDK.
 */
export abstract class SerializableFieldValue {
  /** The public API endpoint that returns this class. */
  abstract readonly _methodName: string;

  /** A pointer to the implementing class. */
  readonly _delegate: SerializableFieldValue = this;

  abstract _toFieldTransform(context: ParseContext): FieldTransform | null;

  abstract isEqual(other: SerializableFieldValue): boolean;
}

export class DeleteFieldValueImpl extends SerializableFieldValue {
  constructor(readonly _methodName: string) {
    super();
  }

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
  fieldValue: SerializableFieldValue,
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

export class ServerTimestampFieldValueImpl extends SerializableFieldValue {
  constructor(readonly _methodName: string) {
    super();
  }

  _toFieldTransform(context: ParseContext): FieldTransform {
    return new FieldTransform(context.path!, new ServerTimestampTransform());
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof ServerTimestampFieldValueImpl;
  }
}

export class ArrayUnionFieldValueImpl extends SerializableFieldValue {
  constructor(
    readonly _methodName: string,
    private readonly _elements: unknown[]
  ) {
    super();
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

export class ArrayRemoveFieldValueImpl extends SerializableFieldValue {
  constructor(readonly _methodName: string, readonly _elements: unknown[]) {
    super();
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

export class NumericIncrementFieldValueImpl extends SerializableFieldValue {
  constructor(readonly _methodName: string, private readonly _operand: number) {
    super();
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

/** The public FieldValue class of the lite API. */
export abstract class FieldValue
  extends SerializableFieldValue
  implements PublicFieldValue {
  protected constructor() {
    super();
  }

  static delete(): PublicFieldValue {
    validateNoArgs('FieldValue.delete', arguments);
    return new FieldValueDelegate(
      new DeleteFieldValueImpl('FieldValue.delete')
    );
  }

  static serverTimestamp(): PublicFieldValue {
    validateNoArgs('FieldValue.serverTimestamp', arguments);
    return new FieldValueDelegate(
      new ServerTimestampFieldValueImpl('FieldValue.serverTimestamp')
    );
  }

  static arrayUnion(...elements: unknown[]): PublicFieldValue {
    validateAtLeastNumberOfArgs('FieldValue.arrayUnion', arguments, 1);
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we'd need the Firestore instance to do this.
    return new FieldValueDelegate(
      new ArrayUnionFieldValueImpl('FieldValue.arrayUnion', elements)
    );
  }

  static arrayRemove(...elements: unknown[]): PublicFieldValue {
    validateAtLeastNumberOfArgs('FieldValue.arrayRemove', arguments, 1);
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we'd need the Firestore instance to do this.
    return new FieldValueDelegate(
      new ArrayRemoveFieldValueImpl('FieldValue.arrayRemove', elements)
    );
  }

  static increment(n: number): PublicFieldValue {
    validateArgType('FieldValue.increment', 'number', 1, n);
    validateExactNumberOfArgs('FieldValue.increment', arguments, 1);
    return new FieldValueDelegate(
      new NumericIncrementFieldValueImpl('FieldValue.increment', n)
    );
  }
}

/**
 * A delegate class that allows the FieldValue implementations returned by
 * deleteField(), serverTimestamp(), arrayUnion(), arrayRemove() and
 * increment() to be an instance of the legacy FieldValue class declared above.
 *
 * We don't directly subclass `FieldValue` in the various field value
 * implementations as the base FieldValue class differs between the lite, full
 * and legacy SDK.
 */
class FieldValueDelegate extends FieldValue implements PublicFieldValue {
  readonly _methodName: string;

  constructor(readonly _delegate: SerializableFieldValue) {
    super();
    this._methodName = _delegate._methodName;
  }

  _toFieldTransform(context: ParseContext): FieldTransform | null {
    return this._delegate._toFieldTransform(context);
  }

  isEqual(other: PublicFieldValue): boolean {
    if (!(other instanceof FieldValueDelegate)) {
      return false;
    }
    return this._delegate.isEqual(other._delegate);
  }
}
