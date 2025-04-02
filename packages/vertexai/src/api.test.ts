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
import { ImagenModelParams, ModelParams, GenAIErrorCode } from './types';
import { GenAIError } from './errors';
import { ImagenModel, getGenerativeModel, getImagenModel, vertexAIBackend } from './api';
import { expect } from 'chai';
import { GenAI } from './public-types';
import { GenerativeModel } from './models/generative-model';

const fakeGenAI: GenAI = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      apiKey: 'key',
      projectId: 'my-project',
      appId: 'my-appid'
    }
  },
  backend: vertexAIBackend('us-central1'),
  location: 'us-central1'
};

describe('Top level API', () => {
  it('getGenerativeModel throws if no model is provided', () => {
    try {
      getGenerativeModel(fakeGenAI, {} as ModelParams);
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_MODEL);
      expect((e as GenAIError).message).includes(
        `VertexAI: Must provide a model name. Example: ` +
          `getGenerativeModel({ model: 'my-model-name' }) (vertexAI/${GenAIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getGenerativeModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeGenAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as GenAI;
    try {
      getGenerativeModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_API_KEY);
      expect((e as GenAIError).message).equals(
        `VertexAI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase VertexAI requires this field to` +
          ` contain a valid API key. (vertexAI/${GenAIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getGenerativeModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeGenAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as GenAI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_PROJECT_ID);
      expect((e as GenAIError).message).equals(
        `VertexAI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid project ID. (vertexAI/${GenAIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getGenerativeModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeGenAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-projectid' } }
    } as GenAI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_APP_ID);
      expect((e as GenAIError).message).equals(
        `VertexAI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid app ID. (vertexAI/${GenAIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getGenerativeModel gets a GenerativeModel', () => {
    const genModel = getGenerativeModel(fakeGenAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(GenerativeModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('getImagenModel throws if no model is provided', () => {
    try {
      getImagenModel(fakeGenAI, {} as ImagenModelParams);
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_MODEL);
      expect((e as GenAIError).message).includes(
        `VertexAI: Must provide a model name. Example: ` +
          `getImagenModel({ model: 'my-model-name' }) (vertexAI/${GenAIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getImagenModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeGenAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as GenAI;
    try {
      getImagenModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_API_KEY);
      expect((e as GenAIError).message).equals(
        `VertexAI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase VertexAI requires this field to` +
          ` contain a valid API key. (vertexAI/${GenAIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getImagenModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeGenAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as GenAI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_PROJECT_ID);
      expect((e as GenAIError).message).equals(
        `VertexAI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid project ID. (vertexAI/${GenAIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getImagenModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeGenAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-project' } }
    } as GenAI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as GenAIError).code).includes(GenAIErrorCode.NO_APP_ID);
      expect((e as GenAIError).message).equals(
        `VertexAI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase VertexAI requires this field ` +
          `to contain a valid app ID. (vertexAI/${GenAIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getImagenModel gets an ImagenModel', () => {
    const genModel = getImagenModel(fakeGenAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(ImagenModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
});
