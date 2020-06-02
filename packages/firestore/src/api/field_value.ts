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

import * as firestore from '@firebase/firestore-types';
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

/**
 * An opaque base class for FieldValue sentinel objects in our public API,
 * with public static methods for creating said sentinel objects.
 */
export abstract class FieldValueImpl {
  protected constructor(readonly _methodName: string) {}

  abstract toFieldTransform(context: ParseContext): FieldTransform | null;

  abstract isEqual(other: FieldValue): boolean;
}

export class DeleteFieldValueImpl extends FieldValueImpl {
  constructor() {
    super('FieldValue.delete');
  }

  toFieldTransform(context: ParseContext): null {
    if (context.dataSource === UserDataSource.MergeSet) {
      // No transform to add for a delete, but we need to add it to our
      // fieldMask so it gets deleted.
      context.fieldMask.push(context.path!);
    } else if (context.dataSource === UserDataSource.Update) {
      debugAssert(
        context.path!.length > 0,
        'FieldValue.delete() at the top level should have already' +
          ' been handled.'
      );
      throw context.createError(
        'FieldValue.delete() can only appear at the top level ' +
          'of your update data'
      );
    } else {
      // We shouldn't encounter delete sentinels for queries or non-merge set() calls.
      throw context.createError(
        'FieldValue.delete() cannot be used with set() unless you pass ' +
          '{merge:true}'
      );
    }
    return null;
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof DeleteFieldValueImpl;
  }
}

export class ServerTimestampFieldValueImpl extends FieldValueImpl {
  constructor() {
    super('FieldValue.serverTimestamp');
  }

  toFieldTransform(context: ParseContext): FieldTransform {
    return new FieldTransform(context.path!, ServerTimestampTransform.instance);
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof ServerTimestampFieldValueImpl;
  }
}

export class ArrayUnionFieldValueImpl extends FieldValueImpl {
  constructor(private readonly _elements: unknown[]) {
    super('FieldValue.arrayUnion');
  }

  toFieldTransform(context: ParseContext): FieldTransform {
    // Although array transforms are used with writes, the actual elements
    // being uniomed or removed are not considered writes since they cannot
    // contain any FieldValue sentinels, etc.
    const parseContext = new ParseContext(
      {
        dataSource: UserDataSource.Argument,
        methodName: this._methodName,
        arrayElement: true
      },
      context.databaseId,
      context.serializer,
      context.ignoreUndefinedProperties
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

export class ArrayRemoveFieldValueImpl extends FieldValueImpl {
  constructor(readonly _elements: unknown[]) {
    super('FieldValue.arrayRemove');
  }

  toFieldTransform(context: ParseContext): FieldTransform {
    // Although array transforms are used with writes, the actual elements
    // being unioned or removed are not considered writes since they cannot
    // contain any FieldValue sentinels, etc.
    const parseContext = new ParseContext(
      {
        dataSource: UserDataSource.Argument,
        methodName: this._methodName,
        arrayElement: true
      },
      context.databaseId,
      context.serializer,
      context.ignoreUndefinedProperties
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

export class NumericIncrementFieldValueImpl extends FieldValueImpl {
  constructor(private readonly _operand: number) {
    super('FieldValue.increment');
  }

  toFieldTransform(context: ParseContext): FieldTransform {
    const parseContext = new ParseContext(
      {
        dataSource: UserDataSource.Argument,
        methodName: this._methodName
      },
      context.databaseId,
      context.serializer,
      context.ignoreUndefinedProperties
    );
    const operand = parseData(this._operand, parseContext)!;
    const numericIncrement = new NumericIncrementTransformOperation(
      context.serializer,
      operand
    );
    return new FieldTransform(context.path!, numericIncrement);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}

export class FieldValue implements firestore.FieldValue {
  static delete(): FieldValueImpl {
    validateNoArgs('FieldValue.delete', arguments);
    return new DeleteFieldValueImpl();
  }

  static serverTimestamp(): FieldValueImpl {
    validateNoArgs('FieldValue.serverTimestamp', arguments);
    return new ServerTimestampFieldValueImpl();
  }

  static arrayUnion(...elements: unknown[]): FieldValueImpl {
    validateAtLeastNumberOfArgs('FieldValue.arrayUnion', arguments, 1);
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we need access to the Firestore instance.
    return new ArrayUnionFieldValueImpl(elements);
  }

  static arrayRemove(...elements: unknown[]): FieldValueImpl {
    validateAtLeastNumberOfArgs('FieldValue.arrayRemove', arguments, 1);
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we need access to the Firestore instance.
    return new ArrayRemoveFieldValueImpl(elements);
  }

  static increment(n: number): FieldValueImpl {
    validateArgType('FieldValue.increment', 'number', 1, n);
    validateExactNumberOfArgs('FieldValue.increment', arguments, 1);
    return new NumericIncrementFieldValueImpl(n);
  }

  isEqual(other: FieldValue): boolean {
    return this === other;
  }
}
