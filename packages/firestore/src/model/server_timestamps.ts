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

import * as api from '../protos/firestore_proto_api';
import { Timestamp } from '../api/timestamp';
import { normalizeTimestamp } from './values';

/**
 * Represents a locally-applied ServerTimestamp.
 *
 * Server Timestamps are backed by MapValues that contain an internal field
 * `__type__` with a value of `server_timestamp`. The previous value and local
 * write time are stored in its `__previous_value__` and `__local_write_time__`
 * fields respectively.
 *
 * Notes:
 * - ServerTimestampValue instances are created as the result of applying a
 *   TransformMutation (see TransformMutation.applyTo()). They can only exist in
 *   the local view of a document. Therefore they do not need to be parsed or
 *   serialized.
 * - When evaluated locally (e.g. for snapshot.data()), they by default
 *   evaluate to `null`. This behavior can be configured by passing custom
 *   FieldValueOptions to value().
 * - With respect to other ServerTimestampValues, they sort by their
 *   localWriteTime.
 */

const SERVER_TIMESTAMP_SENTINEL = 'server_timestamp';
const TYPE_KEY = '__type__';
const PREVIOUS_VALUE_KEY = '__previous_value__';
const LOCAL_WRITE_TIME_KEY = '__local_write_time__';

export function isServerTimestamp(value: api.Value | null): boolean {
  const type = (value?.mapValue?.fields || {})[TYPE_KEY]?.stringValue;
  return type === SERVER_TIMESTAMP_SENTINEL;
}

/**
 * Creates a new ServerTimestamp proto value (using the internal format).
 */
export function serverTimestamp(
  localWriteTime: Timestamp,
  previousValue: api.Value | null
): api.Value {
  const mapValue: api.MapValue = {
    fields: {
      [TYPE_KEY]: {
        stringValue: SERVER_TIMESTAMP_SENTINEL
      },
      [LOCAL_WRITE_TIME_KEY]: {
        timestampValue: {
          seconds: localWriteTime.seconds,
          nanos: localWriteTime.nanoseconds
        }
      }
    }
  };

  if (previousValue) {
    mapValue.fields![PREVIOUS_VALUE_KEY] = previousValue;
  }

  return { mapValue };
}

/**
 * Returns the value of the field before this ServerTimestamp was set.
 *
 * Preserving the previous values allows the user to display the last resoled
 * value until the backend responds with the timestamp.
 */
export function getPreviousValue(value: api.Value): api.Value | null {
  const previousValue = value.mapValue!.fields![PREVIOUS_VALUE_KEY];

  if (isServerTimestamp(previousValue)) {
    return getPreviousValue(previousValue);
  }
  return previousValue;
}

/**
 * Returns the local time at which this timestamp was first set.
 */
export function getLocalWriteTime(value: api.Value): Timestamp {
  const localWriteTime = normalizeTimestamp(
    value.mapValue!.fields![LOCAL_WRITE_TIME_KEY].timestampValue!
  );
  return new Timestamp(localWriteTime.seconds, localWriteTime.nanos);
}
