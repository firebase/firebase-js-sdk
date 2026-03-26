/**
 * @license
 * Copyright 2026 Google LLC
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
  GenerateContentResult,
  GenerateContentStreamResult,
  Part,
  RequestOptions,
  SingleRequestOptions,
  StartTemplateChatParams,
  TemplateFunctionDeclarationInternal,
  TemplateFunctionDeclarationsTool,
  TemplateFunctionDeclarationsToolInternal,
  TemplateRequestInternal
} from '../types';
import { validateChatHistory } from './chat-session-helpers';
import {
  templateGenerateContent,
  templateGenerateContentStream
} from './generate-content';
import { ApiSettings } from '../types/internal';
import { ChatSessionBase } from './chat-session-base';

/**
 * ChatSession class that enables sending chat messages and stores
 * history of sent and received messages so far for a server template.
 *
 * @public
 */
export class TemplateChatSession extends ChatSessionBase<
  StartTemplateChatParams,
  TemplateRequestInternal,
  TemplateFunctionDeclarationsTool
> {
  constructor(
    apiSettings: ApiSettings,
    public params: StartTemplateChatParams,
    public requestOptions?: RequestOptions
  ) {
    super(apiSettings, params, requestOptions);
    if (params.history) {
      validateChatHistory(params.history);
      this._history = params.history;
    }
  }

  /**
   * Format the internal state to the body payload for `templateGenerateContent`.
   * @internal
   */
  _formatRequest(
    incomingContent: Content,
    tempHistory: Content[]
  ): TemplateRequestInternal {
    const request: TemplateRequestInternal = {
      history: [...this._history, ...tempHistory, incomingContent]
    };
    if (this.params.templateVariables) {
      request.inputs = this.params.templateVariables;
    }
    if (this.params.tools) {
      request.tools = this.params.tools?.map(tool => {
        if (tool.functionDeclarations) {
          return {
            templateFunctions: tool.functionDeclarations.map(declaration => {
              if (declaration.parameters) {
                const newDeclaration = { ...declaration };
                delete newDeclaration.parameters;
                (
                  newDeclaration as TemplateFunctionDeclarationInternal
                ).inputSchema = declaration.parameters;
                return newDeclaration;
              }
              return declaration;
            })
          };
        }
        return tool as TemplateFunctionDeclarationsToolInternal;
      });
    }
    if (this.params.toolConfig) {
      request.toolConfig = this.params.toolConfig;
    }
    return request;
  }

  /**
   * Calls the specific templateGenerateContent() function needed for
   * this specialized TemplateChatSession.
   * @internal
   */
  _callGenerateContent(
    formattedRequest: TemplateRequestInternal,
    singleRequestOptions?: RequestOptions
  ): Promise<GenerateContentResult> {
    return templateGenerateContent(
      this._apiSettings,
      this.params.templateId,
      formattedRequest,
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );
  }

  /**
   * Calls the specific templateGenerateContentStream() function needed for
   * this specialized TemplateChatSession.
   * @internal
   */
  _callGenerateContentStream(
    formattedRequest: TemplateRequestInternal,
    singleRequestOptions?: RequestOptions
  ): Promise<GenerateContentStreamResult> {
    return templateGenerateContentStream(
      this._apiSettings,
      this.params.templateId,
      formattedRequest,
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
