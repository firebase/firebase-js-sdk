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

import { FirebaseApp } from '@firebase/app-types';
import { FunctionsService } from '../src/service';

export function createTestService(
  app: FirebaseApp,
  region?: string
): FunctionsService {
  const functions = new FunctionsService(app, region);
  const useEmulator = !!process.env.FIREBASE_FUNCTIONS_EMULATOR_ORIGIN;
  if (useEmulator) {
    functions.useFunctionsEmulator(
      process.env.FIREBASE_FUNCTIONS_EMULATOR_ORIGIN!
    );
  }
  return functions;
}
