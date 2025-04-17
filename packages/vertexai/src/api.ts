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
import { DEFAULT_LOCATION, AI_TYPE } from './constants';
import { AIService } from './service';
import {
  BackendType,
  AI,
  AIOptions,
  GoogleAIBackend,
  VertexAI,
  VertexAIBackend,
  VertexAIOptions
} from './public-types';
import {
  ImagenModelParams,
  ModelParams,
  RequestOptions,
  AIErrorCode
} from './types';
import { AIError } from './errors';
import { AIModel, GenerativeModel, ImagenModel } from './models';
import { encodeInstanceIdentifier } from './helpers';

export { ChatSession } from './methods/chat-session';
export * from './requests/schema-builder';
export { ImagenImageFormat } from './requests/imagen-image-format';
export { AIModel, GenerativeModel, ImagenModel, AIError };

export { AIErrorCode as VertexAIErrorCode };

/**
 * Base class for Firebase AI model APIs.
 *
 * For more information, refer to the documentation for the new {@link AIModel}.
 *
 * @public
 */
export const VertexAIModel = AIModel;

/**
 * Error class for the Firebase AI SDK.
 *
 * For more information, refer to the documentation for the new {@link AIError}.
 *
 * @public
 */
export const VertexAIError = AIError;

declare module '@firebase/component' {
  interface NameServiceMapping {
    [AI_TYPE]: AIService;
  }
}

/**
 * It is recommended to use the new {@link getAI | getAI()}.
 * 
 * Returns a {@link VertexAI} instance for the given app.
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
  const AIProvider: Provider<'AI'> = _getProvider(app, AI_TYPE);

  const identifier = encodeInstanceIdentifier({
    backendType: BackendType.VERTEX_AI,
    location: options?.location ?? DEFAULT_LOCATION
  });
  return AIProvider.getImmediate({
    identifier
  });
}

/**
 * Returns the default {@link AI} instance that is associated with the provided
 * {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new instance with the
 * default settings.
 *
 * @example
 * ```javascript
 * const ai = getAI(app);
 * ```
 *
 * @example
 * ```javascript
 * // Get an AI instance configured to use Google AI.
 * const ai = getAI(app, { backend: googleAIBackend() });
 * ```
 *
 * @example
 * ```javascript
 * // Get an AI instance configured to use Vertex AI.
 * const ai = getAI(app, { backend: vertexAIBackend() });
 * ```
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @param options - {@link AIOptions} that configure the AI instance.
 * @returns The default {@link AI} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function getAI(
  app: FirebaseApp = getApp(),
  options: AIOptions = { backend: googleAIBackend() }
): AI {
  app = getModularInstance(app);
  // Dependencies
  const AIProvider: Provider<'AI'> = _getProvider(app, AI_TYPE);

  const identifier = encodeInstanceIdentifier(options.backend);
  return AIProvider.getImmediate({
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
 * Returns a {@link GenerativeModel} class with methods for inference
 * and other functionality.
 *
 * @public
 */
export function getGenerativeModel(
  ai: AI,
  modelParams: ModelParams,
  requestOptions?: RequestOptions
): GenerativeModel {
  if (!modelParams.model) {
    throw new AIError(
      AIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })`
    );
  }
  return new GenerativeModel(ai, modelParams, requestOptions);
}

/**
 * Returns an {@link ImagenModel} class with methods for using Imagen.
 *
 * Only Imagen 3 models (named `imagen-3.0-*`) are supported.
 *
 * @param ai - An {@link AI} instance.
 * @param modelParams - Parameters to use when making Imagen requests.
 * @param requestOptions - Additional options to use when making requests.
 *
 * @throws If the `apiKey` or `projectId` fields are missing in your
 * Firebase config.
 *
 * @beta
 */
export function getImagenModel(
  ai: AI,
  modelParams: ImagenModelParams,
  requestOptions?: RequestOptions
): ImagenModel {
  if (!modelParams.model) {
    throw new AIError(
      AIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getImagenModel({ model: 'my-model-name' })`
    );
  }
  return new ImagenModel(ai, modelParams, requestOptions);
}
