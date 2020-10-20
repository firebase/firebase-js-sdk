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

import { FirebaseApp } from '@firebase/app-types-exp';
import {
  LogLevel,
  RemoteConfig,
  Value
} from '@firebase/remote-config-types-exp';

export function getRemoteConfig(app: FirebaseApp): RemoteConfig {
  throw Error('not implemented!');
}

export function activate(remoteConfig: RemoteConfig): Promise<boolean> {
  throw Error('not implemented!');
}

export function ensureInitialized(remoteConfig: RemoteConfig): Promise<void> {
  throw Error('not implemented!');
}

export function fetchConfig(remoteConfig: RemoteConfig): Promise<void> {
  throw Error('not implemented!');
}

export function fetchAndActivate(remoteConfig: RemoteConfig): Promise<boolean> {
  throw Error('not implemented!');
}

export function getAll(remoteConfig: RemoteConfig): Record<string, Value> {
  throw Error('not implemented!');
}

export function getBoolean(remoteConfig: RemoteConfig, key: string): boolean {
  throw Error('not implemented!');
}

export function getNumber(remoteConfig: RemoteConfig, key: string): number {
  throw Error('not implemented!');
}

export function getString(remoteConfig: RemoteConfig, key: string): string {
  throw Error('not implemented!');
}

export function getValue(remoteConfig: RemoteConfig, key: string): Value {
  throw Error('not implemented!');
}

export function setLogLevel(remoteConfig: RemoteConfig, logLevel: LogLevel) {
  throw Error('not implemented!');
}
