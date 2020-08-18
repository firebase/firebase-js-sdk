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

import { DocumentData } from '@firebase/firestore-types';
import {
  Value as ProtoValue,
  MapValue as ProtoMapValue,
  ArrayValue as ProtoArrayValue,
  LatLng as ProtoLatLng,
  Timestamp as ProtoTimestamp
} from '../protos/firestore_proto_api';

import { DocumentKeyReference } from './user_data_reader';
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
import { fail, hardAssert } from '../util/assert';
import { forEach } from '../util/obj';
import { TypeOrder } from '../model/object_value';
import { ResourcePath } from '../model/path';
import { isValidResourceName } from '../remote/serializer';
import { logError } from '../util/log';

export type ServerTimestampBehavior = 'estimate' | 'previous' | 'none';

/**
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */
export class UserDataWriter {
  constructor(
    private readonly databaseId: DatabaseId,
    private readonly timestampsInSnapshots: boolean,
    private readonly serverTimestampBehavior: ServerTimestampBehavior,
    private readonly referenceFactory: (
      key: DocumentKey
    ) => DocumentKeyReference<DocumentData>
  ) {}

  convertValue(value: ProtoValue): unknown {
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
        return this.convertGeoPoint(value.geoPointValue!);
      case TypeOrder.ArrayValue:
        return this.convertArray(value.arrayValue!);
      case TypeOrder.ObjectValue:
        return this.convertObject(value.mapValue!);
      default:
        throw fail('Invalid value type: ' + JSON.stringify(value));
    }
  }

  private convertObject(mapValue: ProtoMapValue): DocumentData {
    const result: DocumentData = {};
    forEach(mapValue.fields || {}, (key, value) => {
      result[key] = this.convertValue(value);
    });
    return result;
  }

  private convertGeoPoint(value: ProtoLatLng): GeoPoint {
    return new GeoPoint(
      normalizeNumber(value.latitude),
      normalizeNumber(value.longitude)
    );
  }

  private convertArray(arrayValue: ProtoArrayValue): unknown[] {
    return (arrayValue.values || []).map(value => this.convertValue(value));
  }

  private convertServerTimestamp(value: ProtoValue): unknown {
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

  private convertTimestamp(value: ProtoTimestamp): Timestamp | Date {
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

  private convertReference(name: string): DocumentKeyReference<DocumentData> {
    const resourcePath = ResourcePath.fromString(name);
    hardAssert(
      isValidResourceName(resourcePath),
      'ReferenceValue is not valid ' + name
    );
    const databaseId = new DatabaseId(resourcePath.get(1), resourcePath.get(3));
    const key = new DocumentKey(resourcePath.popFirst(5));

    if (!databaseId.isEqual(this.databaseId)) {
      // TODO(b/64130202): Somehow support foreign references.
      logError(
        `Document ${key} contains a document ` +
          `reference within a different database (` +
          `${databaseId.projectId}/${databaseId.database}) which is not ` +
          `supported. It will be treated as a reference in the current ` +
          `database (${this.databaseId.projectId}/${this.databaseId.database}) ` +
          `instead.`
      );
    }

    return this.referenceFactory(key);
  }
}
