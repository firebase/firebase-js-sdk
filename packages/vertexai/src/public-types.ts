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

import { FirebaseApp } from '@firebase/app';

export * from './types';

/**
 * An instance of the Vertex AI in Firebase SDK.
 *
 * For more information, refer to the documentation for the new {@link GenAI}.
 *
 * @public
 */
export type VertexAI = GenAI;

/**
 * Options when initializing the Vertex AI in Firebase SDK.
 *
 * @public
 */
export interface VertexAIOptions {
  location?: string;
}

/**
 * An instance of the Firebase GenAI SDK.
 *
 * Do not create this instance directly. Instead, use {@link getGenAI | getGenAI()}.
 *
 * @public
 */
export interface GenAI {
  /**
   * The {@link @firebase/app#FirebaseApp} this {@link GenAI} instance is associated with.
   */
  app: FirebaseApp;
  /**
   * A {@link Backend} instance that specifies the backend configuration.
   */
  backend: Backend;
  /**
   * The location configured for this GenAI service instance, relevant for Vertex AI backends.
   *
   * @deprecated use `GenAI.backend.location` instead.
   */
  location: string;
}

/**
 * Union type representing the backend configuration for the GenAI service.
 * This can be either a {@link GoogleAIBackend} or a
 * {@link VertexAIBackend} configuration object.
 *
 * Create instances using {@link googleAIBackend | googleAIBackend() } or
 * {@link vertexAIBackend | vertexAIBackend() }.
 *
 * @public
 */
export type Backend = GoogleAIBackend | VertexAIBackend;

/**
 * Represents the configuration object for the Google AI backend.
 * Use this with {@link GenAIOptions} when initializing the service with
 * {@link getGenAI | getGenAI()}.
 * Create an instance using {@link googleAIBackend | googleAIBackend()}.
 *
 * @public
 */
export type GoogleAIBackend = {
  /**
   * Specifies the backend type as Google AI.
   */
  backendType: typeof BackendType.GOOGLE_AI;
};

/**
 * Represents the configuration object for the Vertex AI backend.
 * Use this with {@link GenAIOptions} when initializing the server with
 * {@link getGenAI | getGenAI() }.
 * Create an instance using {@link vertexAIBackend | vertexAIBackend() } function.
 *
 * @public
 */
export type VertexAIBackend = {
  /**
   * Specifies the backend type as Vertex AI.
   */
  backendType: typeof BackendType.VERTEX_AI;
  /**
   * The region identifier, defaulting to `us-central1`; see {@link https://firebase.google.com/docs/vertex-ai/locations?platform=ios#available-locations | Vertex AI locations}
   * for a list of supported locations.
   */
  location: string;
};

/**
 * An enum-like object containing constants that represent the supported backends
 * for the Firebase GenAI SDK.
 *
 * These values are assigned to the `backendType` property within the specific backend
 * configuration objects ({@link GoogleAIBackend} or {@link VertexAIBackend}) to identify
 * which service to target.
 *
 * @public
 */
export const BackendType = {
  /**
   * Identifies the Vertex AI backend service provided through Google Cloud.
   * Use this constant when creating a {@link VertexAIBackend} configuration.
   */
  VERTEX_AI: 'VERTEX_AI',

  /**
   * Identifies the Google AI backend service (often associated with models available
   * through Google AI Studio, like Gemini).
   * Use this constant when creating a {@link GoogleAIBackend} configuration.
   */
  GOOGLE_AI: 'GOOGLE_AI'
} as const; // Using 'as const' makes the string values literal types

/**
 * Type alias representing valid backend types.
 * It can be either `'VERTEX_AI'` or `'GOOGLE_AI'`.
 *
 * @public
 */
export type BackendType = (typeof BackendType)[keyof typeof BackendType];

/**
 * Options interface for initializing the GenAI service using {@link getGenAI | getGenAI()}.
 *
 * @public
 */
export interface GenAIOptions {
  /**
   * The backend configuration to use for the GenAI service instance.
   * Use {@link googleAIBackend | googleAIBackend()} or
   * {@link vertexAIBackend | vertexAIBackend() } to create this configuration.
   */
  backend: Backend;
}
