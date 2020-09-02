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

import { _registerComponent, _getProvider } from '@firebase/app-exp';
import { _FirebaseService } from '@firebase/app-types-exp';
import {
  Component,
  ComponentType,
  InstanceFactory,
  ComponentContainer
} from '@firebase/component';
import { getId, getToken } from '../api/index';
import { _FirebaseInstallationsInternal } from '@firebase/installations-types-exp';
import { FirebaseInstallationsImpl } from '../interfaces/installation-impl';
import { extractAppConfig } from '../helpers/extract-app-config';

const INSTALLATIONS_NAME = 'installations-exp';
const INSTALLATIONS_NAME_INTERNAL = 'installations-exp-internal';

const publicFactory: InstanceFactory<'installations-exp'> = (
  container: ComponentContainer
) => {
  const app = container.getProvider('app-exp').getImmediate();
  // Throws if app isn't configured properly.
  const appConfig = extractAppConfig(app);
  const platformLoggerProvider = _getProvider(app, 'platform-logger');

  const installationsImpl: FirebaseInstallationsImpl = {
    app,
    appConfig,
    platformLoggerProvider,
    _delete: () => Promise.resolve()
  };
  return installationsImpl;
};

const internalFactory: InstanceFactory<'installations-exp-internal'> = (
  container: ComponentContainer
) => {
  const app = container.getProvider('app-exp').getImmediate();
  // Internal FIS instance relies on public FIS instance.
  const installations = _getProvider(app, INSTALLATIONS_NAME).getImmediate();

  const installationsInternal: _FirebaseInstallationsInternal = {
    getId: () => getId(installations),
    getToken: (forceRefresh?: boolean) => getToken(installations, forceRefresh)
  };
  return installationsInternal;
};

export function registerInstallations(): void {
  _registerComponent(
    new Component(INSTALLATIONS_NAME, publicFactory, ComponentType.PUBLIC)
  );
  _registerComponent(
    new Component(
      INSTALLATIONS_NAME_INTERNAL,
      internalFactory,
      ComponentType.PRIVATE
    )
  );
}
