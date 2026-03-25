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
  Content,
  FunctionDeclarationsTool,
  GenerateContentRequest,
  GenerateContentResult,
  GenerateContentStreamResult,
  Part,
  RequestOptions,
  SingleRequestOptions,
  StartChatParams
} from '../types';
import { generateContent, generateContentStream } from './generate-content';
import { ApiSettings } from '../types/internal';
import { ChromeAdapter } from '../types/chrome-adapter';
import { ChatSessionBase } from './chat-session-base';
import { validateChatHistory } from './chat-session-helpers';

/**
 * ChatSession class that enables sending chat messages and stores
 * history of sent and received messages so far.
 *
 * @public
 */
export class ChatSession extends ChatSessionBase<
  StartChatParams,
  GenerateContentRequest,
  FunctionDeclarationsTool
> {
  constructor(
    apiSettings: ApiSettings,
    public model: string,
    private chromeAdapter?: ChromeAdapter,
    public params?: StartChatParams,
    public requestOptions?: RequestOptions
  ) {
    super(apiSettings, params, requestOptions);
    if (params?.history) {
      validateChatHistory(params.history);
      this._history = params.history;
    }
  }

  /**
   * Format Content into a request for generateContent or
   * generateContentStream.
   * @internal
   */
  _formatRequest(
    incomingContent: Content,
    tempHistory: Content[]
  ): GenerateContentRequest {
    return {
      safetySettings: this.params?.safetySettings,
      generationConfig: this.params?.generationConfig,
      tools: this.params?.tools,
      toolConfig: this.params?.toolConfig,
      systemInstruction: this.params?.systemInstruction,
      contents: [...this._history, ...tempHistory, incomingContent]
    };
  }

  /**
   * Calls default generateContent() (versus a specialized one like
   * templateGenerateContent).
   * @internal
   */
  _callGenerateContent(
    formattedRequest: GenerateContentRequest,
    singleRequestOptions?: RequestOptions
  ): Promise<GenerateContentResult> {
    return generateContent(
      this._apiSettings,
      this.model,
      formattedRequest,
      this.chromeAdapter,
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );
  }

  /**
   * Calls default generateContentStream() (versus a specialized one like
   * templateGenerateContentStream).
   * @internal
   */
  _callGenerateContentStream(
    formattedRequest: GenerateContentRequest,
    singleRequestOptions?: RequestOptions
  ): Promise<GenerateContentStreamResult> {
    return generateContentStream(
      this._apiSettings,
      this.model,
      formattedRequest,
      this.chromeAdapter,
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );
  }

  /**
   * Sends a chat message and receives a non-streaming
   * {@link GenerateContentResult}
   */
  async sendMessage(
    request: string | Array<string | Part>,
    singleRequestOptions?: SingleRequestOptions
  ): Promise<GenerateContentResult> {
    return this._sendMessage(request, singleRequestOptions);
  }

  /**
   * Sends a chat message and receives the response as a
   * {@link GenerateContentStreamResult} containing an iterable stream
   * and a response promise.
   */
  async sendMessageStream(
    request: string | Array<string | Part>,
    singleRequestOptions?: SingleRequestOptions
  ): Promise<GenerateContentStreamResult> {
    return this._sendMessageStream(request, singleRequestOptions);
  }
}
