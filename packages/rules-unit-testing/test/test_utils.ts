/**
 * @license
 * Copyright 2021 Google LLC
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

import { EMULATOR_HOST_ENV_VARS } from '../src/impl/discovery';

let envVars: Record<string, string | undefined>;
export function stashEnvVars() {
  envVars = {};
  for (const envVar of Object.values(EMULATOR_HOST_ENV_VARS)) {
    envVars[envVar] = process.env[envVar];
    delete process.env[envVar];
  }
}

export function restoreEnvVars() {
  for (const envVar of Object.values(EMULATOR_HOST_ENV_VARS)) {
    if (envVars[envVar] === undefined) {
      delete process.env[envVar];
    } else {
      process.env[envVar] = envVars[envVar];
    }
  }
}
