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
  RequestOptions,
  SafetySetting,
  StartChatParams,
  Tool,
  ToolConfig
} from '../types';
import { ChatSession } from '../methods/chat-session';
import { countTokens } from '../methods/count-tokens';
import {
  formatGenerateContentInput,
  formatSystemInstruction
} from '../requests/request-helpers';
import { AI, AIErrorCode } from '../public-types';
import { AIModel } from './ai-model';
import { ChromeAdapter } from '../types/chrome-adapter';
import { AIError } from '../errors';

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
   * Makes a single non-streaming call to the model
   * and returns an object containing a single {@link GenerateContentResponse}.
   */
  async generateContent(
    request: GenerateContentRequest | string | Array<string | Part>
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
      this.requestOptions
    );
  }

  /**
   * Makes a single streaming call to the model
   * and returns an object containing an iterable stream that iterates
   * over all chunks in the streaming response as well as
   * a promise that returns the final aggregated response.
   */
  async generateContentStream(
    request: GenerateContentRequest | string | Array<string | Part>
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
      this.requestOptions
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
    request: CountTokensRequest | string | Array<string | Part>
  ): Promise<CountTokensResponse> {
    const formattedParams = formatGenerateContentInput(request);
    return countTokens(
      this._apiSettings,
      this.model,
      formattedParams,
      this.chromeAdapter
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
