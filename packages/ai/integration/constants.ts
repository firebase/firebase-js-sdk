/**
 * @license
 * Copyright 2025 Google LLC
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

import { initializeApp } from '@firebase/app';
import {
  AI,
  Backend,
  BackendType,
  GoogleAIBackend,
  VertexAIBackend,
  getAI
} from '../src';
import { FIREBASE_CONFIG } from './firebase-config';

const app = initializeApp(FIREBASE_CONFIG);

/**
 * Test config that all tests will be ran against.
 */
export type TestConfig = Readonly<{
  ai: AI;
  model: string;
  /** This will be used to output the test config at runtime */
  toString: () => string;
}>;

function formatConfigAsString(config: { ai: AI; model: string }): string {
  return `${backendNames.get(config.ai.backend.backendType)} ${config.model}`;
}

const backends: readonly Backend[] = [
  new GoogleAIBackend(),
  new VertexAIBackend('global')
];

const backendNames: Map<BackendType, string> = new Map([
  [BackendType.GOOGLE_AI, 'Google AI'],
  [BackendType.VERTEX_AI, 'Vertex AI']
]);

const modelNames: readonly string[] = [
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-pro-preview'
];

// The Live API requires a different set of models, and they're different for each backend.
const liveModelNames: Map<BackendType, string[]> = new Map([
  [BackendType.GOOGLE_AI, ['gemini-live-2.5-flash-preview']],
  [BackendType.VERTEX_AI, ['gemini-2.0-flash-live-preview-04-09']]
]);

/**
 * Array of test configurations that is iterated over to get full coverage
 * of backends and models. Contains all combinations of backends and models.
 */
export const testConfigs: readonly TestConfig[] = backends.flatMap(backend => {
  return modelNames.map(modelName => {
    const ai = getAI(app, { backend });
    return {
      ai: getAI(app, { backend }),
      model: modelName,
      toString: () => formatConfigAsString({ ai, model: modelName })
    };
  });
});

/**
 * Test configurations used for the Live API integration tests.
 */
export const liveTestConfigs: readonly TestConfig[] = backends.flatMap(
  backend => {
    const testConfigs: TestConfig[] = [];
    liveModelNames.get(backend.backendType)!.forEach(modelName => {
      const ai = getAI(app, { backend });
      testConfigs.push({
        ai,
        model: modelName,
        toString: () => formatConfigAsString({ ai, model: modelName })
      });
    });

    return testConfigs;
  }
);

/**
 * Test configurations used for server prompt templates integration tests.
 * Server prompt templates don't define the model name from the client, so these test configs
 * do not define a model string.
 * These tests should only run once per backend, rather than once per backend *per model*.
 */
export const promptTemplatesTestConfigs: readonly TestConfig[] =
  backends.flatMap(backend => {
    const ai = getAI(app, { backend });
    return {
      ai,
      model: '', // Unused by prompt templates tests
      toString: () => formatConfigAsString({ ai, model: '' }).trim()
    };
  });

export const TINY_IMG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=';
export const IMAGE_MIME_TYPE = 'image/png';
export const TINY_MP3_BASE64 =
  'SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAwAAAAAAAAAAAAAAD/+0DAAAAAAAAAAAAAAAAAAAAAAABJbmZvAAAADwAAAAUAAAK+AGhoaGhoaGhoaGhoaGhoaGhoaGiOjo6Ojo6Ojo6Ojo6Ojo6Ojo6OjrS0tLS0tLS0tLS0tLS0tLS0tLS02tra2tra2tra2tra2tra2tra2tr//////////////////////////wAAAABMYXZjNjEuMTkAAAAAAAAAAAAAAAAkAwYAAAAAAAACvhC6DYoAAAAAAP/7EMQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxCmDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xDEUwPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMR8g8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxKYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
export const AUDIO_MIME_TYPE = 'audio/mpeg';

// Token counts are only expected to differ by at most this number of tokens.
// Set to 1 for whitespace that is not always present.
export const TOKEN_COUNT_DELTA = 1;
