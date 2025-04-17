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
import { ImagenModelParams, ModelParams, AIErrorCode } from './types';
import { AIError } from './errors';
import {
  ImagenModel,
  getGenerativeModel,
  getImagenModel,
  googleAIBackend,
  vertexAIBackend
} from './api';
import { expect } from 'chai';
import { BackendType, AI } from './public-types';
import { GenerativeModel } from './models/generative-model';
import { DEFAULT_LOCATION } from './constants';

const fakeAI: AI = {
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
      getGenerativeModel(fakeAI, {} as ModelParams);
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_MODEL);
      expect((e as AIError).message).includes(
        `VertexAI: Must provide a model name. Example: ` +
          `getGenerativeModel({ model: 'my-model-name' }) (vertexAI/${AIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getGenerativeModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getGenerativeModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_API_KEY);
      expect((e as AIError).message).equals(
        `VertexAI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase AI requires this field to` +
          ` contain a valid API key. (vertexAI/${AIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getGenerativeModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_PROJECT_ID);
      expect((e as AIError).message).equals(
        `VertexAI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid project ID. (vertexAI/${AIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getGenerativeModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-projectid' } }
    } as AI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_APP_ID);
      expect((e as AIError).message).equals(
        `VertexAI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid app ID. (vertexAI/${AIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getGenerativeModel gets a GenerativeModel', () => {
    const genModel = getGenerativeModel(fakeAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(GenerativeModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('getImagenModel throws if no model is provided', () => {
    try {
      getImagenModel(fakeAI, {} as ImagenModelParams);
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_MODEL);
      expect((e as AIError).message).includes(
        `VertexAI: Must provide a model name. Example: ` +
          `getImagenModel({ model: 'my-model-name' }) (vertexAI/${AIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getImagenModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getImagenModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_API_KEY);
      expect((e as AIError).message).equals(
        `VertexAI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase AI requires this field to` +
          ` contain a valid API key. (vertexAI/${AIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getImagenModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_PROJECT_ID);
      expect((e as AIError).message).equals(
        `VertexAI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid project ID. (vertexAI/${AIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getImagenModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-project' } }
    } as AI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_APP_ID);
      expect((e as AIError).message).equals(
        `VertexAI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid app ID. (vertexAI/${AIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getImagenModel gets an ImagenModel', () => {
    const genModel = getImagenModel(fakeAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(ImagenModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('googleAIBackend returns a backend with backendType GOOGLE_AI', () => {
    const backend = googleAIBackend();
    expect(backend.backendType).to.equal(BackendType.GOOGLE_AI);
  });
  it('vertexAIBackend returns a backend with backendType VERTEX_AI', () => {
    const backend = vertexAIBackend();
    expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
    expect(backend.location).to.equal(DEFAULT_LOCATION);
  });
  it('vertexAIBackend sets custom location', () => {
    const backend = vertexAIBackend('test-location');
    expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
    expect(backend.location).to.equal('test-location');
  });
  it('vertexAIBackend sets custom location even if empty string', () => {
    const backend = vertexAIBackend('');
    expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
    expect(backend.location).to.equal('');
  });
  it('vertexAIBackend uses default location if location is null', () => {
    const backend = vertexAIBackend(null as any);
    expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
    expect(backend.location).to.equal(DEFAULT_LOCATION);
  });
});
