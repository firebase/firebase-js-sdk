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

import { use, expect } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { restore, stub } from 'sinon';
import { AI } from '../public-types';
import { VertexAIBackend } from '../backend';
import { TemplateImagenModel } from './template-imagen-model';
import { AIError } from '../errors';
import * as request from '../requests/request';

use(sinonChai);
use(chaiAsPromised);

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

const TEMPLATE_ID = 'my-imagen-template';
const TEMPLATE_VARS = { a: 1, b: '2' };

describe('TemplateImagenModel', () => {
  afterEach(() => {
    restore();
  });

  describe('constructor', () => {
    it('should initialize _apiSettings correctly', () => {
      const model = new TemplateImagenModel(fakeAI);
      expect(model._apiSettings.apiKey).to.equal('key');
      expect(model._apiSettings.project).to.equal('my-project');
      expect(model._apiSettings.appId).to.equal('my-appid');
    });
  });

  describe('generateImages', () => {
    it('should call makeRequest with correct parameters', async () => {
      const makeRequestStub = stub(request, 'makeRequest').resolves({
        json: () =>
          Promise.resolve({
            predictions: [
              {
                bytesBase64Encoded:
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                mimeType: 'image/png'
              }
            ]
          })
      } as Response);
      const model = new TemplateImagenModel(fakeAI, { timeout: 5000 });

      await model.generateImages(TEMPLATE_ID, TEMPLATE_VARS);

      expect(makeRequestStub).to.have.been.calledOnceWith(
        {
          task: 'templatePredict',
          templateId: TEMPLATE_ID,
          apiSettings: model._apiSettings,
          stream: false,
          requestOptions: { timeout: 5000 }
        },
        JSON.stringify({ inputs: TEMPLATE_VARS })
      );
    });

    it('should return the result of handlePredictResponse', async () => {
      const mockPrediction = {
        'bytesBase64Encoded':
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'mimeType': 'image/png'
      };
      stub(request, 'makeRequest').resolves({
        json: () => Promise.resolve({ predictions: [mockPrediction] })
      } as Response);

      const model = new TemplateImagenModel(fakeAI);
      const result = await model.generateImages(TEMPLATE_ID, TEMPLATE_VARS);

      expect(result.images).to.deep.equal([mockPrediction]);
    });

    it('should throw an AIError if the prompt is blocked', async () => {
      const error = new AIError('fetch-error', 'Request failed');
      stub(request, 'makeRequest').rejects(error);

      const model = new TemplateImagenModel(fakeAI);
      await expect(
        model.generateImages(TEMPLATE_ID, TEMPLATE_VARS)
      ).to.be.rejectedWith(error);
    });

    it('should handle responses with filtered images', async () => {
      const mockPrediction = {
        bytesBase64Encoded: 'iVBOR...ggg==',
        mimeType: 'image/png'
      };
      const filteredReason = 'This image was filtered for safety reasons.';
      stub(request, 'makeRequest').resolves({
        json: () =>
          Promise.resolve({
            predictions: [mockPrediction, { raiFilteredReason: filteredReason }]
          })
      } as Response);

      const model = new TemplateImagenModel(fakeAI);
      const result = await model.generateImages(TEMPLATE_ID, TEMPLATE_VARS);

      expect(result.images).to.have.lengthOf(1);
      expect(result.images[0]).to.deep.equal(mockPrediction);
      expect(result.filteredReason).to.equal(filteredReason);
    });
  });
});
