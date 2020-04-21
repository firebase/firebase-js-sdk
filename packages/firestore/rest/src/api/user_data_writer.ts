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

import * as api from '../../../src/protos/firestore_proto_api';

import { DocumentReference, Firestore } from './database';
import { Blob } from '../../../src/api/blob';
import { GeoPoint } from '../../../src/api/geo_point';
import { Timestamp } from '../../../src/api/timestamp';
import { DatabaseId } from '../../../src/core/database_info';
import { DocumentKey } from '../../../src/model/document_key';
import {
  normalizeByteString,
  normalizeNumber,
  normalizeTimestamp,
  typeOrder
} from '../../../src/model/values';
import { debugAssert, fail, hardAssert } from '../../../src/util/assert';
import { forEach } from '../../../src/util/obj';
import { TypeOrder } from '../../../src/model/field_value';
import { ResourcePath } from '../../../src/model/path';
import { isValidResourceName } from '../../../src/remote/serializer';
import { logError } from '../../../src/util/log';
import { FirebaseFirestore } from '../api';

/**
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */
export class UserDataWriter<T = firestore.DocumentData> {
  constructor(private readonly firestore: FirebaseFirestore) {}

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
        throw fail('ServerTimestampValue are not supported');
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

  private convertTimestamp(value: api.Timestamp): Timestamp | Date {
    const normalizedValue = normalizeTimestamp(value);
    const timestamp = new Timestamp(
      normalizedValue.seconds,
      normalizedValue.nanos
    );
    return timestamp;
  }

  private convertReference(name: string): DocumentReference<T> {
    const resourcePath = ResourcePath.fromString(name);
    hardAssert(
      isValidResourceName(resourcePath),
      'ReferenceValue is not valid ' + name
    );
    const databaseId = new DatabaseId(resourcePath.get(1), resourcePath.get(3));
    const key = new DocumentKey(resourcePath.popFirst(5));

    debugAssert(
      this.firestore instanceof Firestore,
      'Expected internal instance'
    );

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

    return new DocumentReference(key, this.firestore);
  }
}
