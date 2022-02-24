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

export interface VersionService {
  library: string;
  version: string;
}

export interface PlatformLoggerService {
  getPlatformInfoString(): string;
}

export interface HeartbeatService {
  /**
   * Called to report a heartbeat. The function will generate
   * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
   * to IndexedDB.
   * Note that we only store one heartbeat per day. So if a heartbeat for today is
   * already logged, subsequent calls to this function in the same day will be ignored.
   */
  triggerHeartbeat(): Promise<void>;
  /**
   * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
   * It also clears all heartbeats from memory as well as in IndexedDB.
   */
  getHeartbeatsHeader(): Promise<string>;
}

// Heartbeats grouped by the same user agent string
export interface HeartbeatsByUserAgent {
  userAgent: string;
  dates: string[];
}

export interface SingleDateHeartbeat {
  userAgent: string;
  date: string;
}

export interface HeartbeatStorage {
  // overwrite the storage with the provided heartbeats
  overwrite(heartbeats: SingleDateHeartbeat[]): Promise<void>;
  // add heartbeats
  add(heartbeats: SingleDateHeartbeat[]): Promise<void>;
  // delete heartbeats
  delete(heartbeats: SingleDateHeartbeat[]): Promise<void>;
  // delete all heartbeats
  deleteAll(): Promise<void>;
  // read all heartbeats
  read(): Promise<SingleDateHeartbeat[]>;
}

export interface HeartbeatsInIndexedDB {
  heartbeats: SingleDateHeartbeat[];
}
