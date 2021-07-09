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

import { FirebaseApp } from '@firebase/app-types';
import {
  AppCheckProvider,
  AppCheckToken,
  AppCheckTokenResult
} from '@firebase/app-check-types';
import { AppCheckTokenListener } from '@firebase/app-check-interop-types';
import { Refresher } from './proactive-refresh';
import { Deferred, PartialObserver } from '@firebase/util';
import { GreCAPTCHA } from './recaptcha';

export interface AppCheckTokenInternal extends AppCheckToken {
  issuedAtTimeMillis: number;
}

export interface AppCheckTokenObserver
  extends PartialObserver<AppCheckTokenResult> {
  // required
  next: AppCheckTokenListener;
  type: ListenerType;
}

export const enum ListenerType {
  'INTERNAL' = 'INTERNAL',
  'EXTERNAL' = 'EXTERNAL'
}

export interface AppCheckState {
  activated: boolean;
  tokenObservers: AppCheckTokenObserver[];
  customProvider?: AppCheckProvider;
  siteKey?: string;
  token?: AppCheckTokenInternal;
  tokenRefresher?: Refresher;
  reCAPTCHAState?: ReCAPTCHAState;
  isTokenAutoRefreshEnabled?: boolean;
}

export interface ReCAPTCHAState {
  initialized: Deferred<GreCAPTCHA>;
  widgetId?: string;
}

export interface DebugState {
  enabled: boolean;
  // This is the debug token string the user interacts with.
  token?: Deferred<string>;
}

const APP_CHECK_STATES = new Map<FirebaseApp, AppCheckState>();
export const DEFAULT_STATE: AppCheckState = {
  activated: false,
  tokenObservers: []
};

const DEBUG_STATE: DebugState = {
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
}

export function getDebugState(): DebugState {
  return DEBUG_STATE;
}
