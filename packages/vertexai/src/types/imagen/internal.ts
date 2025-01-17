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

import { ImagenGenerationConfig, ImagenModelConfig } from './requests';

/**
 * A response from the REST API is expected to look like this in the success case:
 * {
 *   "predictions": [
 *     {
 *       "mimeType": "image/png",
 *       "bytesBase64Encoded": "iVBORw0KG..."
 *     },
 *     {
 *       "mimeType": "image/png",
 *       "bytesBase64Encoded": "i4BOtw0KG..."
 *     }
 *   ]
 * }
 *
 * And like this in the failure case:
 * {
 *   "predictions": [
 *     {
 *       "raiFilteredReason": "..."
 *     }
 *   ]
 * }
 */
export interface ImagenResponseInternal {
  predictions?: Array<{
    /**
     * The MIME type of the generated image.
     */
    mimeType?: string;
    /**
     * The image data encoded as a base64 string.
     */
    bytesBase64Encoded?: string;

    gcsUri?: string;

    /**
     * The reason why the image was filtered.
     */
    raiFilteredReason?: string;
  }>;
}

/**
 * The parameters to be sent in the request body of the HTTP call
 * to the Vertex AI backend.
 *
 * We need a seperate internal-only interface for this because the REST
 * API expects different parameter names than what we show to our users.
 *
 * This interface should be populated from the ImagenGenerationConfig that
 * the user defines.
 *
 * Sample request body JSON:
 * {
 *   "instances": [
 *     {
 *       "prompt": "Portrait of a golden retriever on a beach."
 *     }
 *   ],
 *   "parameters": {
 *     "mimeType": "image/png",
 *     "safetyFilterLevel": "block_low_and_above",
 *     "personGeneration": "allow_all",
 *     "sampleCount": 2,
 *     "includeRaiReason": true,
 *     "aspectRatio": "9:16"
 *   }
 * }
 *
 * @internal
 */
export interface PredictRequestBody {
  instances: [
    {
      prompt: string;
    }
  ];
  parameters: {
    sampleCount: number; // Maps to numberOfImages
    aspectRatio: string;
    mimeType: string;
    compressionQuality?: number;
    negativePrompt?: string;
    storageUri?: string; // Maps to gcsURI
    addWatermark?: boolean;
    safetyFilterLevel?: string;
    personGeneration?: string; // Maps to personFilterLevel
    includeRaiReason: boolean;
  };
}

/**
 * Contains all possible REST API paramaters.
 * This is the union of model-level (`ImagenModelParams`),
 * request-level (`ImagenGenerationConfig`) configurations, prompt,
 * and gcsURI (for GCS generation only).
 *
 * @internal
 */
export interface ImagenRequestConfig
  extends ImagenModelConfig,
    ImagenGenerationConfig {
  /**
   * The text prompt used to generate the images.
   */
  prompt: string;
  /**
   * The Google Cloud Storage (GCS) URI where the images should be stored
   * (for GCS requests only).
   */
  gcsURI?: string;
}
