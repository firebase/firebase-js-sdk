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

import {
  generateContent,
  generateContentStream
} from '../methods/generate-content';
import {
  Content,
  CountTokensRequest,
  CountTokensResponse,
  GenerateContentRequest,
  GenerateContentResult,
  GenerateContentStreamResult,
  GenerationConfig,
  ModelParams,
  Part,
  SafetySetting,
  RequestOptions,
  StartChatParams,
  Tool,
  ToolConfig,
  SingleRequestOptions
} from '../types';
import { ChatSession } from '../methods/chat-session';
import { countTokens } from '../methods/count-tokens';
import {
  formatGenerateContentInput,
  formatSystemInstruction
} from '../requests/request-helpers';
import { AI, AIErrorCode, InferenceMode } from '../public-types';
import { AIModel } from './ai-model';
import { ChromeAdapter } from '../types/chrome-adapter';
import { AIError } from '../errors';
import { ChromeAdapterImpl } from '../methods/chrome-adapter';
import { Availability } from '../types/language-model';
import { logger } from '../logger';

/**
 * Class for generative model APIs.
 * @public
 */
export class GenerativeModel extends AIModel {
  generationConfig: GenerationConfig;
  safetySettings: SafetySetting[];
  requestOptions?: RequestOptions;
  tools?: Tool[];
  toolConfig?: ToolConfig;
  systemInstruction?: Content;

  constructor(
    ai: AI,
    modelParams: ModelParams,
    requestOptions?: RequestOptions,
    private chromeAdapter?: ChromeAdapter
  ) {
    super(ai, modelParams.model);
    this.generationConfig = modelParams.generationConfig || {};
    validateGenerationConfig(this.generationConfig);
    this.safetySettings = modelParams.safetySettings || [];
    this.tools = modelParams.tools;
    this.toolConfig = modelParams.toolConfig;
    this.systemInstruction = formatSystemInstruction(
      modelParams.systemInstruction
    );
    this.requestOptions = requestOptions || {};
  }

  /**
   * Initializes on-device models.
   *
   * @remarks
   * This may trigger a download on first
   * use. Wait for this promise to complete before calling inference
   * methods if you want to ensure the device models are ready before
   * any calls. Calling inference methods before the device is ready
   * will result in a cloud fallback if `inferenceMode` is set to
   * PREFER_ON_DEVICE, and an error if set to ONLY_ON_DEVICE.
   *
   * IMPORTANT: This call must be made on or after a user interaction
   * such as a button click. If it is called without a user interaction,
   * and it requires a download, this will cause an error.
   *
   * @public
   */
  async initializeDeviceModel(): Promise<void> {
    if (
      !this.chromeAdapter ||
      this.chromeAdapter.mode === InferenceMode.ONLY_IN_CLOUD
    ) {
      return;
    }
    const availability = await (
      this.chromeAdapter as ChromeAdapterImpl
    ).downloadIfAvailable();
    if (availability === Availability.UNAVAILABLE) {
      const notEnabledError = new AIError(
        AIErrorCode.API_NOT_ENABLED,
        'Local LanguageModel API not available in this environment.'
      );
      // No reason to throw if not in ONLY_ON_DEVICE mode.
      logger.debug(notEnabledError.message);
    }
    await (this.chromeAdapter as ChromeAdapterImpl).downloadPromise;
  }

  /**
   * Makes a single non-streaming call to the model
   * and returns an object containing a single {@link GenerateContentResponse}.
   */
  async generateContent(
    request: GenerateContentRequest | string | Array<string | Part>,
    singleRequestOptions?: SingleRequestOptions
  ): Promise<GenerateContentResult> {
    const formattedParams = formatGenerateContentInput(request);
    return generateContent(
      this._apiSettings,
      this.model,
      {
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
        ...formattedParams
      },
      this.chromeAdapter,
      // Merge request options
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );
  }

  /**
   * Makes a single streaming call to the model
   * and returns an object containing an iterable stream that iterates
   * over all chunks in the streaming response as well as
   * a promise that returns the final aggregated response.
   */
  async generateContentStream(
    request: GenerateContentRequest | string | Array<string | Part>,
    singleRequestOptions?: SingleRequestOptions
  ): Promise<GenerateContentStreamResult> {
    const formattedParams = formatGenerateContentInput(request);
    return generateContentStream(
      this._apiSettings,
      this.model,
      {
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
        ...formattedParams
      },
      this.chromeAdapter,
      // Merge request options
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );
  }

  /**
   * Gets a new {@link ChatSession} instance which can be used for
   * multi-turn chats.
   */
  startChat(startChatParams?: StartChatParams): ChatSession {
    return new ChatSession(
      this._apiSettings,
      this.model,
      this.chromeAdapter,
      {
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        /**
         * Overrides params inherited from GenerativeModel with those explicitly set in the
         * StartChatParams. For example, if startChatParams.generationConfig is set, it'll override
         * this.generationConfig.
         */
        ...startChatParams
      },
      this.requestOptions
    );
  }

  /**
   * Counts the tokens in the provided request.
   */
  async countTokens(
    request: CountTokensRequest | string | Array<string | Part>,
    singleRequestOptions?: SingleRequestOptions
  ): Promise<CountTokensResponse> {
    const formattedParams = formatGenerateContentInput(request);
    return countTokens(
      this._apiSettings,
      this.model,
      formattedParams,
      this.chromeAdapter,
      // Merge request options
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );
  }
}

/**
 * Client-side validation of some common `GenerationConfig` pitfalls, in order
 * to save the developer a wasted request.
 */
function validateGenerationConfig(generationConfig: GenerationConfig): void {
  if (
    // != allows for null and undefined. 0 is considered "set" by the model
    generationConfig.thinkingConfig?.thinkingBudget != null &&
    generationConfig.thinkingConfig?.thinkingLevel
  ) {
    throw new AIError(
      AIErrorCode.UNSUPPORTED,
      `Cannot set both thinkingBudget and thinkingLevel in a config.`
    );
  }
}
