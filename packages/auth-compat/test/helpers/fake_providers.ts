/**
 * @license
 * Copyright 2026 Google LLC
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

import { Provider } from '@firebase/component';

// Heartbeat is fully tested in core auth impl
export const FAKE_HEARTBEAT_CONTROLLER_PROVIDER = {
  getImmediate(): undefined {
    return undefined;
  }
} as unknown as Provider<'heartbeat'>;

// App Check is fully tested in core auth impl
export const FAKE_APP_CHECK_CONTROLLER_PROVIDER = {
  getImmediate(): undefined {
    return undefined;
  }
} as unknown as Provider<'app-check-internal'>;
