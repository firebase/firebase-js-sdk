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
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 *
 * @public
 */
export interface ChromeAdapter {
  isAvailable(request: GenerateContentRequest): Promise<boolean>;
  countTokens(_request: CountTokensRequest): Promise<Response>;
  generateContent(request: GenerateContentRequest): Promise<Response>;
  generateContentStream(request: GenerateContentRequest): Promise<Response>;
}
