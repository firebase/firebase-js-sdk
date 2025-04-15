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

import { expect } from 'chai';
import {
  GenAIError,
  GenAIModel,
  GenerativeModel,
  VertexAIError,
  VertexAIErrorCode,
  VertexAIModel,
  getGenerativeModel,
  getImagenModel,
  vertexAIBackend
} from './api';
import { GenAI, VertexAI, GenAIErrorCode } from './public-types';

function assertAssignable<T, _U extends T>(): void {}

const fakeGenAI: GenAI = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      apiKey: 'key',
      projectId: 'my-project',
      appId: 'app-id'
    }
  },
  backend: vertexAIBackend('us-central1'),
  location: 'us-central1'
};

const fakeVertexAI: VertexAI = fakeGenAI;

describe('backwards-compatible types', () => {
  it('GenAI is backwards compatible with VertexAI', () => {
    assertAssignable<VertexAI, GenAI>();
  });
  it('GenAIError is backwards compatible with VertexAIError', () => {
    assertAssignable<typeof VertexAIError, typeof GenAIError>();
    const err = new VertexAIError(VertexAIErrorCode.ERROR, '');
    expect(err).instanceOf(GenAIError);
    expect(err).instanceOf(VertexAIError);
  });
  it('GenAIErrorCode is backwards compatible with VertexAIErrorCode', () => {
    assertAssignable<VertexAIErrorCode, GenAIErrorCode>();
    const errCode = GenAIErrorCode.ERROR;
    expect(errCode).to.equal(VertexAIErrorCode.ERROR);
  });
  it('GenAIModel is backwards compatible with VertexAIModel', () => {
    assertAssignable<typeof VertexAIModel, typeof GenAIModel>();

    const model = new GenerativeModel(fakeGenAI, { model: 'model-name' });
    expect(model).to.be.instanceOf(GenAIModel);
    expect(model).to.be.instanceOf(VertexAIModel);
  });
});

describe('backward-compatible functions', () => {
  it('getGenerativeModel', () => {
    const model = getGenerativeModel(fakeVertexAI, { model: 'model-name' });
    expect(model).to.be.instanceOf(GenAIModel);
    expect(model).to.be.instanceOf(VertexAIModel);
  });
  it('getImagenModel', () => {
    const model = getImagenModel(fakeVertexAI, { model: 'model-name' });
    expect(model).to.be.instanceOf(GenAIModel);
    expect(model).to.be.instanceOf(VertexAIModel);
  });
});
