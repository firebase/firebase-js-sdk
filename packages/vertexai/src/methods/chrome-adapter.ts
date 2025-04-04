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
  Role,
  TextPart
} from '../types';
import {
  Availability,
  LanguageModel,
  LanguageModelCreateOptions,
  LanguageModelMessageRole,
  LanguageModelMessageShorthand
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
    if (!ChromeAdapter._isOnDeviceRequest(request)) {
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
    const initialPrompts = ChromeAdapter.toInitialPrompts(request.contents);
    // Assumes validation asserted there is at least one initial prompt.
    const prompt = initialPrompts.pop()!;
    const systemPrompt = ChromeAdapter.toSystemPrompt(
      request.systemInstruction
    );
    const session = await this.session({
      initialPrompts,
      systemPrompt
    });
    const text = await session.prompt(prompt.content);
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
  // Visible for testing
  static _isOnDeviceRequest(request: GenerateContentRequest): boolean {
    if (request.systemInstruction) {
      const systemContent = request.systemInstruction as Content;
      // Returns false if the role can't be represented on-device.
      if (systemContent.role && systemContent.role === 'function') {
        return false;
      }

      // Returns false if the system prompt is multi-part.
      if (systemContent.parts && systemContent.parts.length > 1) {
        return false;
      }

      // Returns false if the system prompt isn't text.
      const systemText = request.systemInstruction as TextPart;
      if (!systemText.text) {
        return false;
      }
    }

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
  private static toSystemPrompt(
    prompt: string | Content | Part | undefined
  ): string | undefined {
    if (!prompt) {
      return undefined;
    }

    if (typeof prompt === 'string') {
      return prompt;
    }

    const systemContent = prompt as Content;
    if (
      systemContent.parts &&
      systemContent.parts[0] &&
      systemContent.parts[0].text
    ) {
      return systemContent.parts[0].text;
    }

    const systemPart = prompt as Part;
    if (systemPart.text) {
      return systemPart.text;
    }

    return undefined;
  }
  private static toOnDeviceRole(role: Role): LanguageModelMessageRole {
    return role === 'model' ? 'assistant' : 'user';
  }
  private static toInitialPrompts(
    contents: Content[]
  ): LanguageModelMessageShorthand[] {
    return contents.map(c => ({
      role: ChromeAdapter.toOnDeviceRole(c.role),
      // Assumes contents have been verified to contain only a single TextPart.
      content: c.parts[0].text!
    }));
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
