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

import { ImagenImageFormat } from '../../requests/imagen-image-format';

/**
 * Parameters for configuring an {@link ImagenModel}.
 *
 * @public
 */
export interface ImagenModelParams {
  /**
   * The Imagen model to use for generating images.
   * For example: `imagen-3.0-generate-001`.
   */
  model: string;
  /**
   * The Imagen Generation Configuration.
   */
  generationConfig?: ImagenGenerationConfig;
  /**
   * Safety settings for filtering inappropriate content.
   */
  safetySettings?: ImagenSafetySettings;
}

/**
 * Configuration options for generating images with Imagen.
 *
 * See the [Google Cloud Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api#rest_1).
 *
 * @public
 */
export interface ImagenGenerationConfig {
  /**
   * A description of what should be omitted from the generated images.
   */
  negativePrompt?: string;
  /**
   * The number of images to generate. Must be between 1 and 4. The default value is 1.
   */
  numberOfImages?: number;
  /**
   * The aspect ratio of the generated images. The default value is 1:1.
   * used.
   */
  aspectRatio?: ImagenAspectRatio;
  /**
   * The image format of the generated images. The default is PNG.
   */
  imageFormat?: ImagenImageFormat;
  /**
   * If true, adds a SynthID watermark to the generated images.
   */
  addWatermark?: boolean;
}

/**
 * Safety filter levels for Imagen
 *
 * @public
 */
export enum ImagenSafetyFilterLevel {
  /**
   * Block images with low or higher safety severity.
   */
  BLOCK_LOW_AND_ABOVE = 'block_low_and_above',
  /**
   * Block images with medium or higher safety severity.
   */
  BLOCK_MEDIUM_AND_ABOVE = 'block_medium_and_above',
  /**
   * Block images with high safety severity.
   */
  BLOCK_ONLY_HIGH = 'block_only_high',
  /**
   * Do not block any images based on safety.
   */
  BLOCK_NONE = 'block_none'
}

/**
 * Person filter levels for Imagen.
 *
 * @public
 */
export enum ImagenPersonFilterLevel {
  /**
   * Do not allow any person generation.
   */
  BLOCK_ALL = 'dont_allow',
  /**
   * Allow only adults in generated images.
   */
  ALLOW_ADULT = 'allow_adult',
  /**
   * Allow all person generation.
   */
  ALLOW_ALL = 'allow_all'
}

/**
 * Safety settings for Imagen.
 *
 * @public
 */
export interface ImagenSafetySettings {
  /**
   * The safety filter level to use.
   */
  safetyFilterLevel?: ImagenSafetyFilterLevel;
  /**
   * The person filter level to use.
   */
  personFilterLevel?: ImagenPersonFilterLevel;
}

/**
 * Aspect ratios for Imagen images.
 *
 * @public
 */
export enum ImagenAspectRatio {
  /**
   * Square 1:1 aspect ratio.
   */
  SQUARE = '1:1',
  /**
   * Landscape 3:4 aspect ratio.
   */
  LANDSCAPE_3x4 = '3:4',
  /**
   * Portrait 4:3 aspect ratio.
   */
  PORTRAIT_4x3 = '4:3',
  /**
   * Landscape 16:9 aspect ratio.
   */
  LANDSCAPE_16x9 = '16:9',
  /**
   * Portrait 9:16 aspect ratio.
   */
  PORTRAIT_9x16 = '9:16'
}
