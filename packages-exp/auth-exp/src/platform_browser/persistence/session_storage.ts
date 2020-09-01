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

import * as externs from '@firebase/auth-types-exp';

import {
  Persistence,
  PersistenceType,
  StorageEventListener
} from '../../core/persistence';
import { BrowserPersistenceClass } from './browser';

class BrowserSessionPersistence
  extends BrowserPersistenceClass
  implements Persistence {
  static type: 'SESSION' = 'SESSION';

  constructor() {
    super(sessionStorage, PersistenceType.SESSION);
  }

  _addListener(_key: string, _listener: StorageEventListener): void {
    // Listeners are not supported for session storage since it cannot be shared across windows
    return;
  }

  _removeListener(_key: string, _listener: StorageEventListener): void {
    // Listeners are not supported for session storage since it cannot be shared across windows
    return;
  }
}

export const browserSessionPersistence: externs.Persistence = BrowserSessionPersistence;
