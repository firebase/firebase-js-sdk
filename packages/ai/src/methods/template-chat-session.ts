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
  GenerateContentResult,
  GenerateContentStreamResult,
  Part,
  RequestOptions
} from '../types';
import { formatNewContent } from '../requests/request-helpers';
import { formatBlockErrorMessage } from '../requests/response-helpers';
import { validateChatHistory } from './chat-session-helpers';
import {
  templateGenerateContent,
  templateGenerateContentStream
} from './generate-content';
import { ApiSettings } from '../types/internal';
import { logger } from '../logger';

/**
 * Do not log a message for this error.
 */
const SILENT_ERROR = 'SILENT_ERROR';

/**
 * A chat session that enables sending chat messages and stores the history of
 * sent and received messages so far.
 *
 * This session is for multi-turn chats using a server-side template. It should
 * be instantiated with {@link TemplateGenerativeModel.startChat}.
 *
 * @beta
 */
export class TemplateChatSession {
  private _sendPromise: Promise<void> = Promise.resolve();

  /**
   * @hideconstructor
   */
  constructor(
    private _apiSettings: ApiSettings,
    public templateId: string,
    private _history: Content[] = [],
    public requestOptions?: RequestOptions
  ) {
    if (this._history) {
      validateChatHistory(this._history);
    }
  }

  /**
   * Gets the chat history so far. Blocked prompts are not added to history.
   * Neither blocked candidates nor the prompts that generated them are added
   * to history.
   *
   * @beta
   */
  async getHistory(): Promise<Content[]> {
    await this._sendPromise;
    return this._history;
  }

  /**
   * Sends a chat message and receives a non-streaming
   * {@link GenerateContentResult}.
   *
   * @param request - The user message to store in the history
   * @param inputs - A key-value map of variables to populate the template
   * with. This should likely include the user message.
   *
   * @beta
   */
  async sendMessage(
    request: string | Array<string | Part>,
    inputs?: object
  ): Promise<GenerateContentResult> {
    await this._sendPromise;
    let finalResult = {} as GenerateContentResult;
    const variablesWithHistory = {
      inputs: {
        ...inputs
      },
      history: [...this._history]
    };
    // Add onto the chain.
    this._sendPromise = this._sendPromise
      .then(() =>
        templateGenerateContent(
          this._apiSettings,
          this.templateId,
          variablesWithHistory,
          this.requestOptions
        )
      )
      .then(result => {
        if (
          result.response.candidates &&
          result.response.candidates.length > 0
        ) {
          // Important note: The user's message is *not* the actual message that was sent to
          // the model, but the message that was passed as a parameter.
          // Since the real message was the rendered server prompt template, there is no way
          // to store the actual message in the client.
          // It's the user's responsibility to ensure that the `message` that goes in the history
          // is as close as possible to the rendered template if they want a realistic chat
          // experience.
          // The ideal case here is that the user defines a `message` variable in the `inputs` of
          // the prompt template. The other parts of the message that the prompt template is hiding
          // isn't relevant to the conversation history. For example, system instructions.
          // In this case, the user would have the user's `message` that they pass as the first
          // argument to this method, then *also* pass that in the `inputs`, so that it's actually
          // part of the populated template that is sent to the model.
          this._history.push(formatNewContent(request));
          const responseContent: Content = {
            parts: result.response.candidates?.[0].content.parts || [],
            // Response seems to come back without a role set.
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
        finalResult = result as GenerateContentResult;
      });
    await this._sendPromise;
    return finalResult;
  }

  /**
   * Sends a chat message and receives the response as a
   * {@link GenerateContentStreamResult} containing an iterable stream
   * and a response promise.
   *
   * @param request - The message to send to the model.
   * @param inputs - A key-value map of variables to populate the template
   * with.
   *
   * @beta
   */
  async sendMessageStream(
    request: string | Array<string | Part>,
    inputs?: object
  ): Promise<GenerateContentStreamResult> {
    await this._sendPromise;
    const variablesWithHistory = {
      inputs: {
        ...inputs
      },
      history: [...this._history]
    };
    const streamPromise = templateGenerateContentStream(
      this._apiSettings,
      this.templateId,
      variablesWithHistory,
      this.requestOptions
    );

    // Add onto the chain.
    this._sendPromise = this._sendPromise
      .then(() => streamPromise)
      // This must be handled to avoid unhandled rejection, but jump
      // to the final catch block with a label to not log this error.
      .catch(_ignored => {
        throw new Error(SILENT_ERROR);
      })
      .then(streamResult => streamResult.response)
      .then(response => {
        if (response.candidates && response.candidates.length > 0) {
          // Important note: The user's message is *not* the actual message that was sent to
          // the model, but the message that was passed as a parameter.
          // Since the real message was the rendered server prompt template, there is no way
          // to store the actual message in the client.
          // It's the user's responsibility to ensure that the `message` that goes in the history
          // is as close as possible to the rendered template if they want a realistic chat
          // experience.
          // The ideal case here is that the user defines a `message` variable in the `inputs` of
          // the prompt template. The other parts of the message that the prompt template is hiding
          // isn't relevant to the conversation history. For example, system instructions.
          // In this case, the user would have the user's `message` that they pass as the first
          // argument to this method, then *also* pass that in the `inputs`, so that it's actually
          // part of the populated template that is sent to the model.
          this._history.push(formatNewContent(request));
          const responseContent = { ...response.candidates[0].content };
          // Response seems to come back without a role set.
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
        // Errors in streamPromise are already catchable by the user as
        // streamPromise is returned.
        // Avoid duplicating the error message in logs.
        if (e.message !== SILENT_ERROR) {
          // Users do not have access to _sendPromise to catch errors
          // downstream from streamPromise, so they should not throw.
          logger.error(e);
        }
      });
    return streamPromise;
  }
}
