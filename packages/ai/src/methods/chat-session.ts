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
  GenerateContentRequest,
  GenerateContentResult,
  GenerateContentStreamResult,
  Part,
  RequestOptions,
  SingleRequestOptions,
  StartChatParams
} from '../types';
import { formatNewContent } from '../requests/request-helpers';
import { formatBlockErrorMessage } from '../requests/response-helpers';
import { validateChatHistory } from './chat-session-helpers';
import { generateContent, generateContentStream } from './generate-content';
import { ApiSettings } from '../types/internal';
import { logger } from '../logger';
import { ChromeAdapter } from '../types/chrome-adapter';

/**
 * Used to break the internal promise chain when an error is already handled
 * by the user, preventing duplicate console logs.
 */
const SILENT_ERROR = 'SILENT_ERROR';

/**
 * ChatSession class that enables sending chat messages and stores
 * history of sent and received messages so far.
 *
 * @public
 */
export class ChatSession {
  private _apiSettings: ApiSettings;
  private _history: Content[] = [];

  /**
   * Ensures sequential execution of chat messages to maintain history order.
   * Each call waits for the previous one to settle before proceeding.
   */
  private _sendPromise: Promise<void> = Promise.resolve();

  constructor(
    apiSettings: ApiSettings,
    public model: string,
    private chromeAdapter?: ChromeAdapter,
    public params?: StartChatParams,
    public requestOptions?: RequestOptions
  ) {
    this._apiSettings = apiSettings;
    if (params?.history) {
      validateChatHistory(params.history);
      this._history = params.history;
    }
  }

  /**
   * Gets the chat history so far. Blocked prompts are not added to history.
   * Neither blocked candidates nor the prompts that generated them are added
   * to history.
   */
  async getHistory(): Promise<Content[]> {
    await this._sendPromise;
    return this._history;
  }

  /**
   * Sends a chat message and receives a non-streaming
   * {@link GenerateContentResult}
   */
  async sendMessage(
    request: string | Array<string | Part>,
    singleRequestOptions?: SingleRequestOptions
  ): Promise<GenerateContentResult> {
    await this._sendPromise;
    const newContent = formatNewContent(request);
    const generateContentRequest: GenerateContentRequest = {
      safetySettings: this.params?.safetySettings,
      generationConfig: this.params?.generationConfig,
      tools: this.params?.tools,
      toolConfig: this.params?.toolConfig,
      systemInstruction: this.params?.systemInstruction,
      contents: [...this._history, newContent]
    };
    let finalResult = {} as GenerateContentResult;

    this._sendPromise = this._sendPromise
      .then(() =>
        generateContent(
          this._apiSettings,
          this.model,
          generateContentRequest,
          this.chromeAdapter,
          {
            ...this.requestOptions,
            ...singleRequestOptions
          }
        )
      )
      .then(result => {
        // TODO: Make this update atomic. If creating `responseContent` throws,
        // history will contain the user message but not the response, causing
        // validation errors on the next request.
        if (
          result.response.candidates &&
          result.response.candidates.length > 0
        ) {
          this._history.push(newContent);
          const responseContent: Content = {
            parts: result.response.candidates?.[0].content.parts || [],
            role: result.response.candidates?.[0].content.role || 'model'
          };
          this._history.push(responseContent);
        } else {
          const blockErrorMessage = formatBlockErrorMessage(result.response);
          if (blockErrorMessage) {
            logger.warn(
              `sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`
            );
          }
        }
        finalResult = result;
      });
    await this._sendPromise;
    return finalResult;
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
    await this._sendPromise;
    const newContent = formatNewContent(request);
    const generateContentRequest: GenerateContentRequest = {
      safetySettings: this.params?.safetySettings,
      generationConfig: this.params?.generationConfig,
      tools: this.params?.tools,
      toolConfig: this.params?.toolConfig,
      systemInstruction: this.params?.systemInstruction,
      contents: [...this._history, newContent]
    };
    const streamPromise = generateContentStream(
      this._apiSettings,
      this.model,
      generateContentRequest,
      this.chromeAdapter,
      {
        ...this.requestOptions,
        ...singleRequestOptions
      }
    );

    // We hook into the chain to update history, but we don't block the
    // return of `streamPromise` to the user.
    this._sendPromise = this._sendPromise
      .then(() => streamPromise)
      .catch(_ignored => {
        // If the initial fetch fails, the user's `streamPromise` rejects.
        // We swallow the error here to prevent double logging in the final catch.
        throw new Error(SILENT_ERROR);
      })
      .then(streamResult => streamResult.response)
      .then(response => {
        // This runs after the stream completes. Runtime errors here cannot be
        // caught by the user because their promise has likely already resolved.
        // TODO: Move response validation logic upstream to `stream-reader` so
        // errors propagate to the user's `result.response` promise.
        if (response.candidates && response.candidates.length > 0) {
          this._history.push(newContent);
          // TODO: Validate that `response.candidates[0].content` is not null.
          const responseContent = { ...response.candidates[0].content };
          if (!responseContent.role) {
            responseContent.role = 'model';
          }
          this._history.push(responseContent);
        } else {
          const blockErrorMessage = formatBlockErrorMessage(response);
          if (blockErrorMessage) {
            logger.warn(
              `sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`
            );
          }
        }
      })
      .catch(e => {
        // Filter out errors already handled by the user or initiated by them.
        if (e.message !== SILENT_ERROR && e.name !== 'AbortError') {
          logger.error(e);
        }
      });
    return streamPromise;
  }
}
