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

import { isChrome } from '@firebase/util';
import {
  Content,
  CountTokensRequest,
  GenerateContentRequest,
  InferenceMode,
  Role
} from '../types';

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 */
export class ChromeAdapter {
  private isDownloading = false;
  private downloadPromise: Promise<AILanguageModel | void> | undefined;
  private oldSession: AILanguageModel | undefined;
  constructor(
    private aiProvider?: AI,
    // TODO: mode can be required now.
    private mode?: InferenceMode,
    private onDeviceParams?: AILanguageModelCreateOptionsWithSystemPrompt
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
    // Returns false if the on-device inference API is undefined.
    const isLanguageModelAvailable =
      isChrome() && this.aiProvider && this.aiProvider.languageModel;
    if (!isLanguageModelAvailable) {
      return false;
    }
    // Returns false if the request can't be run on-device.
    if (!ChromeAdapter.isOnDeviceRequest(request)) {
      return false;
    }
    switch (await this.availability()) {
      case 'readily':
        // Returns true only if a model is immediately available.
        return true;
      case 'after-download':
        // Triggers async model download.
        this.download();
      case 'no':
      default:
        return false;
    }
  }
  async generateContentOnDevice(
    request: GenerateContentRequest
  ): Promise<Response> {
    const createOptions = this.onDeviceParams || {};
    createOptions.initialPrompts ??= [];
    const extractedInitialPrompts = ChromeAdapter.toInitialPrompts(
      request.contents
    );
    // Assumes validation asserted there is at least one initial prompt.
    const prompt = extractedInitialPrompts.pop()!;
    createOptions.initialPrompts.push(...extractedInitialPrompts);
    const session = await this.session(createOptions);
    const result = await session.prompt(prompt.content);
    return ChromeAdapter.toResponse(result);
  }
  async generateContentStreamOnDevice(
    request: GenerateContentRequest
  ): Promise<Response> {
    const createOptions = this.onDeviceParams || {};
    createOptions.initialPrompts ??= [];
    const extractedInitialPrompts = ChromeAdapter.toInitialPrompts(
      request.contents
    );
    // Assumes validation asserted there is at least one initial prompt.
    const prompt = extractedInitialPrompts.pop()!;
    createOptions.initialPrompts.push(...extractedInitialPrompts);
    const session = await this.session(createOptions);
    const stream = await session.promptStreaming(prompt.content);
    return ChromeAdapter.toStreamResponse(stream);
  }
  async countTokens(request: CountTokensRequest): Promise<Response> {
    const options = this.onDeviceParams || {};
    const prompts = ChromeAdapter.toInitialPrompts(request.contents);
    const session = await this.session(options);
    const tokenCount = await session.countPromptTokens(prompts);
    return {
      json: async () => ({
        totalTokens: tokenCount,
        totalBillableCharacters: 0,
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
  private async availability(): Promise<AICapabilityAvailability | undefined> {
    return this.aiProvider?.languageModel
      .capabilities()
      .then((c: AILanguageModelCapabilities) => c.available);
  }
  private download(): void {
    if (this.isDownloading) {
      return;
    }
    this.isDownloading = true;
    this.downloadPromise = this.aiProvider?.languageModel
      .create(this.onDeviceParams)
      .then(() => {
        this.isDownloading = false;
      });
  }
  private static toOnDeviceRole(role: Role): AILanguageModelPromptRole {
    return role === 'model' ? 'assistant' : 'user';
  }
  private static toInitialPrompts(
    contents: Content[]
  ): AILanguageModelPrompt[] {
    return contents.map(c => ({
      role: ChromeAdapter.toOnDeviceRole(c.role),
      // Assumes contents have been verified to contain only a single TextPart.
      content: c.parts[0].text!
    }));
  }
  private async session(
    options: AILanguageModelCreateOptionsWithSystemPrompt
  ): Promise<AILanguageModel> {
    const newSession = await this.aiProvider!.languageModel.create(options);
    if (this.oldSession) {
      this.oldSession.destroy();
    }
    // Holds session reference, so model isn't unloaded from memory.
    this.oldSession = newSession;
    return newSession;
  }
  private static toResponse(text: string): Response {
    return {
      json: async () => ({
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
  private static toStreamResponse(
    stream: ReadableStream<string>
  ): Response {
    const encoder = new TextEncoder();
    return {
      body: stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            const json = JSON.stringify({
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [{ text: chunk }]
                  }
                }
              ]
            });
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
        })
      )
    } as Response;
  }
}
