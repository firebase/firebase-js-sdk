/**
 * @license
 * Copyright 2022 Google LLC
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

import { base64Encode } from '@firebase/util';
import { HeartbeatsByUserAgent } from './types';

/**
 * Calculate byte length of a string. From:
 * https://codereview.stackexchange.com/questions/37512/count-byte-length-of-string
 */
function getByteLength(str: string): number {
  let byteLength = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    byteLength +=
      (c & 0xf800) === 0xd800
        ? 2 // Code point is half of a surrogate pair
        : c < 1 << 7
        ? 1
        : c < 1 << 11
        ? 2
        : 3;
  }
  return byteLength;
}

/**
 * Calculate bytes of a single HeartbeatsByUserAgent object after
 * being stringified and converted to base64.
 */
export function countHeartbeatBytes(heartbeat: HeartbeatsByUserAgent): number {
  return getByteLength(base64Encode(JSON.stringify(heartbeat)));
}

/**
 * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
 * in a platform logging header JSON object, stringified, and converted
 * to base 64.
 */
export function countBytes(heartbeatsCache: HeartbeatsByUserAgent[]): number {
  // heartbeatsCache wrapper properties
  return getByteLength(
    base64Encode(JSON.stringify({ version: 2, heartbeats: heartbeatsCache }))
  );
}

/**
 * Split a HeartbeatsByUserAgent array into 2 arrays, one that fits
 * under `maxSize`, to be sent as a header, and the remainder. If
 * the first heartbeat in the array is too big by itself, it will
 * split that heartbeat into two by splitting its `dates` array.
 */
export function splitHeartbeatsCache(
  heartbeatsCache: HeartbeatsByUserAgent[],
  maxSize: number
): {
  heartbeatsToSend: HeartbeatsByUserAgent[];
  heartbeatsToKeep: HeartbeatsByUserAgent[];
} {
  const BYTES_PER_DATE = getByteLength(
    base64Encode(JSON.stringify('2022-12-12'))
  );
  let totalBytes = 0;
  const heartbeatsToSend = [];
  const heartbeatsToKeep = [...heartbeatsCache];
  for (const heartbeat of heartbeatsCache) {
    totalBytes += countHeartbeatBytes(heartbeat);
    if (totalBytes > maxSize) {
      if (heartbeatsToSend.length === 0) {
        // The first heartbeat is too large and needs to be split or we have
        // nothing to send.
        const heartbeatBytes = countHeartbeatBytes(heartbeat);
        const bytesOverLimit = heartbeatBytes - maxSize;
        const datesToRemove = Math.ceil(bytesOverLimit / BYTES_PER_DATE);
        if (datesToRemove >= heartbeat.dates.length) {
          // If no amount of removing dates can get this heartbeat under
          // the limit (unlikely scenario), nothing can be sent.
          break;
        }
        const heartbeatToSend = {
          ...heartbeat,
          dates: heartbeat.dates.slice(0, -datesToRemove)
        };
        const heartbeatToKeep = {
          ...heartbeat,
          dates: heartbeat.dates.slice(-datesToRemove)
        };
        heartbeatsToSend.push(heartbeatToSend);
        heartbeatsToKeep[0] = heartbeatToKeep;
      } else {
        break;
      }
    } else {
      heartbeatsToSend.push(heartbeat);
      heartbeatsToKeep.shift();
    }
  }
  return {
    heartbeatsToSend,
    heartbeatsToKeep
  };
}
