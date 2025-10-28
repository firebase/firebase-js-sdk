/**
 * @license
 * Copyright 2025 Google LLC
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

import {
  ComponentContainer,
  InstanceFactoryOptions
} from '@firebase/component';
import { AIError } from './errors';
import { decodeInstanceIdentifier } from './helpers';
import { AIService } from './service';
import { AIErrorCode } from './types';

export function factory(
  container: ComponentContainer,
  { instanceIdentifier }: InstanceFactoryOptions
): AIService {
  if (!instanceIdentifier) {
    throw new AIError(
      AIErrorCode.ERROR,
      'AIService instance identifier is undefined.'
    );
  }

  const backend = decodeInstanceIdentifier(instanceIdentifier);

  // getImmediate for FirebaseApp will always succeed
  const app = container.getProvider('app').getImmediate();
  const auth = container.getProvider('auth-internal');
  const appCheckProvider = container.getProvider('app-check-internal');

  return new AIService(app, backend, auth, appCheckProvider);
}
