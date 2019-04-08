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

import { PENDING_TIMEOUT_MS } from '../constants';
import {
  AuthToken,
  InstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';

export function hasAuthTokenRequestTimedOut(authToken: AuthToken): boolean {
  return (
    authToken.requestStatus === RequestStatus.IN_PROGRESS &&
    authToken.requestTime + PENDING_TIMEOUT_MS < Date.now()
  );
}

export function hasInstallationRequestTimedOut(
  installationEntry: InstallationEntry
): boolean {
  return (
    installationEntry.registrationStatus === RequestStatus.IN_PROGRESS &&
    installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now()
  );
}
