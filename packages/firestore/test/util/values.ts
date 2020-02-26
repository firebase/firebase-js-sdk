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

import * as api from '../../src/protos/firestore_proto_api';
import * as typeUtils from '../../src/util/types';
import { Blob } from '../../src/api/blob';
import { Timestamp } from '../../src/api/timestamp';
import { GeoPoint } from '../../src/api/geo_point';
import { DocumentKeyReference } from '../../src/api/user_data_converter';
import { DatabaseId } from '../../src/core/database_info';
import { DocumentKey } from '../../src/model/document_key';
import { fail } from '../../src/util/assert';
import { Dict, forEach } from '../../src/util/obj';

/** Test helper to create Firestore Value protos from JavaScript types. */

// TODO(mrschmidt): Move into UserDataConverter
export function valueOf(
  input: unknown,
  useProto3Json: boolean = false
): api.Value {
  if (input === null) {
    return { nullValue: 'NULL_VALUE' };
  } else if (typeof input === 'number') {
    if (typeUtils.isSafeInteger(input)) {
      return { integerValue: input };
    } else {
      if (useProto3Json) {
        // Proto 3 let's us encode NaN and Infinity as string values as
        // expected by the backend. This is currently not checked by our unit
        // tests because they rely on protobuf.js.
        if (isNaN(input)) {
          return { doubleValue: 'NaN' } as {};
        } else if (input === Infinity) {
          return { doubleValue: 'Infinity' } as {};
        } else if (input === -Infinity) {
          return { doubleValue: '-Infinity' } as {};
        }
      }
      return { doubleValue: input };
    }
  } else if (typeof input === 'boolean') {
    return { booleanValue: input };
  } else if (typeof input === 'string') {
    return { stringValue: input };
  } else if (input instanceof Date) {
    const timestamp = Timestamp.fromDate(input);
    return {
      timestampValue: {
        seconds: String(timestamp.seconds),
        nanos: timestamp.nanoseconds
      }
    };
  } else if (input instanceof Timestamp) {
    return {
      timestampValue: {
        seconds: String(input.seconds),
        nanos: input.nanoseconds
      }
    };
  } else if (input instanceof GeoPoint) {
    return {
      geoPointValue: {
        latitude: input.latitude,
        longitude: input.longitude
      }
    };
  } else if (input instanceof Blob) {
    if (useProto3Json) {
      return { bytesValue: input._byteString.toBase64() };
    } else {
      return { bytesValue: input._byteString.toUint8Array() };
    }
  } else if (input instanceof DocumentKeyReference) {
    return {
      referenceValue:
        'projects/project/databases/(default)/documents/' + input.key.path
    };
  } else if (Array.isArray(input)) {
    return {
      arrayValue: { values: input.map(el => valueOf(el, useProto3Json)) }
    };
  } else if (typeof input === 'object') {
    const result: api.Value = { mapValue: { fields: {} } };
    forEach(input as Dict<unknown>, (key: string, val: unknown) => {
      result.mapValue!.fields![key] = valueOf(val, useProto3Json);
    });
    return result;
  } else {
    fail(`Failed to serialize field: ${input}`);
  }
}

/** Creates a MapValue from a list of key/value arguments. */
export function mapOf(...entries: unknown[]): api.Value {
  const result: api.Value = { mapValue: { fields: {} } };
  for (let i = 0; i < entries.length; i += 2) {
    result.mapValue!.fields![entries[i] as string] = valueOf(
      entries[i + 1],
      /* useProto3Json= */ false
    );
  }
  return result;
}

export function refValue(dbId: DatabaseId, key: DocumentKey): api.Value {
  return {
    referenceValue: `projects/${dbId.projectId}/databases/${dbId.database}/documents/${key.path}`
  };
}
