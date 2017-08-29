/**
* Copyright 2017 Google Inc.
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

import { DOMStorageWrapper } from './DOMStorageWrapper';
import { MemoryStorage } from './MemoryStorage';

declare const window: any;

/**
* Helper to create a DOMStorageWrapper or else fall back to MemoryStorage.
* TODO: Once MemoryStorage and DOMStorageWrapper have a shared interface this method annotation should change
* to reflect this type
*
* @param {string} domStorageName Name of the underlying storage object
*   (e.g. 'localStorage' or 'sessionStorage').
* @return {?} Turning off type information until a common interface is defined.
*/
const createStoragefor = function(
  domStorageName: string
): DOMStorageWrapper | MemoryStorage {
  try {
    // NOTE: just accessing "localStorage" or "window['localStorage']" may throw a security exception,
    // so it must be inside the try/catch.
    if (
      typeof window !== 'undefined' &&
      typeof window[domStorageName] !== 'undefined'
    ) {
      // Need to test cache. Just because it's here doesn't mean it works
      const domStorage = window[domStorageName];
      domStorage.setItem('firebase:sentinel', 'cache');
      domStorage.removeItem('firebase:sentinel');
      return new DOMStorageWrapper(domStorage);
    }
  } catch (e) {}

  // Failed to create wrapper.  Just return in-memory storage.
  // TODO: log?
  return new MemoryStorage();
};

/** A storage object that lasts across sessions */
export const PersistentStorage = createStoragefor('localStorage');

/** A storage object that only lasts one session */
export const SessionStorage = createStoragefor('sessionStorage');
