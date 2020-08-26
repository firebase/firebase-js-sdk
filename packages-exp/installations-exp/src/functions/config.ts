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

import { _registerComponent } from '@firebase/app-exp';
import { _FirebaseService } from '@firebase/app-types-exp';
import { Component, ComponentType } from '@firebase/component';
import { getInstallations, deleteInstallations } from '../api/index';

export function registerInstallations(): void {
  const installationsName = 'installations-exp';

  _registerComponent(
    new Component(
      installationsName,
      container => {
        const app = container.getProvider('app-exp').getImmediate();

        // Throws if app isn't configured properly.
        const installations = getInstallations(app);
        const installationsService: _FirebaseService = {
          app,
          delete: () => deleteInstallations(installations)
        };

        return installationsService;
      },
      ComponentType.PUBLIC
    )
  );
}
