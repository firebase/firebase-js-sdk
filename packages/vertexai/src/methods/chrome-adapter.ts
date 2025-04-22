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

import { VertexAIError } from '../errors';
import {
  CountTokensRequest,
  GenerateContentRequest,
  InferenceMode,
  Part,
  VertexAIErrorCode
} from '../types';
import {
  Availability,
  LanguageModel,
  LanguageModelCreateOptions,
  LanguageModelMessageContent
} from '../types/language-model';

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
   * Checks if a given request can be made on-device.
   *
   * <ol>Encapsulates a few concerns:
   *   <li>the mode</li>
   *   <li>API existence</li>
   *   <li>prompt formatting</li>
   *   <li>model availability, including triggering download if necessary</li>
   * </ol>
   *
   * <p>Pros: callers needn't be concerned with details of on-device availability.</p>
   * <p>Cons: this method spans a few concerns and splits request validation from usage.
   * If instance variables weren't already part of the API, we could consider a better
   * separation of concerns.</p>
   */
  async isAvailable(request: GenerateContentRequest): Promise<boolean> {
    if (this.mode === 'only_in_cloud') {
      return false;
    }
    console.log(this.languageModelProvider);
    const availability = await this.languageModelProvider?.availability();
    if (availability === Availability.downloadable) {
      // Triggers async model download.
      this.download();
    }
    if (this.mode === 'only_on_device') {
      return true;
    }
    // Applies prefer_on_device logic.
    return (
      availability === Availability.available &&
      ChromeAdapter.isOnDeviceRequest(request)
    );
  }

  /**
   * Generates content on device.
   *
   * <p>This is comparable to {@link GenerativeModel.generateContent} for generating content in
   * Cloud.</p>
   * @param request a standard Vertex {@link GenerateContentRequest}
   * @returns {@link Response}, so we can reuse common response formatting.
   */
  async generateContent(request: GenerateContentRequest): Promise<Response> {
    const session = await this.createSession(
      // TODO: normalize on-device params during construction.
      this.onDeviceParams || {}
    );
    // TODO: support multiple content objects when Chrome supports
    // sequence<LanguageModelMessage>
    const contents = await Promise.all(
      request.contents[0].parts.map(ChromeAdapter.toLanguageModelMessageContent)
    );
    const text = await session.prompt(contents);
    return ChromeAdapter.toResponse(text);
  }

  /**
   * Generates content stream on device.
   *
   * <p>This is comparable to {@link GenerativeModel.generateContentStream} for generating content in
   * Cloud.</p>
   * @param request a standard Vertex {@link GenerateContentRequest}
   * @returns {@link Response}, so we can reuse common response formatting.
   */
  async generateContentStream(
    request: GenerateContentRequest
  ): Promise<Response> {
    const session = await this.createSession(
      // TODO: normalize on-device params during construction.
      this.onDeviceParams || {}
    );
    // TODO: support multiple content objects when Chrome supports
    // sequence<LanguageModelMessage>
    const contents = await Promise.all(
      request.contents[0].parts.map(ChromeAdapter.toLanguageModelMessageContent)
    );
    const stream = await session.promptStreaming(contents);
    return ChromeAdapter.toStreamResponse(stream);
  }

  async countTokens(_request: CountTokensRequest): Promise<Response> {
    throw new VertexAIError(
      VertexAIErrorCode.REQUEST_ERROR,
      'Count Tokens is not yet available for on-device model.'
    );
  }

  /**
   * Asserts inference for the given request can be performed by an on-device model.
   */
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
    }

    return true;
  }

  /**
   * Triggers the download of an on-device model.
   *
   * <p>Chrome only downloads models as needed. Chrome knows a model is needed when code calls
   * LanguageModel.create.</p>
   *
   * <p>Since Chrome manages the download, the SDK can only avoid redundant download requests by
   * tracking if a download has previously been requested.</p>
   */
  private download(): void {
    if (this.isDownloading) {
      return;
    }
    this.isDownloading = true;
    const options = this.onDeviceParams || {};
    ChromeAdapter.addImageTypeAsExpectedInput(options);
    this.downloadPromise = this.languageModelProvider
      ?.create(options)
      .then(() => {
        this.isDownloading = false;
      });
  }

  /**
   * Converts a Vertex Part object to a Chrome LanguageModelMessageContent object.
   */
  private static async toLanguageModelMessageContent(
    part: Part
  ): Promise<LanguageModelMessageContent> {
    if (part.text) {
      return {
        type: 'text',
        content: part.text
      };
    } else if (part.inlineData) {
      const formattedImageContent = await fetch(
        `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      );
      const imageBlob = await formattedImageContent.blob();
      const imageBitmap = await createImageBitmap(imageBlob);
      return {
        type: 'image',
        content: imageBitmap
      };
    }
    // Assumes contents have been verified to contain only a single TextPart.
    // TODO: support other input types
    throw new Error('Not yet implemented');
  }

  /**
   * Abstracts Chrome session creation.
   *
   * <p>Chrome uses a multi-turn session for all inference. Vertex uses single-turn for all
   * inference. To map the Vertex API to Chrome's API, the SDK creates a new session for all
   * inference.</p>
   *
   * <p>Chrome will remove a model from memory if it's no longer in use, so this method ensures a
   * new session is created before an old session is destroyed.</p>
   */
  private async createSession(
    // TODO: define a default value, since these are optional.
    options: LanguageModelCreateOptions
  ): Promise<LanguageModel> {
    // TODO: could we use this.onDeviceParams instead of passing in options?
    ChromeAdapter.addImageTypeAsExpectedInput(options);
    const newSession = await this.languageModelProvider!.create(options);
    if (this.oldSession) {
      this.oldSession.destroy();
    }
    // Holds session reference, so model isn't unloaded from memory.
    this.oldSession = newSession;
    return newSession;
  }

  private static addImageTypeAsExpectedInput(
    options: LanguageModelCreateOptions
  ): void {
    options.expectedInputs = options.expectedInputs || [];
    options.expectedInputs.push({ type: 'image' });
  }

  /**
   * Formats string returned by Chrome as a {@link Response} returned by Vertex.
   */
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

  /**
   * Formats string stream returned by Chrome as SSE returned by Vertex.
   */
  private static toStreamResponse(stream: ReadableStream<string>): Response {
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
