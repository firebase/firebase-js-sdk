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
import { Backend } from './backend';

export * from './types';

/**
 * An instance of the Firebase AI SDK.
 *
 * For more information, refer to the documentation for the new {@link AI}.
 *
 * @public
 */
export type VertexAI = AI;

/**
 * Options when initializing the Firebase AI SDK.
 *
 * @public
 */
export interface VertexAIOptions {
  location?: string;
}

/**
 * An instance of the Firebase AI SDK.
 *
 * Do not create this instance directly. Instead, use {@link getAI | getAI()}.
 *
 * @public
 */
export interface AI {
  /**
   * The {@link @firebase/app#FirebaseApp} this {@link AI} instance is associated with.
   */
  app: FirebaseApp;
  /**
   * A {@link Backend} instance that specifies the backend configuration.
   */
  backend: Backend;
  /**
   * The location configured for this AI service instance, relevant for Vertex AI backends.
   *
   * @deprecated use `AI.backend.location` instead.
   */
  location: string;
}

/**
 * An enum-like object containing constants that represent the supported backends
 * for the Firebase AI SDK.
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
 * Options interface for initializing the AI service using {@link getAI | getAI()}.
 *
 * @public
 */
export interface AIOptions {
  /**
   * The backend configuration to use for the AI service instance.
   */
  backend: Backend;
}
