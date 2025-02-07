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

export class ImagenModel extends VertexAIModel {
  generationConfig?: ImagenGenerationConfig;
  safetySettings?: ImagenSafetySettings;

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
