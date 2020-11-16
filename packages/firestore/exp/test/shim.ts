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

import * as legacy from '@firebase/firestore-types';
import * as exp from '../index';

import { FieldPath as FieldPathExp, Bytes as BytesExp } from '../../exp/index';
import {
  isPlainObject,
  validateSetOptions
} from '../../src/util/input_validation';
import { Compat } from '../../src/compat/compat';
import {
  Firestore,
  DocumentReference,
  DocumentSnapshot
} from '../../src/api/database';

export { GeoPoint, Timestamp } from '../index';

/* eslint-disable @typescript-eslint/no-explicit-any */

// This module defines a shim layer that implements the legacy API on top
// of the experimental SDK. This shim is used to run integration tests against
// both SDK versions.

export class Transaction
  extends Compat<exp.Transaction>
  implements legacy.Transaction {
  constructor(
    private readonly _firestore: Firestore,
    delegate: exp.Transaction
  ) {
    super(delegate);
  }

  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    return this._delegate
      .get(documentRef._delegate)
      .then(result => new DocumentSnapshot(this._firestore, result));
  }

  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: legacy.SetOptions
  ): Transaction {
    if (options) {
      validateSetOptions('Transaction.set', options);
      this._delegate.set(documentRef._delegate, unwrap(data), options);
    } else {
      this._delegate.set(documentRef._delegate, unwrap(data));
    }
    return this;
  }

  update(
    documentRef: DocumentReference<any>,
    data: legacy.UpdateData
  ): Transaction;
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;
  update(
    documentRef: DocumentReference<any>,
    dataOrField: any,
    value?: any,
    ...moreFieldsAndValues: any[]
  ): Transaction {
    if (arguments.length === 2) {
      this._delegate.update(documentRef._delegate, unwrap(dataOrField));
    } else {
      this._delegate.update(
        documentRef._delegate,
        unwrap(dataOrField),
        unwrap(value),
        ...unwrap(moreFieldsAndValues)
      );
    }

    return this;
  }

  delete(documentRef: DocumentReference<any>): Transaction {
    this._delegate.delete(documentRef._delegate);
    return this;
  }
}

export class FieldPath
  extends Compat<FieldPathExp>
  implements legacy.FieldPath {
  constructor(...fieldNames: string[]) {
    super(new FieldPathExp(...fieldNames));
  }

  static documentId(): FieldPath {
    return new FieldPath('__name__');
  }

  isEqual(other: FieldPath): boolean {
    throw new Error('isEqual() is not supported in shim');
  }
}

export class Blob extends Compat<BytesExp> implements legacy.Blob {
  static fromBase64String(base64: string): Blob {
    return new Blob(BytesExp.fromBase64String(base64));
  }

  static fromUint8Array(array: Uint8Array): Blob {
    return new Blob(BytesExp.fromUint8Array(array));
  }

  toBase64(): string {
    return this._delegate.toBase64();
  }

  toUint8Array(): Uint8Array {
    return this._delegate.toUint8Array();
  }

  isEqual(other: Blob): boolean {
    return this._delegate.isEqual(other._delegate);
  }
}

/**
 * Takes user data that uses API types from this shim and replaces them
 * with the the firestore-exp API types.
 */
function unwrap(value: any): any {
  if (Array.isArray(value)) {
    return value.map(v => unwrap(v));
  } else if (value instanceof Compat) {
    return value._delegate;
  } else if (value instanceof FieldPath) {
    return value._delegate;
  } else if (isPlainObject(value)) {
    const obj: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        obj[key] = unwrap(value[key]);
      }
    }
    return obj;
  } else {
    return value;
  }
}
