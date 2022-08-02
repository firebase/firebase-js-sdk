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

import { FirebaseApp } from '@firebase/app';
import {
  AppCheckProvider,
  AppCheckTokenInternal,
  AppCheckTokenObserver
} from './types';
import { Refresher } from './proactive-refresh';
import { Deferred } from '@firebase/util';
import { GreCAPTCHA } from './recaptcha';
export interface AppCheckState {
  activated: boolean;
  tokenObservers: AppCheckTokenObserver[];
  provider?: AppCheckProvider;
  token?: AppCheckTokenInternal;
  cachedTokenPromise?: Promise<AppCheckTokenInternal | undefined>;
  exchangeTokenPromise?: Promise<AppCheckTokenInternal>;
  tokenRefresher?: Refresher;
  reCAPTCHAState?: ReCAPTCHAState;
  isTokenAutoRefreshEnabled?: boolean;
}

export interface ReCAPTCHAState {
  initialized: Deferred<GreCAPTCHA>;
  widgetId?: string;
}

export interface DebugState {
  initialized: boolean;
  enabled: boolean;
  token?: Deferred<string>;
}

const APP_CHECK_STATES = new Map<FirebaseApp, AppCheckState>();
export const DEFAULT_STATE: AppCheckState = {
  activated: false,
  tokenObservers: []
};

const DEBUG_STATE: DebugState = {
  initialized: false,
  enabled: false
};

export function getState(app: FirebaseApp): AppCheckState {
  return APP_CHECK_STATES.get(app) || DEFAULT_STATE;
}

export function setState(app: FirebaseApp, state: AppCheckState): void {
  APP_CHECK_STATES.set(app, state);
}

// for testing only
export function clearState(): void {
  APP_CHECK_STATES.clear();
  DEBUG_STATE.enabled = false;
  DEBUG_STATE.token = undefined;
  DEBUG_STATE.initialized = false;
}

export function getDebugState(): DebugState {
  return DEBUG_STATE;
}
