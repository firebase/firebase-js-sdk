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

import * as firestore from '@firebase/firestore-types';

import { makeConstructorPrivate } from '../util/api';

/**
 * An opaque base class for FieldValue sentinel objects in our public API,
 * with public static methods for creating said sentinel objects.
 */
// tslint:disable-next-line:class-as-namespace  We use this as a base class.
export abstract class FieldValueImpl implements firestore.FieldValue {
  protected constructor(readonly methodName: string) {}

  static delete(): FieldValueImpl {
    return DeleteFieldValueImpl.instance;
  }

  static serverTimestamp(): FieldValueImpl {
    return ServerTimestampFieldValueImpl.instance;
  }

  isEqual(other: FieldValueImpl): boolean {
    return this === other;
  }
}

export class DeleteFieldValueImpl extends FieldValueImpl {
  private constructor() {
    super('FieldValue.delete()');
  }
  /** Singleton instance. */
  static instance = new DeleteFieldValueImpl();
}

export class ServerTimestampFieldValueImpl extends FieldValueImpl {
  private constructor() {
    super('FieldValue.serverTimestamp()');
  }
  /** Singleton instance. */
  static instance = new ServerTimestampFieldValueImpl();
}

// Public instance that disallows construction at runtime. This constructor is
// used when exporting FieldValueImpl on firebase.firestore.FieldValue and will
// be called FieldValue publicly. Internally we still use FieldValueImpl which
// has a type-checked private constructor. Note that FieldValueImpl and
// PublicFieldValue can be used interchangeably in instanceof checks.
// For our internal TypeScript code PublicFieldValue doesn't exist as a type,
// and so we need to use FieldValueImpl as type and export it too.
// tslint:disable-next-line:variable-name  We treat this as a class name.
export const PublicFieldValue = makeConstructorPrivate(
  FieldValueImpl,
  'Use FieldValue.<field>() instead.'
);
