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

import { ErrorFactory, ErrorMap } from '@firebase/util';
import { GenerateContentResponse } from './types';

export const enum VertexError {
  FETCH_ERROR = 'fetch-error',
  INVALID_CONTENT = 'invalid-content',
  NO_API_KEY = 'no-api-key',
  NO_MODEL = 'no-model',
  NO_PROJECT_ID = 'no-project-id',
  PARSE_FAILED = 'parse-failed',
  RESPONSE_ERROR = 'response-error'
}

const ERRORS: ErrorMap<VertexError> = {
  [VertexError.FETCH_ERROR]: `Error fetching from {$url}: {$message}`,
  [VertexError.INVALID_CONTENT]: `Content formatting error: {$message}`,
  [VertexError.NO_API_KEY]:
    `The "apiKey" field is empty in the local Firebase config. Firebase VertexAI requires this field to` +
    `contain a valid API key.`,
  [VertexError.NO_PROJECT_ID]:
    `The "projectId" field is empty in the local Firebase config. Firebase VertexAI requires this field to` +
    `contain a valid project ID.`,
  [VertexError.NO_MODEL]:
    `Must provide a model name. ` +
    `Example: genai.getGenerativeModel({ model: 'my-model-name' })`,
  [VertexError.PARSE_FAILED]: `Parsing failed: {$message}`,
  [VertexError.RESPONSE_ERROR]:
    `Response error: {$message}. Response body stored in ` +
    `error.customData.response`
};

interface ErrorParams {
  [VertexError.FETCH_ERROR]: { url: string; message: string };
  [VertexError.INVALID_CONTENT]: { message: string };
  [VertexError.PARSE_FAILED]: { message: string };
  [VertexError.RESPONSE_ERROR]: {
    message: string;
    response: GenerateContentResponse;
  };
}

export const ERROR_FACTORY = new ErrorFactory<VertexError, ErrorParams>(
  'vertex',
  'Vertex',
  ERRORS
);
