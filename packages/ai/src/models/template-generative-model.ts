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
  templateGenerateContent,
  templateGenerateContentStream
} from '../methods/generate-content';
import { GenerateContentResult, RequestOptions } from '../types';
import { AI, Content, GenerateContentStreamResult } from '../public-types';
import { ApiSettings } from '../types/internal';
import { TemplateChatSession } from '../methods/template-chat-session';
import { initApiSettings } from './utils';

/**
 * {@link GenerativeModel} APIs that execute on a server-side template.
 *
 * This class should only be instantiated with {@link getTemplateGenerativeModel}.
 *
 * @beta
 */
export class TemplateGenerativeModel {
  /**
   * @internal
   */
  _apiSettings: ApiSettings;

  /**
   * Additional options to use when making requests.
   */
  requestOptions?: RequestOptions;

  /**
   * @hideconstructor
   */
  constructor(ai: AI, requestOptions?: RequestOptions) {
    this.requestOptions = requestOptions || {};
    this._apiSettings = initApiSettings(ai);
  }

  /**
   * Makes a single non-streaming call to the model and returns an object
   * containing a single {@link GenerateContentResponse}.
   *
   * @param templateId - The ID of the server-side template to execute.
   * @param templateVariables - A key-value map of variables to populate the
   * template with.
   *
   * @beta
   */
  async generateContent(
    templateId: string,
    templateVariables: object // anything!
  ): Promise<GenerateContentResult> {
    return templateGenerateContent(
      this._apiSettings,
      templateId,
      { inputs: templateVariables },
      this.requestOptions
    );
  }

  /**
   * Makes a single streaming call to the model and returns an object
   * containing an iterable stream that iterates over all chunks in the
   * streaming response as well as a promise that returns the final aggregated
   * response.
   *
   * @param templateId - The ID of the server-side template to execute.
   * @param templateVariables - A key-value map of variables to populate the
   * template with.
   *
   * @beta
   */
  async generateContentStream(
    templateId: string,
    templateVariables: object
  ): Promise<GenerateContentStreamResult> {
    return templateGenerateContentStream(
      this._apiSettings,
      templateId,
      { inputs: templateVariables },
      this.requestOptions
    );
  }

  /**
   * Gets a new {@link TemplateChatSession} instance which can be used for
   * multi-turn chats.
   *
   * @param templateId - The ID of the server-side template to execute.
   * @param history - An array of {@link Content} objects to initialize the
   * chat history with.
   *
   * @beta
   */
  startChat(templateId: string, history?: Content[]): TemplateChatSession {
    return new TemplateChatSession(
      this._apiSettings,
      templateId,
      history,
      this.requestOptions
    );
  }
}
