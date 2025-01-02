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

import { VertexAI } from '../public-types';
import { Task, makeRequest } from '../requests/request';
import { createPredictRequestBody } from '../requests/request-helpers';
import { handlePredictResponse } from '../requests/response-helpers';
import {
  ImagenGCSImage,
  ImagenGCSImageResponse,
  ImagenGenerationConfig,
  ImagenInlineImage,
  RequestOptions,
  ImagenModelParams,
  ImagenInlineImageResponse,
  ImagenModelConfig
} from '../types';
import { VertexAIModel } from './vertexai-model';

/**
 * Class for Imagen model APIs.
 *
 * This class provides methods for generating images using the Imagen model.
 * You can generate images inline as base64-encoded strings, or directly to
 * Google Cloud Storage (GCS).
 *
 * @example
 * ```javascript
 * const imagen = new ImagenModel(vertexAI, {
 *   model: 'imagen-3.0-generate-001'
 * });
 *
 * const response = await imagen.generateImages('A photo of a cat');
 * console.log(response.images[0].bytesBase64Encoded);
 * ```
 *
 * @public
 */
export class ImagenModel extends VertexAIModel {
  /**
   * Model-level configurations to use when using Imagen.
   */
  readonly modelConfig: ImagenModelConfig;

  /**
   * Constructs a new instance of the {@link ImagenModel} class.
   *
   * @param vertexAI - An instance of the Vertex AI in Firebase SDK.
   * @param modelParams - Parameters to use when making Imagen requests.
   * @param requestOptions - Additional options to use when making requests.
   *
   * @throws If the `apiKey` or `projectId` fields are missing in your
   * Firebase config.
   */
  constructor(
    vertexAI: VertexAI,
    modelParams: ImagenModelParams,
    readonly requestOptions?: RequestOptions
  ) {
    const { model, ...modelConfig } = modelParams;
    super(vertexAI, model);
    this.modelConfig = modelConfig;
  }

  /**
   * Generates images using the Imagen model and returns them as
   * base64-encoded strings.
   *
   * @param prompt - The text prompt used to generate the images.
   * @param imagenRequestOptions - Configuration options for the Imagen
   * generation request.
   * See {@link ImagenGenerationConfig}.
   * @returns A promise that resolves to an {@link ImagenInlineImageResponse}
   * object containing the generated images.
   *
   * @throws If the request to generate images fails. This happens if the
   * prompt is blocked.
   *
   * @remarks
   * If one or more images are filtered, the returned object will have a
   * defined `filteredReason` property. If all images are filtered, the
   * `images` array will be empty, and no error will be thrown.
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
   * Generates images to Google Cloud Storage (GCS) using the Imagen model.
   *
   * @param prompt - The text prompt used to generate the images.
   * @param gcsURI - The GCS URI where the images should be stored.
   * This should be a directory. For example, `gs://my-bucket/my-directory/`.
   * @param imagenRequestOptions - Configuration options for the Imagen
   * generation request. See {@link ImagenGenerationConfig}.
   * @returns A promise that resolves to an {@link ImagenGCSImageResponse}
   * object containing the URLs of the generated images.
   *
   * @throws If the request fails to generate images fails. This happens if
   * the prompt is blocked.
   *
   * @remarks
   * If one or more images are filtered due to safety reasons, the returned object
   * will have a defined `filteredReason` property. If all images are filtered,
   * the `images` array will be empty, and no error will be thrown.
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
