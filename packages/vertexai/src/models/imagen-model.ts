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

import { VertexAI } from '../public-types';
import { Task, makeRequest } from '../requests/request';
import { createPredictRequestBody } from '../requests/request-helpers';
import { handlePredictResponse } from '../requests/response-helpers';
import {
  ImagenGCSImage,
  ImagenGenerationConfig,
  ImagenInlineImage,
  RequestOptions,
  ImagenModelParams,
  ImagenGenerationResponse,
  ImagenSafetySettings
} from '../types';
import { VertexAIModel } from './vertexai-model';

/**
 * Class for Imagen model APIs.
 *
 * This class provides methods for generating images using the Imagen model.
 *
 * @example
 * ```javascript
 * const imagen = new ImagenModel(
 *   vertexAI,
 *   {
 *     model: 'imagen-3.0-generate-001'
 *   }
 * );
 *
 * const response = await imagen.generateImages('A photo of a cat');
 * if (response.images.length > 0) {
 *   console.log(response.images[0].bytesBase64Encoded);
 * }
 * ```
 *
 * @public
 */
export class ImagenModel extends VertexAIModel {
  /**
   * The Imagen Generation Configuration.
   */
  generationConfig?: ImagenGenerationConfig;
  /**
   * Safety settings for filtering inappropriate content.
   */
  safetySettings?: ImagenSafetySettings;

  /**
   * Constructs a new instance of the <code>{@link ImagenModel}</code> class.
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
    public requestOptions?: RequestOptions
  ) {
    const { model, generationConfig, safetySettings } = modelParams;
    super(vertexAI, model);
    this.generationConfig = generationConfig;
    this.safetySettings = safetySettings;
  }

  /**
   * Generates images using the Imagen model and returns them as
   * base64-encoded strings.
   *
   * @beta
   * For Vertex AI in Firebase, image generation using Imagen 3 models is in Public Preview, which
   * means that the feature is not subject to any SLA or deprecation policy and could change in
   * backwards-incompatible ways.
   *
   * @param prompt - A text prompt describing the image(s) to generate.
   * @returns A promise that resolves to an {@link ImagenGenerationResponse}
   * object containing the generated images.
   *
   * @throws If the request to generate images fails. This happens if the
   * prompt is blocked.
   *
   * @remarks
   * If the prompt was not blocked, but one or more of the generated images were filtered, the
   * returned object will have a `filteredReason` property.
   * If all images are filtered, the `images` array will be empty.
   */
  async generateImages(
    prompt: string
  ): Promise<ImagenGenerationResponse<ImagenInlineImage>> {
    const body = createPredictRequestBody(prompt, {
      ...this.generationConfig,
      ...this.safetySettings
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
   * @beta
   * For Vertex AI in Firebase, image generation using Imagen 3 models is in Public Preview, which
   * means that the feature is not subject to any SLA or deprecation policy and could change in
   * backwards-incompatible ways.
   *
   * @param prompt - A text prompt describing the image(s) to generate.
   * @param gcsURI - The Google Cloud Storage (GCS) URI where the images should be stored.
   * This should be a directory. For example, `gs://my-bucket/my-directory/`.
   * @returns A promise that resolves to an <code>{@link ImagenGenerationResponse}</code>
   * object containing the URLs of the generated images.
   *
   * @throws If the request fails to generate images fails. This happens if
   * the prompt is blocked.
   *
   * @remarks
   * If the prompt was not blocked, but one or more of the generated images were filtered, the
   * returned object will have a `filteredReason` property.
   * If all images are filtered, the `images` array will be empty.
   */
  async generateImagesGCS(
    prompt: string,
    gcsURI: string
  ): Promise<ImagenGenerationResponse<ImagenGCSImage>> {
    const body = createPredictRequestBody(prompt, {
      gcsURI,
      ...this.generationConfig,
      ...this.safetySettings
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
