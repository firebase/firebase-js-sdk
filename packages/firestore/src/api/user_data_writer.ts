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

import * as firestore from '@firebase/firestore-types';

import {
  ArrayValue,
  BlobValue,
  FieldValue,
  ObjectValue,
  RefValue,
  ServerTimestampValue,
  TimestampValue
} from '../model/field_value';
import { DocumentReference, Firestore } from './database';
import * as log from '../util/log';
import { Blob } from './blob';
import { Timestamp } from './timestamp';

export type ServerTimestampBehavior = 'estimate' | 'previous' | 'none';

/**
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */
export class UserDataWriter<T> {
  constructor(
    private readonly firestore: Firestore,
    private readonly timestampsInSnapshots: boolean,
    private readonly serverTimestampBehavior?: ServerTimestampBehavior,
    private readonly converter?: firestore.FirestoreDataConverter<T>
  ) {}

  convertValue(value: FieldValue): unknown {
    if (value instanceof ObjectValue) {
      return this.convertObject(value);
    } else if (value instanceof ArrayValue) {
      return this.convertArray(value);
    } else if (value instanceof RefValue) {
      return this.convertReference(value);
    } else if (value instanceof BlobValue) {
      return new Blob(value.internalValue);
    } else if (value instanceof TimestampValue) {
      return this.convertTimestamp(value.value());
    } else if (value instanceof ServerTimestampValue) {
      return this.convertServerTimestamp(value);
    } else {
      return value.value();
    }
  }

  private convertObject(data: ObjectValue): firestore.DocumentData {
    const result: firestore.DocumentData = {};
    data.forEach((key, value) => {
      result[key] = this.convertValue(value);
    });
    return result;
  }

  private convertArray(data: ArrayValue): unknown[] {
    return data.internalValue.map(value => this.convertValue(value));
  }

  private convertServerTimestamp(value: ServerTimestampValue): unknown {
    switch (this.serverTimestampBehavior) {
      case 'previous':
        return value.previousValue
          ? this.convertValue(value.previousValue)
          : null;
      case 'estimate':
        return this.convertTimestamp(value.localWriteTime);
      default:
        return value.value();
    }
  }

  private convertTimestamp(timestamp: Timestamp): Timestamp | Date {
    if (this.timestampsInSnapshots) {
      return timestamp;
    } else {
      return timestamp.toDate();
    }
  }

  private convertReference(value: RefValue): DocumentReference<T> {
    const key = value.value();
    const database = this.firestore.ensureClientConfigured().databaseId();
    if (!value.databaseId.isEqual(database)) {
      // TODO(b/64130202): Somehow support foreign references.
      log.error(
        `Document ${value.key} contains a document ` +
          `reference within a different database (` +
          `${value.databaseId.projectId}/${value.databaseId.database}) which is not ` +
          `supported. It will be treated as a reference in the current ` +
          `database (${database.projectId}/${database.database}) ` +
          `instead.`
      );
    }
    return new DocumentReference(key, this.firestore, this.converter);
  }
}
