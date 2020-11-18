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

import '@firebase/installations-exp';
import { registerRemoteConfig } from './register';

// Facilitates debugging by enabling settings changes without rebuilding asset.
// Note these debug options are not part of a documented, supported API and can change at any time.
// Consolidates debug options for easier discovery.
// Uses transient variables on window to avoid lingering state causing panic.
declare global {
  interface Window {
    FIREBASE_REMOTE_CONFIG_URL_BASE: string;
  }
}

export * from './api';
export * from './api2';

/** register component and version */
registerRemoteConfig();
