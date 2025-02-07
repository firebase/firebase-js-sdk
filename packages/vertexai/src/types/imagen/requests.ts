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

import { ImagenImageFormat } from '../../requests/imagen-image-format';

export interface ImagenModelParams {
  model: string;
  generationConfig?: ImagenGenerationConfig;
  safetySettings?: ImagenSafetySettings;
}

export interface ImagenGenerationConfig {
  negativePrompt?: string;
  numberOfImages?: number;
  aspectRatio?: ImagenAspectRatio;
  imageFormat?: ImagenImageFormat;
  addWatermark?: boolean;
}

export enum ImagenSafetyFilterLevel {
  BLOCK_LOW_AND_ABOVE = 'block_low_and_above',
  BLOCK_MEDIUM_AND_ABOVE = 'block_medium_and_above',
  BLOCK_ONLY_HIGH = 'block_only_high',
  BLOCK_NONE = 'block_none'
}

export enum ImagenPersonFilterLevel {
  BLOCK_ALL = 'dont_allow',
  ALLOW_ADULT = 'allow_adult',
  ALLOW_ALL = 'allow_all'
}

export interface ImagenSafetySettings {
  safetyFilterLevel?: ImagenSafetyFilterLevel;
  personFilterLevel?: ImagenPersonFilterLevel;
}

export enum ImagenAspectRatio {
  SQUARE = '1:1',
  LANDSCAPE_3x4 = '3:4',
  PORTRAIT_4x3 = '4:3',
  LANDSCAPE_16x9 = '16:9',
  PORTRAIT_9x16 = '9:16'
}
