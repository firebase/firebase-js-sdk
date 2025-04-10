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
import { VertexAI } from '../public-types';
import { VertexAIModel } from './vertexai-model';

/**
 * Class for generative model APIs.
 * @public
 */
export class GenerativeModel extends VertexAIModel {
  generationConfig: GenerationConfig;
  safetySettings: SafetySetting[];
  requestOptions?: RequestOptions;
  tools?: Tool[];
  toolConfig?: ToolConfig;
  systemInstruction?: Content;

  constructor(
    vertexAI: VertexAI,
    modelParams: ModelParams,
    requestOptions?: RequestOptions
  ) {
    super(vertexAI, modelParams.model);
    this.generationConfig = modelParams.generationConfig || {};
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
   * and returns an object containing a single <code>{@link GenerateContentResponse}</code>.
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
      this.requestOptions
    );
  }

  /**
   * Gets a new <code>{@link ChatSession}</code> instance which can be used for
   * multi-turn chats.
   */
  startChat(startChatParams?: StartChatParams): ChatSession {
    return new ChatSession(
      this._apiSettings,
      this.model,
      {
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
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

interface ChatMethods {
  sendMessage(
    request: string | Array<string | Part>
  ): Promise<GenerateContentResult>;
}
class HybridChat implements ChatMethods {
  constructor(
    private remoteModel: GenerativeModel,
    private localModel: LocalModel
  ) {}
  async sendMessage(
    request: string | Array<string | Part>
  ): Promise<GenerateContentResult> {
    if (await this.localModel.isSupported(request)) {
      return this.localModel.generateContent(request);
    }
    return this.remoteModel.generateContent(request);
  }
}
interface GenModelMethods {
  generateContent(
    request: GenerateContentRequest | string | Array<string | Part>
  ): Promise<GenerateContentResult>;
}
/**
 * Normalizes Chrome API, if available, to Vertex API
 */
export class LocalModel implements GenModelMethods {
  constructor(private aiProvider?: AI) {}
  async generateContent(
    request: GenerateContentRequest | string | Array<string | Part>
  ): Promise<GenerateContentResult> {
    const session = await this.session();
    if (typeof request !== 'string') {
      throw new Error('unsupported request format');
    }
    const result = await session.prompt(request);
    return {
      response: {
        text: () => result,
        functionCalls: () => undefined
      }
    } as GenerateContentResult;
  }
  async isSupported(
    request: string | Array<string | Part> | GenerateContentRequest
  ): Promise<boolean> {
    return typeof request === 'string';
  }
  private async session(): Promise<AILanguageModel> {
    return this.aiProvider!.languageModel.create();
  }
}
export class HybridModel implements GenModelMethods {
  constructor(
    private remoteModel: GenerativeModel,
    private localModel: LocalModel
  ) {}
  async generateContent(
    request: GenerateContentRequest | string | Array<string | Part>
  ): Promise<GenerateContentResult> {
    if (await this.localModel.isSupported(request)) {
      return this.localModel.generateContent(request);
    }
    return this.remoteModel.generateContent(request);
  }
  startChat(): HybridChat {
    return new HybridChat(this.remoteModel, this.localModel);
  }
}
