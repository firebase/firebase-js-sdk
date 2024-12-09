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

// Internal Imagen types

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
    // Defined if the prediction was not filtered
    mimeType?: string;
    bytesBase64Encoded?: string;
    gcsUri?: string;

    // Defined if the prediction was filtered, and there is no image
    raiFilteredReason?: string;
  }>;
}
