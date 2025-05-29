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
import { VertexAIBackend } from './backend';
import { DEFAULT_LOCATION } from './constants';
import { AIService } from './service';
import { expect } from 'chai';

const fakeApp = {
  name: 'DEFAULT',
  automaticDataCollectionEnabled: true,
  options: {
    apiKey: 'key',
    projectId: 'my-project'
  }
};

describe('AIService', () => {
  // TODO (dlarocque): move some of these tests to helpers.test.ts
  it('uses default location if not specified', () => {
    const ai = new AIService(fakeApp, new VertexAIBackend());
    expect(ai.location).to.equal(DEFAULT_LOCATION);
  });
  it('uses custom location if specified', () => {
    const ai = new AIService(
      fakeApp,
      new VertexAIBackend('somewhere'),
      /* authProvider */ undefined,
      /* appCheckProvider */ undefined
    );
    expect(ai.location).to.equal('somewhere');
  });
});
