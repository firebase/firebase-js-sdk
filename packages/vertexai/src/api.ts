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
import { DEFAULT_LOCATION, VERTEX_TYPE } from './constants';
import { VertexService } from './factory';
import { Vertex, VertexOptions } from './public-types';
import { ERROR_FACTORY, VertexError } from './errors';
import { ModelParams, RequestOptions } from './types';
import { GenerativeModel } from './models/generative-model';

export { ChatSession } from './methods/chat-session';

export { GenerativeModel };

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
export function getVertex(
  app: FirebaseApp = getApp(),
  options?: VertexOptions
): Vertex {
  app = getModularInstance(app);
  // Dependencies
  const vertexProvider: Provider<'vertex'> = _getProvider(app, VERTEX_TYPE);

  return vertexProvider.getImmediate({
    identifier: options?.location || DEFAULT_LOCATION
  });
}

export function getGenerativeModel(
  vertex: Vertex,
  modelParams: ModelParams,
  requestOptions?: RequestOptions
): GenerativeModel {
  if (!modelParams.model) {
    throw ERROR_FACTORY.create(VertexError.NO_MODEL);
  }
  return new GenerativeModel(vertex, modelParams, requestOptions);
}
