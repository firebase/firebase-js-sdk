/**
 * @license
 * Copyright 2021 Google LLC
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

import {
  AppCheckProvider,
  AppCheckTokenResult,
  FirebaseAppCheck
} from '@firebase/app-check-types';
import { _FirebaseService, FirebaseApp } from '@firebase/app-compat';
import {
  AppCheck as AppCheckServiceExp,
  CustomProvider,
  initializeAppCheck,
  ReCaptchaV3Provider,
  setTokenAutoRefreshEnabled as setTokenAutoRefreshEnabledExp,
  getToken as getTokenExp,
  onTokenChanged as onTokenChangedExp
} from '@firebase/app-check-exp';
import { PartialObserver, Unsubscribe } from '@firebase/util';

export class AppCheckService implements FirebaseAppCheck, _FirebaseService {
  constructor(
    public app: FirebaseApp,
    readonly _delegate: AppCheckServiceExp
  ) {}
  activate(
    siteKeyOrProvider: string | AppCheckProvider,
    isTokenAutoRefreshEnabled?: boolean
  ): void {
    let provider: ReCaptchaV3Provider | CustomProvider;
    if (typeof siteKeyOrProvider === 'string') {
      provider = new ReCaptchaV3Provider(siteKeyOrProvider);
    } else {
      provider = new CustomProvider({ getToken: siteKeyOrProvider.getToken });
    }
    initializeAppCheck(this.app, {
      provider,
      isTokenAutoRefreshEnabled
    });
  }
  setTokenAutoRefreshEnabled(isTokenAutoRefreshEnabled: boolean): void {
    setTokenAutoRefreshEnabledExp(this._delegate, isTokenAutoRefreshEnabled);
  }
  getToken(forceRefresh?: boolean): Promise<AppCheckTokenResult> {
    return getTokenExp(this._delegate, forceRefresh);
  }
  onTokenChanged(
    onNextOrObserver:
      | PartialObserver<AppCheckTokenResult>
      | ((tokenResult: AppCheckTokenResult) => void),
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): Unsubscribe {
    return onTokenChangedExp(
      this._delegate,
      /**
       * Exp onTokenChanged() will handle both overloads but we need
       * to specify one to not confuse Typescript.
       */
      onNextOrObserver as (tokenResult: AppCheckTokenResult) => void,
      onError,
      onCompletion
    );
  }
}
