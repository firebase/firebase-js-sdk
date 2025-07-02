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

import { registerVersion } from '@firebase/app';
import { version } from '../package.json';

registerVersion('fire-js-all', version, 'cdn');
export * as app from '@firebase/app';
export * as ai from '@firebase/ai';
export * as analytics from '@firebase/analytics';
export * as appCheck from '@firebase/app-check';
export * as auth from '@firebase/auth';
export * as dataConnect from '@firebase/data-connect';
export * as database from '@firebase/database';
export * as firestore from '@firebase/firestore';
export * as functions from '@firebase/functions';
export * as installations from '@firebase/installations';
export * as messaging from '@firebase/messaging';
export * as performance from '@firebase/performance';
export * as remoteConfig from '@firebase/remote-config';
