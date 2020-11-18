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

import { RemoteConfig } from '@firebase/remote-config-types-exp';
import { activate, fetchConfig } from './api';

// This API is put in a separate file, so we can stub fetchConfig and activate in tests.
// It's not possible to stub standalone functions from the same module.
/**
 *
 * Performs fetch and activate operations, as a convenience.
 *
 * @param remoteConfig - the remote config instance
 *
 * @returns A promise which resolves to true if the current call activated the fetched configs.
 * If the fetched configs were already activated, the promise will resolve to false.
 *
 * @public
 */
export async function fetchAndActivate(
  remoteConfig: RemoteConfig
): Promise<boolean> {
  await fetchConfig(remoteConfig);
  return activate(remoteConfig);
}
