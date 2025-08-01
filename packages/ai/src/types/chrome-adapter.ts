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

import { InferenceMode } from './enums';
import { CountTokensRequest, GenerateContentRequest } from './requests';

/**
 * (EXPERIMENTAL)
 *
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 *
 * These methods should not be called directly by the user.
 *
 * @public
 */
export interface ChromeAdapter {
  /**
   * Checks if a given request can be made on-device.
   *
   * <ol>Encapsulates a few concerns:
   *   <li>the mode</li>
   *   <li>API existence</li>
   *   <li>prompt formatting</li>
   *   <li>model availability, including triggering download if necessary</li>
   * </ol>
   *
   * <p>Pros: callers needn't be concerned with details of on-device availability.</p>
   * <p>Cons: this method spans a few concerns and splits request validation from usage.
   * If instance variables weren't already part of the API, we could consider a better
   * separation of concerns.</p>
   */
  isAvailable(request: GenerateContentRequest): Promise<boolean>;

  /**
   * Stub - not yet available for on-device.
   */
  countTokens(_request: CountTokensRequest): Promise<Response>;

  /**
   * Generates content on device.
   *
   * <p>This is comparable to {@link GenerativeModel.generateContent} for generating content in
   * Cloud.</p>
   * @param request - a standard Firebase AI {@link GenerateContentRequest}
   * @returns Response, so we can reuse common response formatting.
   */
  generateContent(request: GenerateContentRequest): Promise<Response>;

  /**
   * Generates content stream on device.
   *
   * <p>This is comparable to {@link GenerativeModel.generateContentStream} for generating content in
   * Cloud.</p>
   * @param request - a standard Firebase AI {@link GenerateContentRequest}
   * @returns Response, so we can reuse common response formatting.
   */
  generateContentStream(request: GenerateContentRequest): Promise<Response>;
}
