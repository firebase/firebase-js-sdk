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

import { expect, use } from 'chai';
import Sinon, { match, restore, stub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { getMockResponse } from '../../test-utils/mock-response';
import * as request from '../requests/request';
import { generateContent } from './generate-content';
import {
  AIErrorCode,
  GenerateContentRequest,
  HarmBlockMethod,
  HarmBlockThreshold,
  HarmCategory,
  InferenceMode,
  Language,
  Outcome
} from '../types';
import { ApiSettings } from '../types/internal';
import { Task } from '../requests/request';
import { AIError } from '../api';
import { mapGenerateContentRequest } from '../googleai-mappers';
import { GoogleAIBackend, VertexAIBackend } from '../backend';
import { ChromeAdapterImpl } from './chrome-adapter';

use(sinonChai);
use(chaiAsPromised);

const fakeChromeAdapter = new ChromeAdapterImpl(
  // @ts-expect-error
  undefined,
  InferenceMode.PREFER_ON_DEVICE
);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new VertexAIBackend()
};

const fakeGoogleAIApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new GoogleAIBackend()
};

const fakeRequestParams: GenerateContentRequest = {
  contents: [{ parts: [{ text: 'hello' }], role: 'user' }],
  generationConfig: {
    topK: 16
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      method: HarmBlockMethod.SEVERITY
    }
  ]
};

const fakeGoogleAIRequestParams: GenerateContentRequest = {
  contents: [{ parts: [{ text: 'hello' }], role: 'user' }],
  generationConfig: {
    topK: 16
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
    }
  ]
};

