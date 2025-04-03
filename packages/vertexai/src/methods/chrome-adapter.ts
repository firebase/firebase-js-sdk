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

import {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  InferenceMode
} from '../types';

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 */
export class ChromeAdapter {
  constructor(
    private aiProvider?: AI,
    private mode?: InferenceMode,
    private onDeviceParams?: AILanguageModelCreateOptionsWithSystemPrompt
  ) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isAvailable(request: GenerateContentRequest): Promise<boolean> {
    return false;
  }
  async generateContentOnDevice(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: GenerateContentRequest
  ): Promise<EnhancedGenerateContentResponse> {
    return {
      text: () => '',
      functionCalls: () => undefined
    };
  }
}
