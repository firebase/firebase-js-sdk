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

  /** The domain where the error occured. */
  domain?: string;

  /** Additonal metadata about the error. */
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
  generateContentResponse?: GenerateContentResponse;

  /** Optional additional details about the error. */
  errorDetails?: ErrorDetails[];
}

/**
 * Standardized error codes that {@link VertexAIError} can have.
 *
 * @public
 */
export const enum VertexAIErrorCode {
  /** A generic error occured. */
  ERROR = 'error',

  /** An error occurred in a request. */
  REQUEST_ERROR = 'request-error',

  /** An error occured in a response. */
  RESPONSE_ERROR = 'response-error',

  /** An error occurred while performing a fetch. */
  FETCH_ERROR = 'fetch-error',

  /** An error associated with a Content object.  */
  INVALID_CONTENT = 'invalid-content',

  /** An error occured due to a missing api key. */
  NO_API_KEY = 'no-api-key',

  /** An error occurred due to a missing model. */
  NO_MODEL = 'no-model',

  /** An error occured due to a missing project id. */
  NO_PROJECT_ID = 'no-project-id',

  /** An error occured while parsing. */
  PARSE_FAILED = 'parse-failed'
}