describe('generateContent()', () => {
  afterEach(() => {
    restore();
  });
  it('short response', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('Mountain View, California');
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      JSON.stringify(fakeRequestParams),
      undefined
    );
  });
  it('long response', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-long.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('Use Freshly Ground Coffee');
    expect(result.response.text()).to.include('30 minutes of brewing');
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('long response with token details', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-response-long-usage-metadata.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.usageMetadata?.totalTokenCount).to.equal(1913);
    expect(result.response.usageMetadata?.candidatesTokenCount).to.equal(76);
    expect(
      result.response.usageMetadata?.promptTokensDetails?.[0].modality
    ).to.equal('IMAGE');
    expect(
      result.response.usageMetadata?.promptTokensDetails?.[0].tokenCount
    ).to.equal(1806);
    expect(
      result.response.usageMetadata?.candidatesTokensDetails?.[0].modality
    ).to.equal('TEXT');
    expect(
      result.response.usageMetadata?.candidatesTokensDetails?.[0].tokenCount
    ).to.equal(76);
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('citations', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-citations.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include(
      'Some information cited from an external source'
    );
    expect(
      result.response.candidates?.[0].citationMetadata?.citations.length
    ).to.equal(3);
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('google search grounding', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-google-search-grounding.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('The temperature is 67°F (19°C)');
    const groundingMetadata = result.response.candidates?.[0].groundingMetadata;
    expect(groundingMetadata).to.not.be.undefined;
    expect(groundingMetadata!.searchEntryPoint?.renderedContent).to.contain(
      'div'
    );
    expect(groundingMetadata!.groundingChunks?.length).to.equal(2);
    expect(groundingMetadata!.groundingChunks?.[0].web?.uri).to.contain(
      'https://vertexaisearch.cloud.google.com'
    );
    expect(groundingMetadata!.groundingChunks?.[0].web?.title).to.equal(
      'accuweather.com'
    );
    expect(groundingMetadata!.groundingSupports?.length).to.equal(3);
    expect(
      groundingMetadata!.groundingSupports?.[0].groundingChunkIndices
    ).to.deep.equal([0]);
    expect(groundingMetadata!.groundingSupports?.[0].segment).to.deep.equal({
      endIndex: 56,
      text: 'The current weather in London, United Kingdom is cloudy.'
    });
    expect(groundingMetadata!.groundingSupports?.[0].segment?.partIndex).to.be
      .undefined;
    expect(groundingMetadata!.groundingSupports?.[0].segment?.startIndex).to.be
      .undefined;

    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('codeExecution', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-code-execution.json'
    );
    stub(request, 'makeRequest').resolves(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    const parts = result.response.candidates?.[0].content.parts;
    parts?.forEach(part => console.log(Object.keys(part)));
    expect(
      parts?.some(part => part.codeExecutionResult?.outcome === Outcome.OK)
    ).to.be.true;
    expect(
      parts?.some(part => part.executableCode?.language === Language.PYTHON)
    ).to.be.true;
  });
  it('blocked prompt', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-prompt-blocked-safety.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text).to.throw('SAFETY');
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('finishReason safety', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-finish-reason-safety.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text).to.throw('SAFETY');
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('empty content', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-empty-content.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.equal('');
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('unknown enum - should ignore', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-unknown-enum-safety-ratings.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('Some text');
    expect(makeRequestStub).to.be.calledWith(
      'model',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      false,
      match.any
    );
  });
  it('image rejected (400)', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-image-rejected.json'
    );
    const mockFetch = stub(globalThis, 'fetch').resolves({
      ok: false,
      status: 400,
      json: mockResponse.json
    } as Response);
    await expect(
      generateContent(fakeApiSettings, 'model', fakeRequestParams)
    ).to.be.rejectedWith(/400.*invalid argument/);
    expect(mockFetch).to.be.called;
  });
  it('api not enabled (403)', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-firebasevertexai-api-not-enabled.json'
    );
    const mockFetch = stub(globalThis, 'fetch').resolves({
      ok: false,
      status: 403,
      json: mockResponse.json
    } as Response);
    await expect(
      generateContent(fakeApiSettings, 'model', fakeRequestParams)
    ).to.be.rejectedWith(
      /firebasevertexai\.googleapis[\s\S]*my-project[\s\S]*api-not-enabled/
    );
    expect(mockFetch).to.be.called;
  });
  describe('googleAI', () => {
    let makeRequestStub: Sinon.SinonStub;

    beforeEach(() => {
      makeRequestStub = stub(request, 'makeRequest');
    });

    afterEach(() => {
      restore();
    });

    it('throws error when method is defined', async () => {
      const mockResponse = getMockResponse(
        'googleAI',
        'unary-success-basic-reply-short.txt'
      );
      makeRequestStub.resolves(mockResponse as Response);

      const requestParamsWithMethod: GenerateContentRequest = {
        contents: [{ parts: [{ text: 'hello' }], role: 'user' }],
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            method: HarmBlockMethod.SEVERITY // Unsupported in Google AI.
          }
        ]
      };

      // Expect generateContent to throw a AIError that method is not supported.
      await expect(
        generateContent(
          fakeGoogleAIApiSettings,
          'model',
          requestParamsWithMethod
        )
      ).to.be.rejectedWith(AIError, AIErrorCode.UNSUPPORTED);
      expect(makeRequestStub).to.not.be.called;
    });
    it('maps request to GoogleAI format', async () => {
      const mockResponse = getMockResponse(
        'googleAI',
        'unary-success-basic-reply-short.txt'
      );
      makeRequestStub.resolves(mockResponse as Response);

      await generateContent(
        fakeGoogleAIApiSettings,
        'model',
        fakeGoogleAIRequestParams
      );

      expect(makeRequestStub).to.be.calledWith(
        'model',
        Task.GENERATE_CONTENT,
        fakeGoogleAIApiSettings,
        false,
        JSON.stringify(mapGenerateContentRequest(fakeGoogleAIRequestParams)),
        undefined
      );
    });
  });
  // TODO: define a similar test for generateContentStream
  it('on-device', async () => {
    const chromeAdapter = fakeChromeAdapter;
    const isAvailableStub = stub(chromeAdapter, 'isAvailable').resolves(true);
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const generateContentStub = stub(chromeAdapter, 'generateContent').resolves(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams,
      chromeAdapter
    );
    expect(result.response.text()).to.include('Mountain View, California');
    expect(isAvailableStub).to.be.called;
    expect(generateContentStub).to.be.calledWith(fakeRequestParams);
  });
});
