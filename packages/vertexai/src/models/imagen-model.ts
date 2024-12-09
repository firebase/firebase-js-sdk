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

import { VertexAIError } from '../errors';
import { VertexAI } from '../public-types';
import { Task, makeRequest } from '../requests/request';
import { createPredictRequestBody } from '../requests/request-helpers';
import { handlePredictResponse } from '../requests/response-helpers';
import { VertexAIService } from '../service';
import {
  ImagenGCSImage,
  ImagenGCSImageResponse,
  ImagenImageFormat,
  ImagenGenerationConfig,
  ImagenInlineImage,
  RequestOptions,
  VertexAIErrorCode,
  ImagenModelParams,
  ImagenInlineImageResponse,
  ImagenModelConfig
} from '../types';
import { ApiSettings } from '../types/internal';

/**
 * Class for Imagen model APIs.
 * @public
 */
export class ImagenModel {
  model: string;
  private _apiSettings: ApiSettings;
  private modelConfig: ImagenModelConfig;

  /**
   *
   * @param vertexAI
   * @param modelParams
   * @param requestOptions
   */
  constructor(
    vertexAI: VertexAI,
    modelParams: ImagenModelParams,
    private requestOptions?: RequestOptions
  ) {
    const { model, ...modelConfig } = modelParams;
    this.modelConfig = modelConfig;
    if (model.includes('/')) {
      if (model.startsWith('models/')) {
        // Add "publishers/google" if the user is only passing in 'models/model-name'.
        this.model = `publishers/google/${model}`;
      } else {
        // Any other custom format (e.g. tuned models) must be passed in correctly.
        this.model = model;
      }
    } else {
      // If path is not included, assume it's a non-tuned model.
      this.model = `publishers/google/models/${model}`;
    }

    if (!vertexAI.app?.options?.apiKey) {
      throw new VertexAIError(
        VertexAIErrorCode.NO_API_KEY,
        `The "apiKey" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid API key.`
      );
    } else if (!vertexAI.app?.options?.projectId) {
      throw new VertexAIError(
        VertexAIErrorCode.NO_PROJECT_ID,
        `The "projectId" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid project ID.`
      );
    } else {
      this._apiSettings = {
        apiKey: vertexAI.app.options.apiKey,
        project: vertexAI.app.options.projectId,
        location: vertexAI.location
      };
      if ((vertexAI as VertexAIService).appCheck) {
        this._apiSettings.getAppCheckToken = () =>
          (vertexAI as VertexAIService).appCheck!.getToken();
      }

      if ((vertexAI as VertexAIService).auth) {
        this._apiSettings.getAuthToken = () =>
          (vertexAI as VertexAIService).auth!.getToken();
      }
    }
  }

  /**
   * Generates images using the Imagen model and returns them as base64-encoded strings.
   *
   * @param prompt The text prompt used to generate the images.
   * @param imagenRequestOptions Configuration options for the Imagen generation request.
   * See {@link ImagenGenerationConfig}.
   * @returns A promise that resolves to an {@link ImagenInlineImageResponse} object containing the generated images.
   *
   * @throws If the request fails or if the prompt is blocked, throws a {@link VertexAIError}.
   *
   * @remarks
   * If one or more images are filtered, the returned object will have a defined `filteredReason` property.
   * If all images are filtered, the `images` array will be empty, and no error will be thrown.
   */
  async generateImages(
    prompt: string,
    imagenRequestOptions?: ImagenGenerationConfig
  ): Promise<ImagenInlineImageResponse> {
    const body = createPredictRequestBody({
      prompt,
      ...imagenRequestOptions,
      ...this.modelConfig
    });
    const response = await makeRequest(
      this.model,
      Task.PREDICT,
      this._apiSettings,
      /* stream */ false,
      JSON.stringify(body),
      this.requestOptions
    );
    return handlePredictResponse<ImagenInlineImage>(response);
  }

  /**
   * Generates images using the Imagen model and returns them as base64-encoded strings.
   *
   * @param prompt The text prompt used to generate the images.
   * @param gcsURI The GCS URI where the images should be stored.
   * @param imagenRequestOptions Configuration options for the Imagen generation request.
   * See {@link ImagenGenerationConfig}.
   * @returns A promise that resolves to an {@link ImagenGCSImageResponse} object containing the generated images.
   *
   * @throws If the request fails or if the prompt is blocked, throws a {@link VertexAIError}.
   *
   * @remarks
   * If one or more images are filtered, the returned object will have a defined `filteredReason` property.
   * If all images are filtered, the `images` array will be empty, and no error will be thrown.
   */
  async generateImagesGCS(
    prompt: string,
    gcsURI: string,
    imagenRequestOptions?: ImagenGenerationConfig
  ): Promise<ImagenGCSImageResponse> {
    const body = createPredictRequestBody({
      prompt,
      gcsURI,
      ...imagenRequestOptions,
      ...this.modelConfig
    });
    const response = await makeRequest(
      this.model,
      Task.PREDICT,
      this._apiSettings,
      /* stream */ false,
      JSON.stringify(body),
      this.requestOptions
    );
    return handlePredictResponse<ImagenGCSImage>(response);
  }
}

/**
 * Creates an {@link ImagenImageFormat} for a JPEG image, to be included in an {@link ImagenModelParams}.
 *
 * @param compressionQuality The level of compression.
 * @returns {@link ImagenImageFormat}
 *
 * @public
 */
export function jpeg(compressionQuality: number): ImagenImageFormat {
  return {
    mimeType: 'image/jpeg',
    compressionQuality
  };
}

/**
 * Creates an {@link ImageImageFormat} for a PNG image, to be included in a {@link ImagenModelParams}.
 *
 * @returns {@link ImageImageFormat}
 *
 * @public
 */
export function png(): ImagenImageFormat {
  return {
    mimeType: 'image/png'
  };
}
