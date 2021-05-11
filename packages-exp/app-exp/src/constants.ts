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
import { name as appCompatName } from '../../app-compat/package.json';
import { name as appCheckName } from '../../../packages-exp/app-check-exp/package.json';
import { name as analyticsCompatName } from '../../../packages-exp/analytics-compat/package.json';
import { name as analyticsName } from '../../../packages-exp/analytics-exp/package.json';
import { name as authName } from '../../../packages-exp/auth-exp/package.json';
import { name as authCompatName } from '../../../packages-exp/auth-compat-exp/package.json';
import { name as databaseName } from '../../../packages/database/package.json';
import { name as databaseCompatName } from '../../../packages/database/compat/package.json';
import { name as functionsName } from '../../../packages-exp/functions-exp/package.json';
import { name as functionsCompatName } from '../../../packages-exp/functions-compat/package.json';
import { name as installationsName } from '../../../packages-exp/installations-exp/package.json';
import { name as installationsCompatName } from '../../../packages-exp/installations-compat/package.json';
import { name as messagingName } from '../../../packages-exp/messaging-exp/package.json';
import { name as messagingCompatName } from '../../../packages-exp/messaging-compat/package.json';
import { name as performanceName } from '../../../packages-exp/performance-exp/package.json';
import { name as performanceCompatName } from '../../../packages-exp/performance-compat/package.json';
import { name as remoteConfigName } from '../../../packages-exp/remote-config-exp/package.json';
import { name as remoteConfigCompatName } from '../../../packages-exp/remote-config-compat/package.json';
import { name as storageName } from '../../../packages/storage/package.json';
import { name as storageCompatName } from '../../../packages/storage/compat/package.json';
import { name as firestoreName } from '../../../packages/firestore/package.json';
import { name as firestoreCompatName } from '../../../packages/firestore/compat/package.json';
import { name as packageName } from '../../../packages-exp/firebase-exp/package.json';

/**
 * The default app name
 *
 * @internal
 */
export const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export const PLATFORM_LOG_STRING = {
  [appName]: 'fire-core',
  [appCompatName]: 'fire-core-compat',
  [appCheckName]: 'fire-app-check',
  [analyticsName]: 'fire-analytics',
  [analyticsCompatName]: 'fire-analytics-compat',
  [authName]: 'fire-auth',
  [authCompatName]: 'fire-auth-compat',
  [databaseName]: 'fire-rtdb',
  [databaseCompatName]: 'fire-rtdb-compat',
  [functionsName]: 'fire-fn',
  [functionsCompatName]: 'fire-fn-compat',
  [installationsName]: 'fire-iid',
  [installationsCompatName]: 'fire-iid-compat',
  [messagingName]: 'fire-fcm',
  [messagingCompatName]: 'fire-fcm-compat',
  [performanceName]: 'fire-perf',
  [performanceCompatName]: 'fire-perf-compat',
  [remoteConfigName]: 'fire-rc',
  [remoteConfigCompatName]: 'fire-rc-compat',
  [storageName]: 'fire-gcs',
  [storageCompatName]: 'fire-gcs-compat',
  [firestoreName]: 'fire-fst',
  [firestoreCompatName]: 'fire-fst-compat',
  'fire-js': 'fire-js', // Platform identifier for JS SDK.
  [packageName]: 'fire-js-all'
} as const;
