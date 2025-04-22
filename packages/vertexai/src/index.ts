/**
 * The Firebase AI Web SDK.
 *
 * @packageDocumentation
 */

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

import { registerVersion, _registerComponent } from '@firebase/app';
import { AIService } from './service';
import { AI_TYPE } from './constants';
import { Component, ComponentType } from '@firebase/component';
import { name, version } from '../package.json';
import { decodeInstanceIdentifier } from './helpers';
import { AIError } from './api';
import { AIErrorCode } from './types';

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

function registerAI(): void {
  _registerComponent(
    new Component(
      AI_TYPE,
      (container, { instanceIdentifier }) => {
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
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

registerAI();

export * from './api';
export * from './public-types';
