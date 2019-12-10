/**
 * @license
 * Copyright 2019 Google Inc.
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

export const DEFAULT_ENTRY_NAME = '[DEFAULT]';
import { name as appName } from '../package.json';
import { name as analyticsName } from '../../analytics/package.json';
import { name as authName } from '../../auth/package.json';
import { name as databaseName } from '../../database/package.json';
import { name as functionsName } from '../../functions/package.json';
import { name as messagingName } from '../../messaging/package.json';
import { name as performanceName } from '../../performance/package.json';
import { name as remoteConfigName } from '../../remote-config/package.json';
import { name as storageName } from '../../storage/package.json';
import { name as firestoreName } from '../../firestore/package.json';

export const PLATFORM_LOG_STRING = {
  [appName]: 'fire-core',
  [analyticsName]: 'fire-analytics',
  [authName]: 'fire-auth',
  [databaseName]: 'fire-rtdb',
  [functionsName]: 'fire-fn',
  [messagingName]: 'fire-fcm',
  [performanceName]: 'fire-perf',
  [remoteConfigName]: 'fire-rc',
  [storageName]: 'fire-gcs',
  [firestoreName]: 'fire-fst',
  'fire-js': 'fire-js', // Platform identifier for JS SDK.
  'fire-js-all-app': 'fire-js-all-app', // firebase/app import
  'fire-js-all': 'fire-js-all', // 'firebase' import
  'fire-js-all-node': 'fire-js-all-node',
  'fire-js-all-rn': 'fire-js-all-rn',
  'fire-js-all-lite': 'fire-js-all-lite',
  'fire-js-all-cdn': 'fire-js-all-cdn'
} as const;
