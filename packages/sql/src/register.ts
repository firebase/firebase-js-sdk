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

import {
  _registerComponent,
  registerVersion,
  SDK_VERSION
} from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';

import { name, version } from '../package.json';

import { FirebaseSql, getInstanceIdentifier } from './api/FirebaseSql';
import { FirebaseSqlErrorCategory, Code, FirebaseSqlError } from './core/error';
import { SqlServiceSettings } from './core/settings';
import { setSDKVersion } from './core/version';
import { FIREBASE_SQL_COMPONENT_NAME } from './util/constants';

/**
 * Registers the `@firebase/sql` service component and SDK version with Firebase App.
 *
 * @param variant - Optional SDK build variant identifier.
 * @internal
 */
export function registerSql(variant?: string): void {
  setSDKVersion(SDK_VERSION);
  _registerComponent(
    new Component(
      FIREBASE_SQL_COMPONENT_NAME,
      (container, { instanceIdentifier, options }) => {
        const settings = options as SqlServiceSettings;
        const app = container.getProvider('app').getImmediate()!;
        const authProvider = container.getProvider('auth-internal');
        const appCheckProvider = container.getProvider('app-check-internal');
        if (
          typeof app.options?.projectId !== 'string' ||
          app.options.projectId.length === 0
        ) {
          throw new FirebaseSqlError(
            Code.INVALID_ARGUMENT,
            'Project ID must be provided in FirebaseApp options. Did you pass in a proper projectId to initializeApp?',
            FirebaseSqlErrorCategory.SQL_CLIENT
          );
        }
        const id =
          instanceIdentifier ??
          getInstanceIdentifier(settings, app.options.projectId);
        return new FirebaseSql(
          app,
          settings,
          id,
          authProvider,
          appCheckProvider
        );
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );
  registerVersion(name, version, variant);
  registerVersion(name, version, '__BUILD_TARGET__');
}
