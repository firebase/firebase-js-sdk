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

export interface ImagenModelParams extends ImagenModelConfig {
  model: string;
}

export interface ImagenModelConfig {
  imageFormat?: ImagenImageFormat;
  addWatermark?: boolean;
  safetySettings?: ImagenSafetySettings;
}

export interface ImagenGenerationConfig {
  numberOfImages?: number; // Default to 1. Possible values are [1...4]
  negativePrompt?: string; // Default to null
  aspectRatio?: ImagenAspectRatio; // Default to "1:1"
}

/**
 * Contains all possible REST API paramaters.
 * This is the intersection of the model-level (`ImagenModelParams`),
 * request-level (`ImagenGenerationConfig`) configurations, along with
 * the other required parameters prompt and gcsURI (for GCS generation only).
 *
 * @internal
 */
export interface ImagenRequestConfig
  extends ImagenModelConfig,
    ImagenGenerationConfig {
  prompt: string;
  gcsURI?: string;
}

export interface ImagenImageFormat {
  mimeType: string; // image/png, or image/jpeg, default image/png
  compressionQuality?: number; // 0-100, default 75. Only for image/jpeg
}

/**
 * @public
 */
export enum ImagenSafetyFilterLevel {
  BLOCK_LOW_AND_ABOVE = 'block_low_and_above',
  BLOCK_MEDIUM_AND_ABOVE = 'block_medium_and_above',
  BLOCK_ONLY_HIGH = 'block_only_high',
  BLOCK_NONE = 'block_none'
}

/**
 * @public
 */
export enum ImagenPersonFilterLevel {
  BLOCK_ALL = 'dont_allow',
  ALLOW_ADULT = 'allow_adult',
  ALLOW_ALL = 'allow_all'
}

/**
 * @public
 */
export interface ImagenSafetySettings {
  /**
   * Safety filter level
   */
  safetyFilterLevel?: ImagenSafetyFilterLevel;
  /**
   * Generate people.
   */
  personFilterLevel?: ImagenPersonFilterLevel;
}

export enum ImagenAspectRatio {
  SQUARE = '1:1',
  CLASSIC_PORTRAIT = '3:4',
  CLASSIC_LANDSCAPE = '4:3',
  WIDESCREEN = '16:9',
  PORTRAIT = '9:16'
}

/**
 * The parameters to be sent in the request body of the HTTP call
 * to the Vertex AI backend.
 *
 * We need a seperate internal-only interface for this because the REST
 * API expects different parameter names than what we show to our users.
 *
 * This interface should be populated from the {@link ImagenGenerationConfig} that
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
    sampleCount: number; // maps to numberOfImages
    aspectRatio: string;
    mimeType: string;
    compressionQuality?: number;
    negativePrompt?: string;
    storageUri?: string;
    addWatermark?: boolean;
    safetyFilterLevel?: string;
    personGeneration?: string;
    includeRaiReason: boolean;
  };
}
