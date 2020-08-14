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

import { _registerComponent, registerVersion } from '@firebase/app-exp';
import * as externs from '@firebase/auth-types-exp';
import { Component, ComponentType } from '@firebase/component';

import { version } from '../../../package.json';
import { AuthErrorCode } from '../errors';
import { assert } from '../util/assert';
import { _getClientVersion, ClientPlatform } from '../util/version';
import {
  AuthImpl,
  DEFAULT_API_HOST,
  DEFAULT_API_SCHEME,
  DEFAULT_TOKEN_API_HOST
} from './auth_impl';

function getVersionForPlatform(
  clientPlatform: ClientPlatform
): string | undefined {
  switch (clientPlatform) {
    case ClientPlatform.NODE:
      return 'node';
    case ClientPlatform.REACT_NATIVE:
      return 'rn';
    case ClientPlatform.WORKER:
      return 'webworker';
    default:
      return undefined;
  }
}

export function registerAuth(clientPlatform: ClientPlatform): void {
  _registerComponent(
    new Component(
      'auth-exp',
      container => {
        const app = container.getProvider('app-exp').getImmediate()!;
        const { apiKey, authDomain } = app.options;
        return (app => {
          assert(apiKey, AuthErrorCode.INVALID_API_KEY, { appName: app.name });
          const config: externs.Config = {
            apiKey,
            authDomain,
            apiHost: DEFAULT_API_HOST,
            tokenApiHost: DEFAULT_TOKEN_API_HOST,
            apiScheme: DEFAULT_API_SCHEME,
            sdkClientVersion: _getClientVersion(clientPlatform)
          };
          return new AuthImpl(app, config);
        })(app);
      },
      ComponentType.PUBLIC
    )
  );
  registerVersion('auth-exp', version, getVersionForPlatform(clientPlatform));
}
