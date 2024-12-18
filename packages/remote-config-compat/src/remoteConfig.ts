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

import { FirebaseApp, _FirebaseService } from '@firebase/app-compat';
import {
  Value as ValueCompat,
  FetchStatus as FetchSTatusCompat,
  Settings as SettingsCompat,
  LogLevel as RemoteConfigLogLevel,
  RemoteConfig as RemoteConfigCompat
} from '@firebase/remote-config-types';
import {
  RemoteConfig,
  setLogLevel,
  activate,
  ensureInitialized,
  fetchAndActivate,
  fetchConfig,
  getAll,
  getBoolean,
  getNumber,
  getString,
  getValue,
  isSupported,
  connectRemoteConfigEmulator
} from '@firebase/remote-config';

export { isSupported };

export class RemoteConfigCompatImpl
  implements RemoteConfigCompat, _FirebaseService
{
  constructor(public app: FirebaseApp, readonly _delegate: RemoteConfig) {}

  get defaultConfig(): { [key: string]: string | number | boolean } {
    return this._delegate.defaultConfig;
  }

  set defaultConfig(value: { [key: string]: string | number | boolean }) {
    this._delegate.defaultConfig = value;
  }

  get fetchTimeMillis(): number {
    return this._delegate.fetchTimeMillis;
  }

  get lastFetchStatus(): FetchSTatusCompat {
    return this._delegate.lastFetchStatus;
  }

  get settings(): SettingsCompat {
    return this._delegate.settings;
  }

  set settings(value: SettingsCompat) {
    this._delegate.settings = value;
  }

  activate(): Promise<boolean> {
    return activate(this._delegate);
  }

  useEmulator(url: string): void {
    connectRemoteConfigEmulator(this._delegate, url);
  }

  ensureInitialized(): Promise<void> {
    return ensureInitialized(this._delegate);
  }

  /**
   * @throws a {@link ErrorCode.FETCH_CLIENT_TIMEOUT} if the request takes longer than
   * {@link Settings.fetchTimeoutInSeconds} or
   * {@link DEFAULT_FETCH_TIMEOUT_SECONDS}.
   */
  fetch(): Promise<void> {
    return fetchConfig(this._delegate);
  }

  fetchAndActivate(): Promise<boolean> {
    return fetchAndActivate(this._delegate);
  }

  getAll(): { [key: string]: ValueCompat } {
    return getAll(this._delegate);
  }

  getBoolean(key: string): boolean {
    return getBoolean(this._delegate, key);
  }

  getNumber(key: string): number {
    return getNumber(this._delegate, key);
  }

  getString(key: string): string {
    return getString(this._delegate, key);
  }

  getValue(key: string): ValueCompat {
    return getValue(this._delegate, key);
  }

  // Based on packages/firestore/src/util/log.ts but not static because we need per-instance levels
  // to differentiate 2p and 3p use-cases.
  setLogLevel(logLevel: RemoteConfigLogLevel): void {
    setLogLevel(this._delegate, logLevel);
  }
}
