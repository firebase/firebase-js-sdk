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
import { ImagenModel } from './imagen-model';
import {
  ImagenAspectRatio,
  ImagenPersonFilterLevel,
  ImagenSafetyFilterLevel,
  VertexAI,
  VertexAIErrorCode
} from '../public-types';
import * as request from '../requests/request';
import sinonChai from 'sinon-chai';
import { VertexAIError } from '../errors';
import { getMockResponse } from '../../test-utils/mock-response';
import { match, restore, stub } from 'sinon';

use(sinonChai);

const fakeVertexAI: VertexAI = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      apiKey: 'key',
      projectId: 'my-project'
    }
  },
  location: 'us-central1'
};

describe('ImagenModel', () => {
  it('handles plain model name', () => {
    const imagenModel = new ImagenModel(fakeVertexAI, { model: 'my-model' });
    expect(imagenModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles models/ prefixed model name', () => {
    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'models/my-model'
    });
    expect(imagenModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles full model name', () => {
    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'publishers/google/models/my-model'
    });
    expect(imagenModel.model).to.equal('publishers/google/models/my-model');
  });
  it('handles prefixed tuned model name', () => {
    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'tunedModels/my-model'
    });
    expect(imagenModel.model).to.equal('tunedModels/my-model');
  });
  it('throws if not passed an api key', () => {
    const fakeVertexAI: VertexAI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          projectId: 'my-project'
        }
      },
      location: 'us-central1'
    };
    try {
      new ImagenModel(fakeVertexAI, {
        model: 'my-model'
      });
    } catch (e) {
      expect((e as VertexAIError).code).to.equal(VertexAIErrorCode.NO_API_KEY);
    }
  });
  it('throws if not passed a project ID', () => {
    const fakeVertexAI: VertexAI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key'
        }
      },
      location: 'us-central1'
    };
    try {
      new ImagenModel(fakeVertexAI, {
        model: 'my-model'
      });
    } catch (e) {
      expect((e as VertexAIError).code).to.equal(
        VertexAIErrorCode.NO_PROJECT_ID
      );
    }
  });
  it('generateImages makes a request to predict with default parameters', async () => {
    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'my-model'
    });

    const mockResponse = getMockResponse(
      'unary-success-generate-images-base64.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const prompt = 'A photorealistic image of a toy boat at sea.';
    await imagenModel.generateImages(prompt, { numberOfImages: 1 });
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.PREDICT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('sampleCount') &&
          value.includes('includeRaiReason') &&
          value.includes('aspectRatio') &&
          value.includes('mimeType')
        );
      }),
      undefined
    );
    restore();
  });
  it('generateImages makes a request to predict with model-level image configs', async () => {
    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'my-model',
      addWatermark: true,
      imageFormat: { mimeType: 'image/jpeg', compressionQuality: 75 },
      safetySettings: {
        safetyFilterLevel: ImagenSafetyFilterLevel.BLOCK_ONLY_HIGH,
        personFilterLevel: ImagenPersonFilterLevel.ALLOW_ADULT
      }
    });

    const mockResponse = getMockResponse(
      'unary-success-generate-images-base64.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const prompt = 'A photorealistic image of a toy boat at sea.';
    await imagenModel.generateImages(prompt, { numberOfImages: 1 });
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.PREDICT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('safetyFilterLevel') &&
          value.includes('block_only_high') &&
          value.includes('personFilterLevel') &&
          value.includes('allow_adult') &&
          value.includes('mimeType') &&
          value.includes('image/jpeg') &&
          value.includes('addWatermark') &&
          value.includes('true')
        );
      }),
      undefined
    );
    restore();
  });
  it('generateImages makes a request to predict with request-level image configs', async () => {
    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'my-model'
    });

    const mockResponse = getMockResponse(
      'unary-success-generate-images-base64.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const prompt = 'A photorealistic image of a toy boat at sea.';
    await imagenModel.generateImages(prompt, {
      numberOfImages: 4,
      aspectRatio: ImagenAspectRatio.WIDESCREEN,
      negativePrompt: 'do not hallucinate'
    });
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.PREDICT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('sampleCount') &&
          value.includes('4') &&
          value.includes('aspectRatio') &&
          value.includes('16:9') &&
          value.includes('negativePrompt') &&
          value.includes('do not hallucinate')
        );
      }),
      undefined
    );

    restore();
  });
  it('throws if prompt blocked', async () => {
    const mockResponse = getMockResponse(
      'unary-failure-generate-images-prompt-blocked.json'
    );

    stub(globalThis, 'fetch').resolves({
      ok: false,
      status: 400, // TODO (dlarocque): Get this from the mock response
      statusText: 'Bad Request',
      json: mockResponse.json
    } as Response);

    const imagenModel = new ImagenModel(fakeVertexAI, {
      model: 'my-model'
    });
    try {
      await imagenModel.generateImages(
        'A photorealistic image of a toy boat at sea.',
        { numberOfImages: 1 }
      );
    } catch (e) {
      expect((e as VertexAIError).code).to.equal(VertexAIErrorCode.FETCH_ERROR);
      expect((e as VertexAIError).message).to.include('400');
      expect((e as VertexAIError).message).to.include(
        "Image generation failed with the following error: The prompt could not be submitted. This prompt contains sensitive words that violate Google's Responsible AI practices. Try rephrasing the prompt. If you think this was an error, send feedback. Support codes: 42876398"
      );
    } finally {
      restore();
    }
  });
});
