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
import { AI, AIErrorCode } from '../public-types';
import sinonChai from 'sinon-chai';
import { AIModel } from './ai-model';
import { AIError } from '../errors';
import { VertexAIBackend } from '../backend';

use(sinonChai);

/**
 * A class that extends AIModel that allows us to test the protected constructor.
 */
class TestModel extends AIModel {
  /* eslint-disable @typescript-eslint/no-useless-constructor */
  constructor(ai: AI, modelName: string) {
    super(ai, modelName);
  }
}

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
  backend: new VertexAIBackend('us-central1'),
  location: 'us-central1'
};

describe('AIModel', () => {
  it('handles plain model name', () => {
    const testModel = new TestModel(fakeAI, 'my-model');
    expect(testModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles models/ prefixed model name', () => {
    const testModel = new TestModel(fakeAI, 'models/my-model');
    expect(testModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles full model name', () => {
    const testModel = new TestModel(
      fakeAI,
      'publishers/google/models/my-model'
    );
    expect(testModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles prefixed tuned model name', () => {
    const testModel = new TestModel(fakeAI, 'tunedModels/my-model');
    expect(testModel.model).to.equal('tunedModels/my-model');
  });
  it('throws if not passed an api key', () => {
    const fakeAI: AI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          projectId: 'my-project'
        }
      },
      backend: new VertexAIBackend('us-central1'),
      location: 'us-central1'
    };
    try {
      new TestModel(fakeAI, 'my-model');
    } catch (e) {
      expect((e as AIError).code).to.equal(AIErrorCode.NO_API_KEY);
    }
  });
  it('throws if not passed a project ID', () => {
    const fakeAI: AI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key'
        }
      },
      backend: new VertexAIBackend('us-central1'),
      location: 'us-central1'
    };
    try {
      new TestModel(fakeAI, 'my-model');
    } catch (e) {
      expect((e as AIError).code).to.equal(AIErrorCode.NO_PROJECT_ID);
    }
  });
  it('throws if not passed an app ID', () => {
    const fakeAI: AI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key',
          projectId: 'my-project'
        }
      },
      backend: new VertexAIBackend('us-central1'),
      location: 'us-central1'
    };
    try {
      new TestModel(fakeAI, 'my-model');
    } catch (e) {
      expect((e as AIError).code).to.equal(AIErrorCode.NO_APP_ID);
    }
  });
});
