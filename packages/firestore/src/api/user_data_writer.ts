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
import { DocumentKey } from '../model/document_key';
import {
  normalizeByteString,
  normalizeNumber,
  normalizeTimestamp
} from '../model/values';
import {
  getLocalWriteTime,
  getPreviousValue,
  isServerTimestamp
} from '../model/server_timestamps';
import { fail } from '../util/assert';
import { forEach } from '../util/obj';

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
    if ('nullValue' in value) {
      return null;
    } else if ('booleanValue' in value) {
      return value.booleanValue!;
    } else if ('integerValue' in value) {
      return normalizeNumber(value.integerValue!);
    } else if ('doubleValue' in value) {
      return normalizeNumber(value.doubleValue!);
    } else if ('timestampValue' in value) {
      return this.convertTimestamp(value.timestampValue!);
    } else if ('stringValue' in value) {
      return value.stringValue!;
    } else if ('bytesValue' in value) {
      return new Blob(normalizeByteString(value.bytesValue!));
    } else if ('referenceValue' in value) {
      return this.convertReference(value.referenceValue!);
    } else if ('geoPointValue' in value) {
      return new GeoPoint(
        value.geoPointValue!.latitude!,
        value.geoPointValue!.longitude!
      );
    } else if ('arrayValue' in value) {
      return this.convertArray(value.arrayValue!);
    } else if ('mapValue' in value) {
      if (isServerTimestamp(value)) {
        return this.convertServerTimestamp(value);
      }
      return this.convertObject(value.mapValue!);
    } else {
      return fail('Invalid value type: ' + JSON.stringify(value));
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
    const key = DocumentKey.fromName(name);
    return new DocumentReference(key, this.firestore, this.converter);
  }
}
