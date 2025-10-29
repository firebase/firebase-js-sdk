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

import { AIError } from '../errors';
import { logger } from '../logger';
import {
  CountTokensRequest,
  GenerateContentRequest,
  InferenceMode,
  Part,
  AIErrorCode,
  OnDeviceParams,
  Content,
  Role
} from '../types';
import { ChromeAdapter } from '../types/chrome-adapter';
import {
  Availability,
  LanguageModel,
  LanguageModelExpected,
  LanguageModelMessage,
  LanguageModelMessageContent,
  LanguageModelMessageRole
} from '../types/language-model';

// Defaults to support image inputs for convenience.
const defaultExpectedInputs: LanguageModelExpected[] = [{ type: 'image' }];

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device inference is
 * possible.
 */
export class ChromeAdapterImpl implements ChromeAdapter {
  // Visible for testing
  static SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png'];
  private isDownloading = false;
  private downloadPromise: Promise<LanguageModel | void> | undefined;
  private oldSession: LanguageModel | undefined;
  onDeviceParams: OnDeviceParams = {
    createOptions: {
      expectedInputs: defaultExpectedInputs
    }
  };
  constructor(
    public languageModelProvider: LanguageModel,
    public mode: InferenceMode,
    onDeviceParams?: OnDeviceParams
  ) {
    if (onDeviceParams) {
      this.onDeviceParams = onDeviceParams;
      if (!this.onDeviceParams.createOptions) {
        this.onDeviceParams.createOptions = {
          expectedInputs: defaultExpectedInputs
        };
      } else if (!this.onDeviceParams.createOptions.expectedInputs) {
        this.onDeviceParams.createOptions.expectedInputs =
          defaultExpectedInputs;
      }
    }
  }

  /**
   * Checks if a given request can be made on-device.
   *
   * Encapsulates a few concerns:
   *   the mode
   *   API existence
   *   prompt formatting
   *   model availability, including triggering download if necessary
   *
   *
   * Pros: callers needn't be concerned with details of on-device availability.</p>
   * Cons: this method spans a few concerns and splits request validation from usage.
   * If instance variables weren't already part of the API, we could consider a better
   * separation of concerns.
   */
  async isAvailable(request: GenerateContentRequest): Promise<boolean> {
    if (!this.mode) {
      logger.debug(
        `On-device inference unavailable because mode is undefined.`
      );
      return false;
    }
    if (this.mode === InferenceMode.ONLY_IN_CLOUD) {
      logger.debug(
        `On-device inference unavailable because mode is "only_in_cloud".`
      );
      return false;
    }

    // Triggers out-of-band download so model will eventually become available.
    const availability = await this.downloadIfAvailable();

    if (this.mode === InferenceMode.ONLY_ON_DEVICE) {
      // If it will never be available due to API inavailability, throw.
      if (availability === Availability.UNAVAILABLE) {
        throw new AIError(
          AIErrorCode.API_NOT_ENABLED,
          'Local LanguageModel API not available in this environment.'
        );
      } else if (
        availability === Availability.DOWNLOADABLE ||
        availability === Availability.DOWNLOADING
      ) {
        // TODO(chholland): Better user experience during download - progress?
        logger.debug(`Waiting for download of LanguageModel to complete.`);
        await this.downloadPromise;
        return true;
      }
      return true;
    }

    // Applies prefer_on_device logic.
    if (availability !== Availability.AVAILABLE) {
      logger.debug(
        `On-device inference unavailable because availability is "${availability}".`
      );
      return false;
    }
    if (!ChromeAdapterImpl.isOnDeviceRequest(request)) {
      logger.debug(
        `On-device inference unavailable because request is incompatible.`
      );
      return false;
    }

    return true;
  }

  /**
   * Generates content on device.
   *
   * @remarks
   * This is comparable to {@link GenerativeModel.generateContent} for generating content in
   * Cloud.
   * @param request - a standard Firebase AI {@link GenerateContentRequest}
   * @returns {@link Response}, so we can reuse common response formatting.
   */
  async generateContent(request: GenerateContentRequest): Promise<Response> {
    const session = await this.createSession();
    const contents = await Promise.all(
      request.contents.map(ChromeAdapterImpl.toLanguageModelMessage)
    );
    const text = await session.prompt(
      contents,
      this.onDeviceParams.promptOptions
    );
    return ChromeAdapterImpl.toResponse(text);
  }

  /**
   * Generates content stream on device.
   *
   * @remarks
   * This is comparable to {@link GenerativeModel.generateContentStream} for generating content in
   * Cloud.
   * @param request - a standard Firebase AI {@link GenerateContentRequest}
   * @returns {@link Response}, so we can reuse common response formatting.
   */
  async generateContentStream(
    request: GenerateContentRequest
  ): Promise<Response> {
    const session = await this.createSession();
    const contents = await Promise.all(
      request.contents.map(ChromeAdapterImpl.toLanguageModelMessage)
    );
    const stream = session.promptStreaming(
      contents,
      this.onDeviceParams.promptOptions
    );
    return ChromeAdapterImpl.toStreamResponse(stream);
  }

