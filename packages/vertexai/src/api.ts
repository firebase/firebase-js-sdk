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
import { VertexAIService } from './service';
import { VertexAI, VertexAIOptions } from './public-types';
import {
  ImagenModelParams,
  ModelParams,
  RequestOptions,
  VertexAIErrorCode
} from './types';
import { VertexAIError } from './errors';
import { VertexAIModel, GenerativeModel, ImagenModel } from './models';

export { ChatSession } from './methods/chat-session';
export * from './requests/schema-builder';
export { ImagenImageFormat } from './requests/imagen-image-format';
export { VertexAIModel, GenerativeModel, ImagenModel };
export { VertexAIError };

declare module '@firebase/component' {
  interface NameServiceMapping {
    [VERTEX_TYPE]: VertexAIService;
  }
}

/**
 * Returns a <code>{@link VertexAI}</code> instance for the given app.
 *
 * @public
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 */
export function getVertexAI(
  app: FirebaseApp = getApp(),
  options?: VertexAIOptions
): VertexAI {
  app = getModularInstance(app);
  // Dependencies
  const vertexProvider: Provider<'vertexAI'> = _getProvider(app, VERTEX_TYPE);

  return vertexProvider.getImmediate({
    identifier: options?.location || DEFAULT_LOCATION
  });
}

/**
 * Returns a <code>{@link GenerativeModel}</code> class with methods for inference
 * and other functionality.
 *
 * @public
 */
export function getGenerativeModel(
  vertexAI: VertexAI,
  modelParams: ModelParams,
  requestOptions?: RequestOptions
): GenerativeModel {
  if (!modelParams.model) {
    throw new VertexAIError(
      VertexAIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })`
    );
  }
  return new GenerativeModel(vertexAI, modelParams, requestOptions);
}

/**
 * Returns an <code>{@link ImagenModel}</code> class with methods for using Imagen.
 *
 * Only Imagen 3 models (named `imagen-3.0-*`) are supported.
 *
 * @beta
 * For Vertex AI in Firebase, image generation using Imagen 3 models is in Public Preview, which
 * means that the feature is not subject to any SLA or deprecation policy and could change in
 * backwards-incompatible ways.
 *
 * @param vertexAI - An instance of the Vertex AI in Firebase SDK.
 * @param modelParams - Parameters to use when making Imagen requests.
 * @param requestOptions - Additional options to use when making requests.
 *
 * @throws If the `apiKey` or `projectId` fields are missing in your
 * Firebase config.
 */
export function getImagenModel(
  vertexAI: VertexAI,
  modelParams: ImagenModelParams,
  requestOptions?: RequestOptions
): ImagenModel {
  if (!modelParams.model) {
    throw new VertexAIError(
      VertexAIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getImagenModel({ model: 'my-model-name' })`
    );
  }
  return new ImagenModel(vertexAI, modelParams, requestOptions);
}
