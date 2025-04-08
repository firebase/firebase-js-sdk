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
import { DEFAULT_LOCATION, GENAI_TYPE } from './constants';
import { GenAIService } from './service';
import {
  BackendType,
  GenAI,
  GenAIOptions,
  GoogleAIBackend,
  VertexAI,
  VertexAIBackend,
  VertexAIOptions
} from './public-types';
import {
  ImagenModelParams,
  ModelParams,
  RequestOptions,
  GenAIErrorCode
} from './types';
import { GenAIError } from './errors';
import { GenAIModel, GenerativeModel, ImagenModel } from './models';
import { encodeInstanceIdentifier } from './helpers';

export { ChatSession } from './methods/chat-session';
export * from './requests/schema-builder';
export { ImagenImageFormat } from './requests/imagen-image-format';
export { GenAIModel, GenerativeModel, ImagenModel, GenAIError };

export { GenAIErrorCode as VertexAIErrorCode };

/**
 * Base class for Vertex AI in Firebase model APIs.
 *
 * For more information, refer to the documentation for the new {@link GenAIModel}.
 *
 * @public
 */
export const VertexAIModel = GenAIModel;

/**
 * Error class for the Vertex AI in Firebase SDK.
 *
 * For more information, refer to the documentation for the new {@link GenAIError}.
 *
 * @public
 */
export const VertexAIError = GenAIError;

declare module '@firebase/component' {
  interface NameServiceMapping {
    [GENAI_TYPE]: GenAIService;
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
  const genAIProvider: Provider<'genAI'> = _getProvider(app, GENAI_TYPE);

  const identifier = encodeInstanceIdentifier({
    backendType: BackendType.VERTEX_AI,
    location: options?.location ?? DEFAULT_LOCATION
  });
  return genAIProvider.getImmediate({
    identifier
  });
}

/**
 * Returns the default {@link GenAI} instance that is associated with the provided
 * {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new instance with the
 * default settings.
 *
 * @example
 * ```javascript
 * const genAI = getGenAI(app);
 * ```
 *
 * @example
 * ```javascript
 * // Get a GenAI instance configured to use Vertex AI.
 * const genAI = getGenAI(app, { backend: vertexAIBackend() });
 * ```
 *
 * @example
 * ```javascript
 * // Get a GenAI instance configured to use Google AI.
 * const genAI = getGenAI(app, { backend: vertexAIBackend() });
 * ```
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @param options - {@link GenAIOptions} that configure the GenAI instance.
 * @returns The default {@link GenAI} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function getGenAI(
  app: FirebaseApp = getApp(),
  options: GenAIOptions = { backend: googleAIBackend() }
): GenAI {
  app = getModularInstance(app);
  // Dependencies
  const genAIProvider: Provider<'genAI'> = _getProvider(app, GENAI_TYPE);

  const identifier = encodeInstanceIdentifier(options.backend);
  return genAIProvider.getImmediate({
    identifier
  });
}

/**
 * Creates a {@link Backend} instance configured to use Google AI.
 *
 * @returns A {@link GoogleAIBackend} object.
 *
 * @public
 */
export function googleAIBackend(): GoogleAIBackend {
  const backend: GoogleAIBackend = {
    backendType: BackendType.GOOGLE_AI
  };

  return backend;
}

/**
 * Creates a {@link Backend} instance configured to use Vertex AI.
 *
 * @param location - The region identifier, defaulting to `us-central1`;
 * see {@link https://firebase.google.com/docs/vertex-ai/locations?platform=ios#available-locations | Vertex AI locations}
 * for a list of supported locations.
 * @returns A {@link VertexAIBackend} object.
 *
 * @public
 */
export function vertexAIBackend(location?: string): VertexAIBackend {
  const backend: VertexAIBackend = {
    backendType: BackendType.VERTEX_AI,
    location: location ?? DEFAULT_LOCATION
  };

  return backend;
}

/**
 * Returns a <code>{@link GenerativeModel} class with methods for inference
 * and other functionality.
 *
 * @public
 */
export function getGenerativeModel(
  genAI: GenAI,
  modelParams: ModelParams,
  requestOptions?: RequestOptions
): GenerativeModel {
  if (!modelParams.model) {
    throw new GenAIError(
      GenAIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })`
    );
  }
  return new GenerativeModel(genAI, modelParams, requestOptions);
}

/**
 * Returns an <code>{@link ImagenModel}</code> class with methods for using Imagen.
 *
 * Only Imagen 3 models (named `imagen-3.0-*`) are supported.
 *
 * @param genAI - A {@link GenAI} instance.
 * @param modelParams - Parameters to use when making Imagen requests.
 * @param requestOptions - Additional options to use when making requests.
 *
 * @throws If the `apiKey` or `projectId` fields are missing in your
 * Firebase config.
 *
 * @beta
 */
export function getImagenModel(
  genAI: GenAI,
  modelParams: ImagenModelParams,
  requestOptions?: RequestOptions
): ImagenModel {
  if (!modelParams.model) {
    throw new GenAIError(
      GenAIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getImagenModel({ model: 'my-model-name' })`
    );
  }
  return new ImagenModel(genAI, modelParams, requestOptions);
}
