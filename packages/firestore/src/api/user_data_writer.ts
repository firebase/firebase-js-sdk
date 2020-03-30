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

import * as api from '../protos/firestore_proto_api';

import { DocumentReference, Firestore } from './database';
import { Blob } from './blob';
import { GeoPoint } from './geo_point';
import { Timestamp } from './timestamp';
import { DatabaseId } from '../core/database_info';
import { DocumentKey } from '../model/document_key';
import {
  normalizeByteString,
  normalizeNumber,
  normalizeTimestamp,
  typeOrder
} from '../model/values';
import {
  getLocalWriteTime,
  getPreviousValue
} from '../model/server_timestamps';
import { assert, fail } from '../util/assert';
import { forEach } from '../util/obj';
import { TypeOrder } from '../model/field_value';
import { ResourcePath } from '../model/path';
import { isValidResourceName } from '../remote/serializer';
import { logError } from '../util/log';

export type ServerTimestampBehavior = 'estimate' | 'previous' | 'none';

/**
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */
export class UserDataWriter<T = firestore.DocumentData> {
  constructor(
    private readonly firestore: Firestore,
    private readonly timestampsInSnapshots: boolean,
    private readonly serverTimestampBehavior?: ServerTimestampBehavior,
    private readonly converter?: firestore.FirestoreDataConverter<T>
  ) {}

  convertValue(value: api.Value): unknown {
    switch (typeOrder(value)) {
      case TypeOrder.NullValue:
        return null;
      case TypeOrder.BooleanValue:
        return value.booleanValue!;
      case TypeOrder.NumberValue:
        return normalizeNumber(value.integerValue || value.doubleValue);
      case TypeOrder.TimestampValue:
        return this.convertTimestamp(value.timestampValue!);
      case TypeOrder.ServerTimestampValue:
        return this.convertServerTimestamp(value);
      case TypeOrder.StringValue:
        return value.stringValue!;
      case TypeOrder.BlobValue:
        return new Blob(normalizeByteString(value.bytesValue!));
      case TypeOrder.RefValue:
        return this.convertReference(value.referenceValue!);
      case TypeOrder.GeoPointValue:
        return new GeoPoint(
          value.geoPointValue!.latitude!,
          value.geoPointValue!.longitude!
        );
      case TypeOrder.ArrayValue:
        return this.convertArray(value.arrayValue!);
      case TypeOrder.ObjectValue:
        return this.convertObject(value.mapValue!);
      default:
        throw fail('Invalid value type: ' + JSON.stringify(value));
    }
  }

  private convertObject(mapValue: api.MapValue): firestore.DocumentData {
    const result: firestore.DocumentData = {};
    forEach(mapValue.fields || {}, (key, value) => {
      result[key] = this.convertValue(value);
    });
    return result;
  }

  private convertArray(arrayValue: api.ArrayValue): unknown[] {
    return (arrayValue.values || []).map(value => this.convertValue(value));
  }

  private convertServerTimestamp(value: api.Value): unknown {
    switch (this.serverTimestampBehavior) {
      case 'previous':
        const previousValue = getPreviousValue(value);
        if (previousValue == null) {
          return null;
        }
        return this.convertValue(previousValue);
      case 'estimate':
        return this.convertTimestamp(getLocalWriteTime(value));
      default:
        return null;
    }
  }

  private convertTimestamp(value: api.Timestamp): Timestamp | Date {
    const normalizedValue = normalizeTimestamp(value);
    const timestamp = new Timestamp(
      normalizedValue.seconds,
      normalizedValue.nanos
    );
    if (this.timestampsInSnapshots) {
      return timestamp;
    } else {
      return timestamp.toDate();
    }
  }

  private convertReference(name: string): DocumentReference<T> {
    const resourcePath = ResourcePath.fromString(name);
    assert(
      isValidResourceName(resourcePath),
      'ReferenceValue is not valid ' + name
    );
    const databaseId = new DatabaseId(resourcePath.get(1), resourcePath.get(3));
    const key = new DocumentKey(resourcePath.popFirst(5));

    if (!databaseId.isEqual(this.firestore._databaseId)) {
      // TODO(b/64130202): Somehow support foreign references.
      logError(
        `Document ${key} contains a document ` +
          `reference within a different database (` +
          `${databaseId.projectId}/${databaseId.database}) which is not ` +
          `supported. It will be treated as a reference in the current ` +
          `database (${this.firestore._databaseId.projectId}/${this.firestore._databaseId.database}) ` +
          `instead.`
      );
    }

    return new DocumentReference(key, this.firestore, this.converter);
  }
}
