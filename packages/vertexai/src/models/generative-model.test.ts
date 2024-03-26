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
import { expect } from 'chai';
import { GenerativeModel } from './generative-model';
import { Vertex } from '../public-types';

const fakeVertex: Vertex = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      apiKey: 'key',
      projectId: 'my-project'
    }
  },
  region: 'us-central1'
};

describe('GenerativeModel', () => {
  it('handles plain model name', () => {
    const genModel = new GenerativeModel(fakeVertex, { model: 'my-model' });
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles models/ prefixed model name', () => {
    const genModel = new GenerativeModel(fakeVertex, {
      model: 'models/my-model'
    });
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles full model name', () => {
    const genModel = new GenerativeModel(fakeVertex, {
      model: 'publishers/google/models/my-model'
    });
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles prefixed tuned model name', () => {
    const genModel = new GenerativeModel(fakeVertex, {
      model: 'tunedModels/my-model'
    });
    expect(genModel.model).to.equal('tunedModels/my-model');
  });
});
