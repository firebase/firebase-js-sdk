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
import { AI_TYPE } from './constants';
import { AIService } from './service';
import { AI, AIOptions, VertexAI, VertexAIOptions } from './public-types';
import {
  ImagenModelParams,
  HybridParams,
  ModelParams,
  RequestOptions,
  AIErrorCode
} from './types';
import { AIError } from './errors';
import { AIModel, GenerativeModel, ImagenModel } from './models';
import { encodeInstanceIdentifier } from './helpers';
import { GoogleAIBackend, VertexAIBackend } from './backend';
import { ChromeAdapter } from './methods/chrome-adapter';
import { LanguageModel } from './types/language-model';

export { ChatSession } from './methods/chat-session';
export * from './requests/schema-builder';
export { ImagenImageFormat } from './requests/imagen-image-format';
export { AIModel, GenerativeModel, ImagenModel, AIError };
export { Backend, VertexAIBackend, GoogleAIBackend } from './backend';

export { AIErrorCode as VertexAIErrorCode };

/**
 * @deprecated Use the new {@link AIModel} instead. The Vertex AI in Firebase SDK has been
 * replaced with the Firebase AI SDK to accommodate the evolving set of supported features and
 * services. For migration details, see the {@link https://firebase.google.com/docs/vertex-ai/migrate-to-latest-sdk | migration guide}.
 *
 * Base class for Firebase AI model APIs.
 *
 * @public
 */
export const VertexAIModel = AIModel;

/**
 * @deprecated Use the new {@link AIError} instead. The Vertex AI in Firebase SDK has been
 * replaced with the Firebase AI SDK to accommodate the evolving set of supported features and
 * services. For migration details, see the {@link https://firebase.google.com/docs/vertex-ai/migrate-to-latest-sdk | migration guide}.
 *
 * Error class for the Firebase AI SDK.
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
 * @deprecated Use the new {@link getAI | getAI()} instead. The Vertex AI in Firebase SDK has been
 * replaced with the Firebase AI SDK to accommodate the evolving set of supported features and
 * services. For migration details, see the {@link https://firebase.google.com/docs/vertex-ai/migrate-to-latest-sdk | migration guide}.
 *
 * Returns a {@link VertexAI} instance for the given app, configured to use the
 * Vertex AI Gemini API. This instance will be
 * configured to use the Vertex AI Gemini API.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @param options - Options to configure the Vertex AI instance, including the location.
 *
 * @public
 */
export function getVertexAI(
  app: FirebaseApp = getApp(),
  options?: VertexAIOptions
): VertexAI {
  app = getModularInstance(app);
  // Dependencies
  const AIProvider: Provider<'AI'> = _getProvider(app, AI_TYPE);

  const backend = new VertexAIBackend(options?.location);
  const identifier = encodeInstanceIdentifier(backend);
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
 * // Get an AI instance configured to use the Gemini Developer API (via Google AI).
 * const ai = getAI(app, { backend: new GoogleAIBackend() });
 * ```
 *
 * @example
 * ```javascript
 * // Get an AI instance configured to use the Vertex AI Gemini API.
 * const ai = getAI(app, { backend: new VertexAIBackend() });
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
  options: AIOptions = { backend: new GoogleAIBackend() }
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
 * Returns a {@link GenerativeModel} class with methods for inference
 * and other functionality.
 *
 * @public
 */
export function getGenerativeModel(
  ai: AI,
  modelParams: ModelParams | HybridParams,
  requestOptions?: RequestOptions
): GenerativeModel {
  // Uses the existence of HybridParams.mode to clarify the type of the modelParams input.
  const hybridParams = modelParams as HybridParams;
  let inCloudParams: ModelParams;
  if (hybridParams.mode) {
    inCloudParams = hybridParams.inCloudParams || {
      model: GenerativeModel.DEFAULT_HYBRID_IN_CLOUD_MODEL
    };
  } else {
    inCloudParams = modelParams as ModelParams;
  }

  if (!inCloudParams.model) {
    throw new AIError(
      AIErrorCode.NO_MODEL,
      `Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })`
    );
  }
  return new GenerativeModel(
    ai,
    inCloudParams,
    new ChromeAdapter(
      window.LanguageModel as LanguageModel,
      hybridParams.mode,
      hybridParams.onDeviceParams
    ),
    requestOptions
  );
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
