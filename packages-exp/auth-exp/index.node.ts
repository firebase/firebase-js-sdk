/**
 * @license
 * Copyright 2017 Google LLC
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

/**
 * This is the file that people using Node.js will actually import. You should
 * only include this file if you have something specific about your
 * implementation that mandates having a separate entrypoint. Otherwise you can
 * just use index.browser.ts
 */

import * as fetchImpl from 'node-fetch';

import { FirebaseApp, getApp, _getProvider } from '@firebase/app-exp';
import { Auth } from './src/model/public_types';

import { initializeAuth } from './src';
import { registerAuth } from './src/core/auth/register';
import { FetchProvider } from './src/core/util/fetch_provider';
import { ClientPlatform } from './src/core/util/version';

// Initialize the fetch polyfill, the types are slightly off so just cast and hope for the best
FetchProvider.initialize(
  fetchImpl.default as unknown as typeof fetch,
  fetchImpl.Headers as unknown as typeof Headers,
  fetchImpl.Response as unknown as typeof Response
);

// Core functionality shared by all clients
export * from './src';
export {
  FactorId,
  ProviderId,
  SignInMethod,
  OperationType,
  ActionCodeOperation
} from './src/model/enum_maps';

export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth-exp');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  return initializeAuth(app);
}

registerAuth(ClientPlatform.NODE);
