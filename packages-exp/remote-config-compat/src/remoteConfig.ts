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
import { RemoteConfig } from '@firebase/remote-config-types-exp';
import {
  Value as ValueCompat,
  FetchStatus as FetchSTatusCompat,
  Settings as SettingsCompat,
  LogLevel as RemoteConfigLogLevel
} from '@firebase/remote-config-types';
import {
  setLogLevel,
  activate,
  ensureInitialized,
  fetchAndActivate,
  fetchConfig,
  getAll,
  getBoolean,
  getNumber,
  getString,
  getValue
} from '@firebase/remote-config-exp';
import { FirebaseService } from '@firebase/app-types/private';

export class RemoteConfigCompat implements FirebaseService {
  constructor(public app: FirebaseApp, private _remoteConfig: RemoteConfig) {}

  get defaultConfig(): { [key: string]: string | number | boolean } {
    return this._remoteConfig.defaultConfig;
  }

  set defaultConfig(value: { [key: string]: string | number | boolean }) {
    this._remoteConfig.defaultConfig = value;
  }

  get fetchTimeMillis(): number {
    return this._remoteConfig.fetchTimeMillis;
  }

  get lastFetchStatus(): FetchSTatusCompat {
    return this._remoteConfig.lastFetchStatus;
  }

  get settings(): SettingsCompat {
    return this._remoteConfig.settings;
  }

  set settings(value: SettingsCompat) {
    this._remoteConfig.settings = value;
  }

  activate(): Promise<boolean> {
    return activate(this._remoteConfig);
  }

  ensureInitialized(): Promise<void> {
    return ensureInitialized(this._remoteConfig);
  }

  /**
   * @throws a {@link ErrorCode.FETCH_CLIENT_TIMEOUT} if the request takes longer than
   * {@link Settings.fetchTimeoutInSeconds} or
   * {@link DEFAULT_FETCH_TIMEOUT_SECONDS}.
   */
  fetch(): Promise<void> {
    return fetchConfig(this._remoteConfig);
  }

  fetchAndActivate(): Promise<boolean> {
    return fetchAndActivate(this._remoteConfig);
  }

  getAll(): { [key: string]: ValueCompat } {
    return getAll(this._remoteConfig);
  }

  getBoolean(key: string): boolean {
    return getBoolean(this._remoteConfig, key);
  }

  getNumber(key: string): number {
    return getNumber(this._remoteConfig, key);
  }

  getString(key: string): string {
    return getString(this._remoteConfig, key);
  }

  getValue(key: string): ValueCompat {
    return getValue(this._remoteConfig, key);
  }

  // Based on packages/firestore/src/util/log.ts but not static because we need per-instance levels
  // to differentiate 2p and 3p use-cases.
  setLogLevel(logLevel: RemoteConfigLogLevel): void {
    setLogLevel(this._remoteConfig, logLevel);
  }
}
