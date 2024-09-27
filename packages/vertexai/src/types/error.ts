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

import { GenerateContentResponse } from './responses';

/**
 * Details object that may be included in an error response.
 *
 * @public
 */
export interface ErrorDetails {
  '@type'?: string;

  /** The reason for the error. */
  reason?: string;

  /** The domain where the error occurred. */
  domain?: string;

  /** Additional metadata about the error. */
  metadata?: Record<string, unknown>;

  /** Any other relevant information about the error. */
  [key: string]: unknown;
}

/**
 * Details object that contains data originating from a bad HTTP response.
 *
 * @public
 */
export interface CustomErrorData {
  /** HTTP status code of the error response. */
  status?: number;

  /** HTTP status text of the error response. */
  statusText?: string;

  /** Response from a {@link GenerateContentRequest} */
  response?: GenerateContentResponse;

  /** Optional additional details about the error. */
  errorDetails?: ErrorDetails[];
}

/**
 * Standardized error codes that {@link VertexAIError} can have.
 *
 * @public
 */
export const enum VertexAIErrorCode {
  // TODO (dlarocque): Initialize error codes using the `VERTEX_TYPE` constant
  // in a computed template string literal. Can not do this until we upgrade to
  // TS5: https://github.com/microsoft/TypeScript/issues/40793
  /** A generic error occurred. */
  ERROR = 'vertexAI/error',

  /** An error occurred in a request. */
  REQUEST_ERROR = 'vertexAI/request-error',

  /** An error occurred in a response. */
  RESPONSE_ERROR = 'vertexAI/response-error',

  /** An error occurred while performing a fetch. */
  FETCH_ERROR = 'vertexAI/fetch-error',

  /** An error associated with a Content object.  */
  INVALID_CONTENT = 'vertexAI/invalid-content',

  /** An error occurred due to a missing Firebase API key. */
  NO_API_KEY = 'vertexAI/no-api-key',

  /** An error occurred due to a model name not being specified during initialization. */
  NO_MODEL = 'vertexAI/no-model',

  /** An error occurred due to a missing project ID. */
  NO_PROJECT_ID = 'vertexAI/no-project-id',

  /** An error occurred while parsing. */
  PARSE_FAILED = 'vertexAI/parse-failed'
}
