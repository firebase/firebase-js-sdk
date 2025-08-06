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

import { CountTokensRequest, GenerateContentRequest } from './requests';

/**
 * <b>(EXPERIMENTAL)</b> Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device inference is
 * possible.
 *
 * These methods should not be called directly by the user.
 *
 * @public
 */
export interface ChromeAdapter {
  /**
   * Checks if the on-device model is capable of handling a given
   * request.
   * @param request - A potential request to be passed to the model.
   */
  isAvailable(request: GenerateContentRequest): Promise<boolean>;

  /**
   * Generates content using on-device inference.
   *
   * <p>This is comparable to {@link GenerativeModel.generateContent} for generating
   * content using in-cloud inference.</p>
   * @param request - a standard Firebase AI {@link GenerateContentRequest}
   */
  generateContent(request: GenerateContentRequest): Promise<Response>;

  /**
   * Generates a content stream using on-device inference.
   *
   * <p>This is comparable to {@link GenerativeModel.generateContentStream} for generating
   * a content stream using in-cloud inference.</p>
   * @param request - a standard Firebase AI {@link GenerateContentRequest}
   */
  generateContentStream(request: GenerateContentRequest): Promise<Response>;

  /**
   * @internal
   */
  countTokens(request: CountTokensRequest): Promise<Response>;
}
