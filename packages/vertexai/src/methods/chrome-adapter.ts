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
  Content,
  GenerateContentRequest,
  InferenceMode,
  Part,
  Role
} from '../types';
import {
  Availability,
  LanguageModel,
  LanguageModelCreateOptions,
  LanguageModelMessage,
  LanguageModelMessageRole,
  LanguageModelMessageContent
} from '../types/language-model';
import { isChrome } from '@firebase/util';

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 */
export class ChromeAdapter {
  private isDownloading = false;
  private downloadPromise: Promise<LanguageModel | void> | undefined;
  private oldSession: LanguageModel | undefined;
  constructor(
    private languageModelProvider?: LanguageModel,
    private mode?: InferenceMode,
    private onDeviceParams?: LanguageModelCreateOptions
  ) {}
  /**
   * Convenience method to check if a given request can be made on-device.
   * Encapsulates a few concerns: 1) the mode, 2) API existence, 3) prompt formatting, and
   * 4) model availability, including triggering download if necessary.
   * Pros: caller needn't be concerned with details of on-device availability. Cons: this method
   * spans a few concerns and splits request validation from usage. If instance variables weren't
   * already part of the API, we could consider a better separation of concerns.
   */
  async isAvailable(request: GenerateContentRequest): Promise<boolean> {
    // Returns false if we should only use in-cloud inference.
    if (this.mode === 'only_in_cloud') {
      return false;
    }
    // Returns false because only Chrome's experimental Prompt API is supported.
    if (!isChrome()) {
      return false;
    }
    // Returns false if the on-device inference API is undefined.;
    if (!this.languageModelProvider) {
      return false;
    }
    // Returns false if the request can't be run on-device.
    if (!ChromeAdapter.isOnDeviceRequest(request)) {
      return false;
    }
    const availability = await this.languageModelProvider.availability();
    switch (availability) {
      case Availability.available:
        // Returns true only if a model is immediately available.
        return true;
      case Availability.downloadable:
        // Triggers async download if model is downloadable.
        this.download();
      default:
        return false;
    }
  }
  async generateContentOnDevice(
    request: GenerateContentRequest
  ): Promise<Response> {
    const session = await this.session(
      // TODO: normalize on-device params during construction.
      this.onDeviceParams || {}
    );
    const messages = ChromeAdapter.toLanguageModelMessages(request.contents);
    const text = await session.prompt(messages);
    return {
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ text }]
              }
            }
          ]
        })
    } as Response;
  }
  private static isOnDeviceRequest(request: GenerateContentRequest): boolean {
    // Returns false if the prompt is empty.
    if (request.contents.length === 0) {
      return false;
    }

    // Applies the same checks as above, but for each content item.
    for (const content of request.contents) {
      if (content.role === 'function') {
        return false;
      }

      if (content.parts.length > 1) {
        return false;
      }

      if (!content.parts[0].text) {
        return false;
      }
    }

    return true;
  }
  private download(): void {
    if (this.isDownloading) {
      return;
    }
    this.isDownloading = true;
    this.downloadPromise = this.languageModelProvider
      ?.create(this.onDeviceParams)
      .then(() => {
        this.isDownloading = false;
      });
  }
  private static toOnDeviceRole(role: Role): LanguageModelMessageRole {
    return role === 'model' ? 'assistant' : 'user';
  }
  private static toLanguageModelMessages(
    contents: Content[]
  ): LanguageModelMessage[] {
    return contents.map(c => ({
      role: ChromeAdapter.toOnDeviceRole(c.role),
      content: c.parts.map(ChromeAdapter.toLanguageModelMessageContent)
    }));
  }
  private static toLanguageModelMessageContent(
    part: Part
  ): LanguageModelMessageContent {
    if (part.text) {
      return {
        type: 'text',
        content: part.text
      };
    }
    // Assumes contents have been verified to contain only a single TextPart.
    // TODO: support other input types
    throw new Error('Not yet implemented');
  }
  private async session(
    opts: LanguageModelCreateOptions
  ): Promise<LanguageModel> {
    const newSession = await this.languageModelProvider!.create(opts);
    if (this.oldSession) {
      this.oldSession.destroy();
    }
    // Holds session reference, so model isn't unloaded from memory.
    this.oldSession = newSession;
    return newSession;
  }
}
