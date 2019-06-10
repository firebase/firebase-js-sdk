/**
 * @license
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

import * as firestore from '@firebase/firestore-types';

import { makeConstructorPrivate } from '../util/api';
import {
  validateArgType,
  validateAtLeastNumberOfArgs,
  validateExactNumberOfArgs,
  validateNoArgs
} from '../util/input_validation';

/**
 * An opaque base class for FieldValue sentinel objects in our public API,
 * with public static methods for creating said sentinel objects.
 */
// We use this as a base class.
export abstract class FieldValueImpl implements firestore.FieldValue {
  protected constructor(readonly _methodName: string) {}

  static delete(): FieldValueImpl {
    validateNoArgs('FieldValue.delete', arguments);
    return DeleteFieldValueImpl.instance;
  }

  static serverTimestamp(): FieldValueImpl {
    validateNoArgs('FieldValue.serverTimestamp', arguments);
    return ServerTimestampFieldValueImpl.instance;
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

  isEqual(other: FieldValueImpl): boolean {
    return this === other;
  }
}

export class DeleteFieldValueImpl extends FieldValueImpl {
  private constructor() {
    super('FieldValue.delete');
  }
  /** Singleton instance. */
  static instance = new DeleteFieldValueImpl();
}

export class ServerTimestampFieldValueImpl extends FieldValueImpl {
  private constructor() {
    super('FieldValue.serverTimestamp');
  }
  /** Singleton instance. */
  static instance = new ServerTimestampFieldValueImpl();
}

export class ArrayUnionFieldValueImpl extends FieldValueImpl {
  constructor(readonly _elements: unknown[]) {
    super('FieldValue.arrayUnion');
  }
}

export class ArrayRemoveFieldValueImpl extends FieldValueImpl {
  constructor(readonly _elements: unknown[]) {
    super('FieldValue.arrayRemove');
  }
}

export class NumericIncrementFieldValueImpl extends FieldValueImpl {
  constructor(readonly _operand: number) {
    super('FieldValue.increment');
  }
}

// Public instance that disallows construction at runtime. This constructor is
// used when exporting FieldValueImpl on firebase.firestore.FieldValue and will
// be called FieldValue publicly. Internally we still use FieldValueImpl which
// has a type-checked private constructor. Note that FieldValueImpl and
// PublicFieldValue can be used interchangeably in instanceof checks.
// For our internal TypeScript code PublicFieldValue doesn't exist as a type,
// and so we need to use FieldValueImpl as type and export it too.
export const PublicFieldValue = makeConstructorPrivate(
  FieldValueImpl,
  'Use FieldValue.<field>() instead.'
);
