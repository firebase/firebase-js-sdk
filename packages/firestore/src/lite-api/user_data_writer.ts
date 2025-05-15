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

import { DatabaseId } from '../core/database_info';
import { DocumentKey } from '../model/document_key';
import {
  normalizeByteString,
  normalizeNumber,
  normalizeTimestamp
} from '../model/normalize';
import { ResourcePath } from '../model/path';
import {
  getLocalWriteTime,
  getPreviousValue
} from '../model/server_timestamps';
import { TypeOrder } from '../model/type_order';
import {
  RESERVED_BSON_BINARY_KEY,
  RESERVED_INT32_KEY,
  RESERVED_BSON_OBJECT_ID_KEY,
  RESERVED_REGEX_KEY,
  RESERVED_REGEX_OPTIONS_KEY,
  RESERVED_REGEX_PATTERN_KEY,
  RESERVED_BSON_TIMESTAMP_INCREMENT_KEY,
  RESERVED_BSON_TIMESTAMP_KEY,
  RESERVED_BSON_TIMESTAMP_SECONDS_KEY,
  typeOrder,
  VECTOR_MAP_VECTORS_KEY
} from '../model/values';
import {
  ApiClientObjectMap,
  ArrayValue as ProtoArrayValue,
  LatLng as ProtoLatLng,
  MapValue as ProtoMapValue,
  Timestamp as ProtoTimestamp,
  Value,
  Value as ProtoValue
} from '../protos/firestore_proto_api';
import { isValidResourceName } from '../remote/serializer';
import { fail, hardAssert } from '../util/assert';
import { ByteString } from '../util/byte_string';
import { logError } from '../util/log';
import { forEach } from '../util/obj';

import { BsonBinaryData } from './bson_binary_data';
import { BsonObjectId } from './bson_object_Id';
import { BsonTimestamp } from './bson_timestamp';
import { GeoPoint } from './geo_point';
import { Int32Value } from './int32_value';
import { MaxKey } from './max_key';
import { MinKey } from './min_key';
import { RegexValue } from './regex_value';
import { Timestamp } from './timestamp';
import { VectorValue } from './vector_value';

export type ServerTimestampBehavior = 'estimate' | 'previous' | 'none';

/**
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 *
 * @internal
 */
export abstract class AbstractUserDataWriter {
  convertValue(
    value: ProtoValue,
    serverTimestampBehavior: ServerTimestampBehavior = 'none'
  ): unknown {
    switch (typeOrder(value)) {
      case TypeOrder.NullValue:
        return null;
      case TypeOrder.BooleanValue:
        return value.booleanValue!;
      case TypeOrder.NumberValue:
        if ('mapValue' in value) {
          return this.convertToInt32Value(value.mapValue!);
        }
        return normalizeNumber(value.integerValue || value.doubleValue);
      case TypeOrder.TimestampValue:
        return this.convertTimestamp(value.timestampValue!);
      case TypeOrder.ServerTimestampValue:
        return this.convertServerTimestamp(value, serverTimestampBehavior);
      case TypeOrder.StringValue:
        return value.stringValue!;
      case TypeOrder.BlobValue:
        return this.convertBytes(normalizeByteString(value.bytesValue!));
      case TypeOrder.RefValue:
        return this.convertReference(value.referenceValue!);
      case TypeOrder.GeoPointValue:
        return this.convertGeoPoint(value.geoPointValue!);
      case TypeOrder.ArrayValue:
        return this.convertArray(value.arrayValue!, serverTimestampBehavior);
      case TypeOrder.ObjectValue:
        return this.convertObject(value.mapValue!, serverTimestampBehavior);
      case TypeOrder.VectorValue:
        return this.convertVectorValue(value.mapValue!);
      case TypeOrder.RegexValue:
        return this.convertToRegexValue(value.mapValue!);
      case TypeOrder.BsonObjectIdValue:
        return this.convertToBsonObjectId(value.mapValue!);
      case TypeOrder.BsonBinaryValue:
        return this.convertToBsonBinaryData(value.mapValue!);
      case TypeOrder.BsonTimestampValue:
        return this.convertToBsonTimestamp(value.mapValue!);
      case TypeOrder.MaxKeyValue:
        return MaxKey.instance();
      case TypeOrder.MinKeyValue:
        return MinKey.instance();
      default:
        throw fail(0xf2a2, 'Invalid value type', {
          value
        });
    }
  }

  private convertObject(
    mapValue: ProtoMapValue,
    serverTimestampBehavior: ServerTimestampBehavior
  ): DocumentData {
    return this.convertObjectMap(mapValue.fields, serverTimestampBehavior);
  }

  /**
   * @internal
   */
  convertObjectMap(
    fields: ApiClientObjectMap<Value> | undefined,
    serverTimestampBehavior: ServerTimestampBehavior = 'none'
  ): DocumentData {
    const result: DocumentData = {};
    forEach(fields, (key, value) => {
      result[key] = this.convertValue(value, serverTimestampBehavior);
    });
    return result;
  }

