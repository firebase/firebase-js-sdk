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

export type InstanceIdentifier = Backend;

export type VertexAI = GenAI;

/**
 * Options when initializing the Vertex AI in Firebase SDK.
 * @public
 */
export interface VertexAIOptions {
  location?: string;
}

/**
 * An instance of the Firebase GenAI SDK.
 * @public
 */
export interface GenAI {
  /**
   * The {@link @firebase/app#FirebaseApp} this <code>{@link GenAI}</code> instance is associated with.
   */
  app: FirebaseApp;
  backend: Backend;
  /**
   * @deprecated This is here to maintain backwards-compatibility. Use `GenAI.backend.location` instead.
   */
  location: string;
}


export type Backend = GoogleAIBackend | VertexAIBackend;

export type GoogleAIBackend = {
  backendType: typeof BackendType.GOOGLE_AI;
}

export type VertexAIBackend = {
  backendType: typeof BackendType.VERTEX_AI;
  location: string;
}

export const BackendType = {
  VERTEX_AI: "VERTEX_AI",
  GOOGLE_AI: "GOOGLE_AI"
} as const;

export type BackendType = typeof BackendType[keyof typeof BackendType];

export interface GenAIOptions {
  backend: Backend;
}
