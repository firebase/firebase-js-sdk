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
import { FirebaseError } from '@firebase/util';
import { VERTEX_TYPE } from './constants';

export const enum VertexAIErrorCode {
  REQUEST_ERROR = 'request-error',
  FETCH_ERROR = 'fetch-error',
  INVALID_CONTENT = 'invalid-content',
  NO_API_KEY = 'no-api-key',
  NO_MODEL = 'no-model',
  NO_PROJECT_ID = 'no-project-id',
  PARSE_FAILED = 'parse-failed',
  RESPONSE_ERROR = 'response-error'
}

interface ErrorDetails {
  "@type"?: string;
  reason?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export class VertexAIError extends FirebaseError {
  readonly stack?: string;

  constructor(
    readonly code: VertexAIErrorCode,
    readonly message: string,
    readonly status?: number,
    readonly statusText?: string,
    readonly errorDetails?: ErrorDetails[]
  ) {
    super(`${VERTEX_TYPE}/${code}`, message);
  }
}