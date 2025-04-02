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
import { ImagenModelParams, ModelParams, VertexAIErrorCode } from './types';
import { VertexAIError } from './errors';
import { ImagenModel, getGenerativeModel, getImagenModel } from './api';
import { expect } from 'chai';
import { VertexAI } from './public-types';
import { GenerativeModel } from './models/generative-model';

const fakeVertexAI: VertexAI = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      apiKey: 'key',
      projectId: 'my-project',
      appId: 'my-appid'
    }
  },
  location: 'us-central1'
};

describe('Top level API', () => {
  it('getGenerativeModel throws if no model is provided', () => {
    try {
      getGenerativeModel(fakeVertexAI, {} as ModelParams);
    } catch (e) {
      expect((e as VertexAIError).code).includes(VertexAIErrorCode.NO_MODEL);
      expect((e as VertexAIError).message).includes(
        `VertexAI: Must provide a model name. Example: ` +
          `getGenerativeModel({ model: 'my-model-name' }) (vertexAI/${VertexAIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getGenerativeModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeVertexAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as VertexAI;
    try {
      getGenerativeModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as VertexAIError).code).includes(VertexAIErrorCode.NO_API_KEY);
      expect((e as VertexAIError).message).equals(
        `VertexAI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase VertexAI requires this field to` +
          ` contain a valid API key. (vertexAI/${VertexAIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getGenerativeModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeVertexAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as VertexAI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as VertexAIError).code).includes(
        VertexAIErrorCode.NO_PROJECT_ID
      );
      expect((e as VertexAIError).message).equals(
        `VertexAI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid project ID. (vertexAI/${VertexAIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getGenerativeModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeVertexAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-projectid' } }
    } as VertexAI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as VertexAIError).code).includes(VertexAIErrorCode.NO_APP_ID);
      expect((e as VertexAIError).message).equals(
        `VertexAI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid app ID. (vertexAI/${VertexAIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getGenerativeModel gets a GenerativeModel', () => {
    const genModel = getGenerativeModel(fakeVertexAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(GenerativeModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('getGenerativeModel with HybridParams sets a default model', () => {
    const genModel = getGenerativeModel(fakeVertexAI, {
      mode: 'only_on_device'
    });
    expect(genModel.model).to.equal(
      `publishers/google/models/${GenerativeModel.DEFAULT_HYBRID_IN_CLOUD_MODEL}`
    );
  });
  it('getGenerativeModel with HybridParams honors a model override', () => {
    const genModel = getGenerativeModel(fakeVertexAI, {
<<<<<<< HEAD
      mode: 'prefer_on_device',
=======
      mode: 'only_in_cloud',
>>>>>>> 814a1dc95 (Use type for inference mode and update docs)
      inCloudParams: { model: 'my-model' }
    });
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('getImagenModel throws if no model is provided', () => {
    try {
      getImagenModel(fakeVertexAI, {} as ImagenModelParams);
    } catch (e) {
      expect((e as VertexAIError).code).includes(VertexAIErrorCode.NO_MODEL);
      expect((e as VertexAIError).message).includes(
        `VertexAI: Must provide a model name. Example: ` +
          `getImagenModel({ model: 'my-model-name' }) (vertexAI/${VertexAIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getImagenModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeVertexAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as VertexAI;
    try {
      getImagenModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as VertexAIError).code).includes(VertexAIErrorCode.NO_API_KEY);
      expect((e as VertexAIError).message).equals(
        `VertexAI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase VertexAI requires this field to` +
          ` contain a valid API key. (vertexAI/${VertexAIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getImagenModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeVertexAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as VertexAI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as VertexAIError).code).includes(
        VertexAIErrorCode.NO_PROJECT_ID
      );
      expect((e as VertexAIError).message).equals(
        `VertexAI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid project ID. (vertexAI/${VertexAIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getImagenModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeVertexAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-project' } }
    } as VertexAI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as VertexAIError).code).includes(VertexAIErrorCode.NO_APP_ID);
      expect((e as VertexAIError).message).equals(
        `VertexAI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid app ID. (vertexAI/${VertexAIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getImagenModel gets an ImagenModel', () => {
    const genModel = getImagenModel(fakeVertexAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(ImagenModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
});