  async countTokens(_request: CountTokensRequest): Promise<Response> {
    throw new AIError(
      AIErrorCode.REQUEST_ERROR,
      'Count Tokens is not yet available for on-device model.'
    );
  }

  /**
   * Asserts inference for the given request can be performed by an on-device model.
   */
  private static isOnDeviceRequest(request: GenerateContentRequest): boolean {
    // Returns false if the prompt is empty.
    if (request.contents.length === 0) {
      logger.debug('Empty prompt rejected for on-device inference.');
      return false;
    }

    for (const content of request.contents) {
      if (content.role === 'function') {
        logger.debug(`"Function" role rejected for on-device inference.`);
        return false;
      }

      // Returns false if request contains an image with an unsupported mime type.
      for (const part of content.parts) {
        if (
          part.inlineData &&
          ChromeAdapterImpl.SUPPORTED_MIME_TYPES.indexOf(
            part.inlineData.mimeType
          ) === -1
        ) {
          logger.debug(
            `Unsupported mime type "${part.inlineData.mimeType}" rejected for on-device inference.`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Encapsulates logic to get availability and download a model if one is downloadable.
   */
  private async downloadIfAvailable(): Promise<Availability | undefined> {
    const availability = await this.languageModelProvider?.availability(
      this.onDeviceParams.createOptions
    );

    if (availability === Availability.DOWNLOADABLE) {
      this.download();
    }

    return availability;
  }

  /**
   * Triggers out-of-band download of an on-device model.
   *
   * Chrome only downloads models as needed. Chrome knows a model is needed when code calls
   * LanguageModel.create.
   *
   * Since Chrome manages the download, the SDK can only avoid redundant download requests by
   * tracking if a download has previously been requested.
   */
  private download(): void {
    if (this.isDownloading) {
      return;
    }
    this.isDownloading = true;
    this.downloadPromise = this.languageModelProvider
      ?.create(this.onDeviceParams.createOptions)
      .finally(() => {
        this.isDownloading = false;
      });
  }

  /**
   * Converts Firebase AI {@link Content} object to a Chrome {@link LanguageModelMessage} object.
   */
  private static async toLanguageModelMessage(
    content: Content
  ): Promise<LanguageModelMessage> {
    const languageModelMessageContents = await Promise.all(
      content.parts.map(ChromeAdapterImpl.toLanguageModelMessageContent)
    );
    return {
      role: ChromeAdapterImpl.toLanguageModelMessageRole(content.role),
      content: languageModelMessageContents
    };
  }

  /**
   * Converts a Firebase AI Part object to a Chrome LanguageModelMessageContent object.
   */
  private static async toLanguageModelMessageContent(
    part: Part
  ): Promise<LanguageModelMessageContent> {
    if (part.text) {
      return {
        type: 'text',
        value: part.text
      };
    } else if (part.inlineData) {
      const formattedImageContent = await fetch(
        `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      );
      const imageBlob = await formattedImageContent.blob();
      const imageBitmap = await createImageBitmap(imageBlob);
      return {
        type: 'image',
        value: imageBitmap
      };
    }
    throw new AIError(
      AIErrorCode.REQUEST_ERROR,
      `Processing of this Part type is not currently supported.`
    );
  }

  /**
   * Converts a Firebase AI {@link Role} string to a {@link LanguageModelMessageRole} string.
   */
  private static toLanguageModelMessageRole(
    role: Role
  ): LanguageModelMessageRole {
    // Assumes 'function' rule has been filtered by isOnDeviceRequest
    return role === 'model' ? 'assistant' : 'user';
  }

  /**
   * Abstracts Chrome session creation.
   *
   * Chrome uses a multi-turn session for all inference. Firebase AI uses single-turn for all
   * inference. To map the Firebase AI API to Chrome's API, the SDK creates a new session for all
   * inference.
   *
   * Chrome will remove a model from memory if it's no longer in use, so this method ensures a
   * new session is created before an old session is destroyed.
   */
  private async createSession(): Promise<LanguageModel> {
    if (!this.languageModelProvider) {
      throw new AIError(
        AIErrorCode.UNSUPPORTED,
        'Chrome AI requested for unsupported browser version.'
      );
    }
    const newSession = await this.languageModelProvider.create(
      this.onDeviceParams.createOptions
    );
    if (this.oldSession) {
      this.oldSession.destroy();
    }
    // Holds session reference, so model isn't unloaded from memory.
    this.oldSession = newSession;
    return newSession;
  }

  /**
   * Formats string returned by Chrome as a {@link Response} returned by Firebase AI.
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
   * Formats string stream returned by Chrome as SSE returned by Firebase AI.
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

/**
 * Creates a ChromeAdapterImpl on demand.
 */
export function chromeAdapterFactory(
  mode: InferenceMode,
  window?: Window,
  params?: OnDeviceParams
): ChromeAdapterImpl | undefined {
  // Do not initialize a ChromeAdapter if we are not in hybrid mode.
  if (typeof window !== 'undefined' && mode) {
    return new ChromeAdapterImpl(
      (window as Window).LanguageModel as LanguageModel,
      mode,
      params
    );
  }
}
