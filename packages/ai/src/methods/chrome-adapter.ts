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

import { getGlobal } from '@firebase/util';
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
import { ChromeAdapter, OnDeviceStatus } from '../types/chrome-adapter';
import {
  Availability,
  LanguageModel,
  LanguageModelExpected,
  LanguageModelMessage,
  LanguageModelMessageContent,
  LanguageModelMessageRole
} from '../types/language-model';

// Defaults to English text. This can be overriden by user config.
const defaultExpectedText: LanguageModelExpected = {
  type: 'text',
  languages: ['en']
};

export const defaultExpectedInputs: LanguageModelExpected[] = [
  defaultExpectedText,
  { type: 'image' }
];

export const defaultExpectedOutputs: LanguageModelExpected[] = [
  defaultExpectedText
];

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device inference is
 * possible.
 */
export class ChromeAdapterImpl implements ChromeAdapter {
  // Visible for testing
  static SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png'];
  // Promise for on-device model download completion
  downloadPromise: Promise<LanguageModel | void> | null = null;
  // Whether initializeDeviceModel() has requested a download. Reset if the
  // download fails, so the developer has to call it again.
  private downloadRequested = false;
  private oldSession: LanguageModel | undefined;
  onDeviceParams: OnDeviceParams = {
    createOptions: {
      expectedInputs: defaultExpectedInputs,
      expectedOutputs: defaultExpectedOutputs
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
          expectedInputs: defaultExpectedInputs,
          expectedOutputs: defaultExpectedOutputs
        };
      } else {
        if (!this.onDeviceParams.createOptions.expectedInputs) {
          this.onDeviceParams.createOptions.expectedInputs =
            defaultExpectedInputs;
        }
        if (!this.onDeviceParams.createOptions.expectedOutputs) {
          this.onDeviceParams.createOptions.expectedOutputs =
            defaultExpectedOutputs;
        }
      }
    }
  }

  /**
   * Checks if the on-device model is ready to handle a given request right
   * now. Doesn't wait for downloads or take the inference mode into account.
   */
  async isAvailable(request: GenerateContentRequest): Promise<boolean> {
    return (await this.getOnDeviceStatus(request)) === 'available';
  }

  /**
   * Reports whether the on-device model can handle a given request.
   *
   * This only describes what the device can do. Decisions that depend on the
   * inference mode (falling back to the cloud, or throwing) are made by the
   * caller in `callCloudOrDevice()`.
   *
   * @param request - A potential request to be passed to the model.
   * @param options.waitForDownload - If a download started by
   * `initializeDeviceModel()` is in progress, wait for it to finish instead of
   * returning `download-in-progress`.
   */
  async getOnDeviceStatus(
    request: GenerateContentRequest,
    options: { waitForDownload?: boolean } = {}
  ): Promise<OnDeviceStatus> {
    const availability = await this.languageModelProvider?.availability(
      this.onDeviceParams.createOptions
    );

    if (
      availability === Availability.DOWNLOADABLE ||
      availability === Availability.DOWNLOADING
    ) {
      if (!this.downloadRequested) {
        logger.debug(
          `On-device model needs to be downloaded, but initializeDeviceModel() has not been called.`
        );
        return 'not-initialized';
      }
      if (this.downloadPromise) {
        if (!options.waitForDownload) {
          return 'download-in-progress';
        }
        logger.debug(`Waiting for download of LanguageModel to complete.`);
        try {
          await this.downloadPromise;
        } catch (e) {
          throw new AIError(AIErrorCode.ERROR, (e as Error).message);
        }
      }
    } else if (availability !== Availability.AVAILABLE) {
      logger.debug(
        `On-device inference unavailable because availability is "${availability}".`
      );
      return 'unavailable';
    }

    if (!ChromeAdapterImpl.isOnDeviceRequest(request)) {
      logger.debug(
        `On-device inference unavailable because request is incompatible.`
      );
      return 'request-not-supported';
    }

    return 'available';
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
      if (content.parts.some(part => 'functionResponse' in part)) {
        logger.debug(
          `Content with a function response part rejected for on-device inference.`
        );
        return false;
      }

      // Returns false if request contains an image with an unsupported mime type.
      for (const part of content.parts) {
        if (
          'inlineData' in part &&
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
  async downloadIfAvailable(
    onDownloadProgress?: (progressValue: number) => void
  ): Promise<Availability | undefined> {
    const availability = await this.languageModelProvider?.availability(
      this.onDeviceParams.createOptions
    );

    /**
     * Download may have been automatically started by Chrome or other
     * code, in which case we should still call create() to get a promise
     * for when the download completes.
     */
    if (
      availability === Availability.DOWNLOADABLE ||
      availability === Availability.DOWNLOADING
    ) {
      this.download(onDownloadProgress);
    }

    return availability;
  }

  /**
   * Triggers out-of-band download of an on-device model.
   *
   * Chrome may automatically begin a download on startup or
   * it may trigger a download when code calls LanguageModel.create.
   *
   * Since Chrome manages the download, the SDK can only avoid redundant download requests by
   * tracking if a download has previously been requested.
   */
  private download(onDownloadProgress?: (progressValue: number) => void): void {
    if (this.downloadPromise) {
      return;
    }
    const options = { ...this.onDeviceParams.createOptions };
    if (options && !options.monitor && onDownloadProgress) {
      options.monitor = m => {
        m.addEventListener('downloadprogress', e => {
          onDownloadProgress(e.loaded);
        });
      };
    }
    this.downloadRequested = true;
    const download = this.languageModelProvider?.create(options);
    // If the download fails, initializeDeviceModel() has to be called again.
    download?.catch(() => {
      this.downloadRequested = false;
    });
    this.downloadPromise =
      download?.finally(() => {
        this.downloadPromise = null;
      }) ?? null;
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
    if ('text' in part && typeof part.text === 'string') {
      return {
        type: 'text',
        value: part.text
      };
    } else if ('inlineData' in part && part.inlineData) {
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
    /**
     * Note: `create()` will trigger a download as a side effect if
     * a model is not downloaded or downloading, but this specific
     * create() call should not be relied on for the download. The download
     * should be triggered explicitly by the user in
     * GenerativeModel.initializeDeviceModel().
     */
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
  const globalObj = window || getGlobal();
  const languageModel = (globalObj as Record<string, unknown>).LanguageModel as
    LanguageModel | undefined;
  // Do not initialize a ChromeAdapter if we are not in hybrid mode.
  if (languageModel && mode) {
    return new ChromeAdapterImpl(languageModel, mode, params);
  }
}
