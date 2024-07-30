/**
 * @license
 * Copyright 2024 Google LLC
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

import { GlobalsCache } from '../../../src/local/globals_cache';
import { Persistence } from '../../../src/local/persistence';
import { ByteString } from '../../../src/util/byte_string';

/**
 * A wrapper around a GlobalsCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestGlobalsCache {
  private readonly cache: GlobalsCache;

  constructor(private readonly persistence: Persistence) {
    this.cache = persistence.getGlobalsCache();
  }

  getSessionToken(): Promise<ByteString> {
    return this.persistence.runTransaction('getSessionToken', 'readonly', t =>
      this.cache.getSessionToken(t)
    );
  }

  setSessionToken(sessionToken: ByteString): Promise<void> {
    return this.persistence.runTransaction('getSessionToken', 'readwrite', t =>
      this.cache.setSessionToken(t, sessionToken)
    );
  }
}
