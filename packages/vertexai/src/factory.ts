/**
 * @license
 * Copyright 2024 Google LLC
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

import { FirebaseApp, _FirebaseService } from '@firebase/app';
import { Vertex, VertexOptions } from './public-types';
import {
  AppCheckInternalComponentName,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import { Provider } from '@firebase/component';

export function factory(
  app: FirebaseApp,
  appCheckProvider?: Provider<AppCheckInternalComponentName>,
  options?: VertexOptions
): VertexService {
  return new VertexService(app, appCheckProvider, options);
}

export class VertexService implements Vertex, _FirebaseService {
  appCheck: FirebaseAppCheckInternal | null;

  constructor(
    public app: FirebaseApp,
    appCheckProvider?: Provider<AppCheckInternalComponentName>,
    public options?: VertexOptions
  ) {
    const appCheck = appCheckProvider?.getImmediate({ optional: true });
    this.appCheck = appCheck || null;
    // This needs to go into the url
    if (this.options?.region) {
      console.log(this.options?.region);
    }
  }

  _delete(): Promise<void> {
    return Promise.resolve();
  }
}
