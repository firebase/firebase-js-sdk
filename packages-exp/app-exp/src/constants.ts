/**
 * @license
 * Copyright 2019 Google LLC
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

import { name as appName } from '../package.json';
import { name as analyticsName } from '../../../packages/analytics/package.json';
import { name as authName } from '../../../packages/auth/package.json';
import { name as databaseName } from '../../../packages/database/package.json';
import { name as functionsName } from '../../../packages/functions/package.json';
import { name as installationsName } from '../../../packages/installations/package.json';
import { name as messagingName } from '../../../packages/messaging/package.json';
import { name as performanceName } from '../../../packages/performance/package.json';
import { name as remoteConfigName } from '../../../packages/remote-config/package.json';
import { name as storageName } from '../../../packages/storage/package.json';
import { name as firestoreName } from '../../../packages/firestore/package.json';
import { name as packageName } from '../../../packages/firebase/package.json';

export const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export const PLATFORM_LOG_STRING = {
  [appName]: 'fire-core',
  [analyticsName]: 'fire-analytics',
  [authName]: 'fire-auth',
  [databaseName]: 'fire-rtdb',
  [functionsName]: 'fire-fn',
  [installationsName]: 'fire-iid',
  [messagingName]: 'fire-fcm',
  [performanceName]: 'fire-perf',
  [remoteConfigName]: 'fire-rc',
  [storageName]: 'fire-gcs',
  [firestoreName]: 'fire-fst',
  'fire-js': 'fire-js', // Platform identifier for JS SDK.
  [packageName]: 'fire-js-all'
} as const;
