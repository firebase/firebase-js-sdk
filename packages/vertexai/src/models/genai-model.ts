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

import { GenAIError } from '../errors';
import { GenAIErrorCode, GenAI, BackendType } from '../public-types';
import { GenAIService } from '../service';
import { ApiSettings } from '../types/internal';
import { _isFirebaseServerApp } from '@firebase/app';

/**
 * Base class for Vertex AI in Firebase model APIs.
 *
 * @public
 */
export abstract class GenAIModel {
  /**
   * The fully qualified model resource name to use for generating images
   * (for example, `publishers/google/models/imagen-3.0-generate-002`).
   */
  readonly model: string;

  /**
   * @internal
   */
  protected _apiSettings: ApiSettings;

  /**
   * Constructs a new instance of the {@link GenAIModel} class.
   *
   * This constructor should only be called from subclasses that provide
   * a model API.
   *
   * @param genAI - An instance of the Vertex AI in Firebase SDK.
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
  protected constructor(genAI: GenAI, modelName: string) {
    if (!genAI.app?.options?.apiKey) {
      throw new GenAIError(
        GenAIErrorCode.NO_API_KEY,
        `The "apiKey" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid API key.`
      );
    } else if (!genAI.app?.options?.projectId) {
      throw new GenAIError(
        GenAIErrorCode.NO_PROJECT_ID,
        `The "projectId" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid project ID.`
      );
    } else if (!genAI.app?.options?.appId) {
      throw new GenAIError(
        GenAIErrorCode.NO_APP_ID,
        `The "appId" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid app ID.`
      );
    } else {
      this._apiSettings = {
        apiKey: genAI.app.options.apiKey,
        project: genAI.app.options.projectId,
        appId: genAI.app.options.appId,
        automaticDataCollectionEnabled:
          genAI.app.automaticDataCollectionEnabled,
        location: genAI.location,
        backend: genAI.backend
      };

      if (_isFirebaseServerApp(genAI.app) && genAI.app.settings.appCheckToken) {
        const token = genAI.app.settings.appCheckToken;
        this._apiSettings.getAppCheckToken = () => {
          return Promise.resolve({ token });
        };
      } else if ((genAI as GenAIService).appCheck) {
        this._apiSettings.getAppCheckToken = () =>
          (genAI as GenAIService).appCheck!.getToken();
      }

      if ((genAI as GenAIService).auth) {
        this._apiSettings.getAuthToken = () =>
          (genAI as GenAIService).auth!.getToken();
      }

      this.model = GenAIModel.normalizeModelName(
        modelName,
        this._apiSettings.backend.backendType
      );
    }
  }

  /**
   * @internal
   * @param modelName - The model name to normalize.
   * @returns The fully qualified model resource name.
   */
  static normalizeModelName(
    modelName: string,
    backendType: BackendType
  ): string {
    if (backendType === 'GOOGLE_AI') {
      return GenAIModel.normalizeGoogleAIModelName(modelName);
    } else {
      return GenAIModel.normalizeVertexAIModelName(modelName);
    }
  }

  private static normalizeGoogleAIModelName(modelName: string): string {
    return `models/${modelName}`;
    // TODO (dlarocque): rename this to be projects/project-id/models/model-name
  }

  private static normalizeVertexAIModelName(modelName: string): string {
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
