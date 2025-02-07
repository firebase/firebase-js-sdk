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

import { VertexAIError } from '../errors';
import { VertexAI, VertexAIErrorCode } from '../public-types';
import { VertexAIService } from '../service';
import { ApiSettings } from '../types/internal';
import { _isFirebaseServerApp } from '@firebase/app';

/**
 * Base class for Vertex AI in Firebase model APIs.
 *
 * @public
 */
export abstract class VertexAIModel {
  /**
   * The fully qualified model resource name to use for generating images
   * (e.g. `publishers/google/models/imagen-3.0-generate-001`).
   */
  readonly model: string;

  /**
   * @internal
   */
  protected _apiSettings: ApiSettings;

  /**
   * Constructs a new instance of the {@link VertexAIModel} class.
   *
   * This constructor should only be called from subclasses that provide
   * a model API.
   *
   * @param vertexAI - An instance of the Vertex AI in Firebase SDK.
   * @param modelName - The name of the model being used. It can be in one of the following formats:
   * - `my-model` (short name, will resolve to `publishers/google/models/my-model`)
   * - `models/my-model` (will resolve to `publishers/google/models/my-model`)
   * - `publishers/my-publisher/models/my-model` (fully qualified model name)
   *
   * @throws If the `apiKey` or `projectId` fields are missing in your
   * Firebase config.
   *
   * @internal
   */
  protected constructor(vertexAI: VertexAI, modelName: string) {
    this.model = VertexAIModel.normalizeModelName(modelName);

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

      if (
        _isFirebaseServerApp(vertexAI.app) &&
        vertexAI.app.settings.appCheckToken
      ) {
        const token = vertexAI.app.settings.appCheckToken;
        this._apiSettings.getAppCheckToken = () => {
          return Promise.resolve({ token });
        };
      } else if ((vertexAI as VertexAIService).appCheck) {
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
   * Normalizes the given model name to a fully qualified model resource name.
   *
   * @param modelName - The model name to normalize.
   * @returns The fully qualified model resource name.
   */
  static normalizeModelName(modelName: string): string {
    let model: string;
    if (modelName.includes('/')) {
      if (modelName.startsWith('models/')) {
        // Add 'publishers/google' if the user is only passing in 'models/model-name'.
        model = `publishers/google/${modelName}`;
      } else {
        // Any other custom format (e.g. tuned models) must be passed in correctly.
        model = modelName;
      }
    } else {
      // If path is not included, assume it's a non-tuned model.
      model = `publishers/google/models/${modelName}`;
    }

    return model;
  }
}