  /**
   * @internal
   */
  convertVectorValue(mapValue: ProtoMapValue): VectorValue {
    const values = mapValue.fields?.[
      VECTOR_MAP_VECTORS_KEY
    ].arrayValue?.values?.map(value => {
      return normalizeNumber(value.doubleValue);
    });

    return new VectorValue(values);
  }

  private convertToBsonObjectId(mapValue: ProtoMapValue): BsonObjectId {
    const oid =
      mapValue!.fields?.[RESERVED_BSON_OBJECT_ID_KEY]?.stringValue ?? '';
    return new BsonObjectId(oid);
  }

  private convertToBsonBinaryData(mapValue: ProtoMapValue): BsonBinaryData {
    const fields = mapValue!.fields?.[RESERVED_BSON_BINARY_KEY];
    const subtypeAndData = fields?.bytesValue;
    if (!subtypeAndData) {
      throw new Error('Received incorrect bytesValue for BsonBinaryData');
    }

    const bytes = normalizeByteString(subtypeAndData).toUint8Array();
    if (bytes.length === 0) {
      throw new Error('Received empty bytesValue for BsonBinaryData');
    }
    const subtype = bytes.at(0);
    const data = bytes.slice(1);
    return new BsonBinaryData(Number(subtype), data);
  }

  private convertToBsonTimestamp(mapValue: ProtoMapValue): BsonTimestamp {
    const fields = mapValue!.fields?.[RESERVED_BSON_TIMESTAMP_KEY];
    const seconds = Number(
      fields?.mapValue?.fields?.[RESERVED_BSON_TIMESTAMP_SECONDS_KEY]
        ?.integerValue
    );
    const increment = Number(
      fields?.mapValue?.fields?.[RESERVED_BSON_TIMESTAMP_INCREMENT_KEY]
        ?.integerValue
    );
    return new BsonTimestamp(seconds, increment);
  }

  private convertToRegexValue(mapValue: ProtoMapValue): RegexValue {
    const pattern =
      mapValue!.fields?.[RESERVED_REGEX_KEY]?.mapValue?.fields?.[
        RESERVED_REGEX_PATTERN_KEY
      ]?.stringValue ?? '';
    const options =
      mapValue!.fields?.[RESERVED_REGEX_KEY]?.mapValue?.fields?.[
        RESERVED_REGEX_OPTIONS_KEY
      ]?.stringValue ?? '';
    return new RegexValue(pattern, options);
  }

  private convertToInt32Value(mapValue: ProtoMapValue): Int32Value {
    const value = Number(mapValue!.fields?.[RESERVED_INT32_KEY]?.integerValue);
    return new Int32Value(value);
  }

  private convertGeoPoint(value: ProtoLatLng): GeoPoint {
    return new GeoPoint(
      normalizeNumber(value.latitude),
      normalizeNumber(value.longitude)
    );
  }

  private convertArray(
    arrayValue: ProtoArrayValue,
    serverTimestampBehavior: ServerTimestampBehavior
  ): unknown[] {
    return (arrayValue.values || []).map(value =>
      this.convertValue(value, serverTimestampBehavior)
    );
  }

  private convertServerTimestamp(
    value: ProtoValue,
    serverTimestampBehavior: ServerTimestampBehavior
  ): unknown {
    switch (serverTimestampBehavior) {
      case 'previous':
        const previousValue = getPreviousValue(value);
        if (previousValue == null) {
          return null;
        }
        return this.convertValue(previousValue, serverTimestampBehavior);
      case 'estimate':
        return this.convertTimestamp(getLocalWriteTime(value));
      default:
        return null;
    }
  }

  private convertTimestamp(value: ProtoTimestamp): Timestamp {
    const normalizedValue = normalizeTimestamp(value);
    return new Timestamp(normalizedValue.seconds, normalizedValue.nanos);
  }

  protected convertDocumentKey(
    name: string,
    expectedDatabaseId: DatabaseId
  ): DocumentKey {
    const resourcePath = ResourcePath.fromString(name);
    hardAssert(
      isValidResourceName(resourcePath),
      0x25d8,
      'ReferenceValue is not valid',
      { name }
    );
    const databaseId = new DatabaseId(resourcePath.get(1), resourcePath.get(3));
    const key = new DocumentKey(resourcePath.popFirst(5));

    if (!databaseId.isEqual(expectedDatabaseId)) {
      // TODO(b/64130202): Somehow support foreign references.
      logError(
        `Document ${key} contains a document ` +
          `reference within a different database (` +
          `${databaseId.projectId}/${databaseId.database}) which is not ` +
          `supported. It will be treated as a reference in the current ` +
          `database (${expectedDatabaseId.projectId}/${expectedDatabaseId.database}) ` +
          `instead.`
      );
    }
    return key;
  }

  protected abstract convertReference(name: string): unknown;

  protected abstract convertBytes(bytes: ByteString): unknown;
}
