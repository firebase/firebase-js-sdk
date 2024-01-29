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

import { _registerComponent, registerVersion } from '@firebase/app';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';

import { name, version } from '../../../package.json';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';
import { _getClientVersion, ClientPlatform } from '../util/version';
import { _castAuth, AuthImpl, DefaultConfig } from './auth_impl';
import { AuthInterop } from './firebase_internal';
import { ConfigInternal } from '../../model/auth';
import { Dependencies } from '../../model/public_types';
import { _initializeAuthInstance } from './initialize';

export const enum _ComponentName {
  AUTH = 'auth',
  AUTH_INTERNAL = 'auth-internal'
}

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
    case ClientPlatform.CORDOVA:
      return 'cordova';
    case ClientPlatform.WEB_EXTENSION:
      return 'web-extension';
    default:
      return undefined;
  }
}

/** @internal */
export function registerAuth(clientPlatform: ClientPlatform): void {
  _registerComponent(
    new Component(
      _ComponentName.AUTH,
      (container, { options: deps }: { options?: Dependencies }) => {
        const app = container.getProvider('app').getImmediate()!;
        const heartbeatServiceProvider =
          container.getProvider<'heartbeat'>('heartbeat');
        const appCheckServiceProvider =
          container.getProvider<'app-check-internal'>('app-check-internal');
        const { apiKey, authDomain } = app.options;

        _assert(
          apiKey && !apiKey.includes(':'),
          AuthErrorCode.INVALID_API_KEY,
          { appName: app.name }
        );

        const config: ConfigInternal = {
          apiKey,
          authDomain,
          clientPlatform,
          apiHost: DefaultConfig.API_HOST,
          tokenApiHost: DefaultConfig.TOKEN_API_HOST,
          apiScheme: DefaultConfig.API_SCHEME,
          sdkClientVersion: _getClientVersion(clientPlatform)
        };

        const authInstance = new AuthImpl(
          app,
          heartbeatServiceProvider,
          appCheckServiceProvider,
          config
        );
        _initializeAuthInstance(authInstance, deps);

        return authInstance;
      },
      ComponentType.PUBLIC
    )
      /**
       * Auth can only be initialized by explicitly calling getAuth() or initializeAuth()
       * For why we do this, See go/firebase-next-auth-init
       */
      .setInstantiationMode(InstantiationMode.EXPLICIT)
      /**
       * Because all firebase products that depend on auth depend on auth-internal directly,
       * we need to initialize auth-internal after auth is initialized to make it available to other firebase products.
       */
      .setInstanceCreatedCallback(
        (container, _instanceIdentifier, _instance) => {
          const authInternalProvider = container.getProvider(
            _ComponentName.AUTH_INTERNAL
          );
          authInternalProvider.initialize();
        }
      )
  );

  _registerComponent(
    new Component(
      _ComponentName.AUTH_INTERNAL,
      container => {
        const auth = _castAuth(
          container.getProvider(_ComponentName.AUTH).getImmediate()!
        );
        return (auth => new AuthInterop(auth))(auth);
      },
      ComponentType.PRIVATE
    ).setInstantiationMode(InstantiationMode.EXPLICIT)
  );

  registerVersion(name, version, getVersionForPlatform(clientPlatform));
  // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
