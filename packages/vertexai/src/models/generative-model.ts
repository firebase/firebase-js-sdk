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
  Tool
} from '../types';
import { ChatSession } from '../methods/chat-session';
import { countTokens } from '../methods/count-tokens';
import { formatGenerateContentInput } from '../requests/request-helpers';
import { Vertex } from '../public-types';
import { ERROR_FACTORY, VertexError } from '../errors';
import { ApiSettings } from '../types/internal';

/**
 * Class for generative model APIs.
 * @public
 */
export class GenerativeModel {
  private _apiSettings: ApiSettings;
  model: string;
  generationConfig: GenerationConfig;
  safetySettings: SafetySetting[];
  requestOptions?: RequestOptions;
  tools?: Tool[];

  constructor(
    vertex: Vertex,
    modelParams: ModelParams,
    requestOptions?: RequestOptions
  ) {
    if (!vertex.app?.options?.apiKey) {
      throw ERROR_FACTORY.create(VertexError.NO_API_KEY);
    } else if (!vertex.app?.options?.projectId) {
      throw ERROR_FACTORY.create(VertexError.NO_PROJECT_ID);
    } else {
      this._apiSettings = {
        apiKey: vertex.app.options.apiKey,
        project: vertex.app.options.projectId,
        location: vertex.region
      };
    }
    if (modelParams.model.includes('/')) {
      if (modelParams.model.startsWith('models/')) {
        // Add "publishers/google" if the user is only passing in 'models/model-name'.
        this.model = `publishers/google/${modelParams.model}`;
      } else {
        // Any other custom format (e.g. tuned models) must be passed in correctly.
        this.model = modelParams.model;
      }
    } else {
      // If path is not included, assume it's a non-tuned model.
      this.model = `publishers/google/models/${modelParams.model}`;
    }
    this.generationConfig = modelParams.generationConfig || {};
    this.safetySettings = modelParams.safetySettings || [];
    this.tools = modelParams.tools;
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
        ...formattedParams
      },
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
        ...formattedParams
      },
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
      {
        tools: this.tools,
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
    return countTokens(this._apiSettings, this.model, formattedParams);
  }
}
