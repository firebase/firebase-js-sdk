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

import { AppCheck } from './public-types';
import { FirebaseApp, _FirebaseService } from '@firebase/app';
import { FirebaseAppCheckInternal, ListenerType } from './types';
import {
  getToken,
  getLimitedUseToken,
  addTokenListener,
  removeTokenListener
} from './internal-api';
import { Provider } from '@firebase/component';
import { getStateReference } from './state';

/**
 * AppCheck Service class.
 */
export class AppCheckService implements AppCheck, _FirebaseService {
  constructor(
    public app: FirebaseApp,
    public heartbeatServiceProvider: Provider<'heartbeat'>
  ) {}
  _delete(): Promise<void> {
    const { tokenObservers } = getStateReference(this.app);
    for (const tokenObserver of tokenObservers) {
      removeTokenListener(this.app, tokenObserver.next);
    }
    return Promise.resolve();
  }
}

export function factory(
  app: FirebaseApp,
  heartbeatServiceProvider: Provider<'heartbeat'>
): AppCheckService {
  return new AppCheckService(app, heartbeatServiceProvider);
}

export function internalFactory(
  appCheck: AppCheckService
): FirebaseAppCheckInternal {
  return {
    getToken: forceRefresh => getToken(appCheck, forceRefresh),
    getLimitedUseToken: () => getLimitedUseToken(appCheck),
    addTokenListener: listener =>
      addTokenListener(appCheck, ListenerType.INTERNAL, listener),
    removeTokenListener: listener => removeTokenListener(appCheck.app, listener)
  };
}
