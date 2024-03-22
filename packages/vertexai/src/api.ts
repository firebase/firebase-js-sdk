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

import { FirebaseApp, getApp, _getProvider } from '@firebase/app';
import { Provider } from '@firebase/component';
import { getModularInstance } from '@firebase/util';
import { VERTEX_TYPE } from './constants';
import { VertexService } from './factory';
import { Vertex } from './public-types';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [VERTEX_TYPE]: VertexService;
  }
}

/**
 * Returns an {@link Vertex} instance for the given app.
 *
 * @public
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 */
export function getVertex(app: FirebaseApp = getApp()): Vertex {
  app = getModularInstance(app);
  // Dependencies
  const vertexProvider: Provider<'vertex'> = _getProvider(app, VERTEX_TYPE);

  if (vertexProvider.isInitialized()) {
    return vertexProvider.getImmediate();
  }

  return vertexProvider.initialize();
}

export function getGenerativeModel(vertex: Vertex): GenerativeModel {
  return new GenerativeModel(vertex, {});
}

// Just a stub
class GenerativeModel {
  private _apiKey?: string;
  constructor(vertex: Vertex, modelParams: {}) {
    if (!vertex.app.options.apiKey) {
      // throw error
    } else {
      this._apiKey = vertex.app.options.apiKey;
      //TODO: remove when we use this
      console.log(this._apiKey);
    }
    //TODO: do something with modelParams
    console.log(modelParams);
  }
}

//TODO: add all top-level exportable methods and classes
