/**
 * The Vertex AI in Firebase Web SDK.
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
import { GenAIService } from './service';
import { DEFAULT_INSTANCE_IDENTIFER, GENAI_TYPE } from './constants';
import { Component, ComponentType } from '@firebase/component';
import { name, version } from '../package.json';
import { InstanceIdentifier } from './public-types';
import { decodeInstanceIdentifier } from './helpers';

function registerGenAI(): void {
  _registerComponent(
    new Component(
      GENAI_TYPE,
      (container, options) => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const auth = container.getProvider('auth-internal');
        const appCheckProvider = container.getProvider('app-check-internal');

        let instanceIdentifier: InstanceIdentifier;
        if (options.instanceIdentifier) {
          instanceIdentifier = decodeInstanceIdentifier(options.instanceIdentifier);
        } else {
          instanceIdentifier = DEFAULT_INSTANCE_IDENTIFER;
        }

        const backend = instanceIdentifier;

        return new GenAIService(
          app,
          backend,
          auth,
          appCheckProvider,
        );
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

registerGenAI();

export * from './api';
export * from './public-types';
