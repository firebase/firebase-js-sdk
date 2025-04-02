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
import { use, expect } from 'chai';
import { GenAI, GenAIErrorCode } from '../public-types';
import sinonChai from 'sinon-chai';
import { GenAIModel } from './genai-model';
import { GenAIError } from '../errors';
import { vertexAIBackend } from '../api';

use(sinonChai);

/**
 * A class that extends GenAIModel that allows us to test the protected constructor.
 */
class TestModel extends GenAIModel {
  /* eslint-disable @typescript-eslint/no-useless-constructor */
  constructor(genAI: GenAI, modelName: string) {
    super(genAI, modelName);
  }
}

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

describe('GenAIModel', () => {
  it('handles plain model name', () => {
    const testModel = new TestModel(fakeGenAI, 'my-model');
    expect(testModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles models/ prefixed model name', () => {
    const testModel = new TestModel(fakeGenAI, 'models/my-model');
    expect(testModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles full model name', () => {
    const testModel = new TestModel(
      fakeGenAI,
      'publishers/google/models/my-model'
    );
    expect(testModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles prefixed tuned model name', () => {
    const testModel = new TestModel(fakeGenAI, 'tunedModels/my-model');
    expect(testModel.model).to.equal('tunedModels/my-model');
  });
  it('throws if not passed an api key', () => {
    const fakeGenAI: GenAI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          projectId: 'my-project'
        }
      },
      backend: vertexAIBackend('us-central1'),
      location: 'us-central1'
    };
    try {
      new TestModel(fakeGenAI, 'my-model');
    } catch (e) {
      expect((e as GenAIError).code).to.equal(GenAIErrorCode.NO_API_KEY);
    }
  });
  it('throws if not passed a project ID', () => {
    const fakeGenAI: GenAI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key'
        }
      },
      backend: vertexAIBackend('us-central1'),
      location: 'us-central1'
    };
    try {
      new TestModel(fakeGenAI, 'my-model');
    } catch (e) {
      expect((e as GenAIError).code).to.equal(GenAIErrorCode.NO_PROJECT_ID);
    }
  });
  it('throws if not passed an app ID', () => {
    const fakeGenAI: GenAI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key',
          projectId: 'my-project'
        }
      },
      backend: vertexAIBackend('us-central1'),
      location: 'us-central1'
    };
    try {
      new TestModel(fakeGenAI, 'my-model');
    } catch (e) {
      expect((e as GenAIError).code).to.equal(GenAIErrorCode.NO_APP_ID);
    }
  });
});
