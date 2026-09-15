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

import { expect, vi, MockInstance } from 'vitest';
import {
  getMockResponse,
  getMockResponseStreaming
} from '../../test-utils/mock-response';

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: {
    makeRequest: (..._args: any[]): any => {}
  }
}));

vi.mock('../requests/request', async importOriginal => {
  const actual = await importOriginal<any>();
  mockRequest.makeRequest = (...args: any[]) => actual.makeRequest(...args);
  return {
    ...actual,
    makeRequest: (...args: any[]) => mockRequest.makeRequest(...args)
  };
});

import {
  generateContent,
  generateContentStream,
  templateGenerateContent,
  templateGenerateContentStream
} from './generate-content';
import {
  AIErrorCode,
  GenerateContentRequest,
  HarmBlockMethod,
  HarmBlockThreshold,
  HarmCategory,
  InferenceSource,
  Language,
  Outcome
} from '../types';
import { ApiSettings } from '../types/internal';
import { Task } from '../requests/request';
import { mapGenerateContentRequest } from '../googleai-mappers';
import { GoogleAIBackend, AgentPlatformBackend } from '../backend';
import { fakeChromeAdapter } from '../../test-utils/get-fake-firebase-services';

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'global',
  backend: new AgentPlatformBackend()
};

const fakeGoogleAIApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'global',
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
    vi.restoreAllMocks();
  });
  it('short response', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('Mountain View, California');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('long response', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-long.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('Use Freshly Ground Coffee');
    expect(result.response.text()).to.include('30 minutes of brewing');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('long response with token details', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-response-long-usage-metadata.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
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
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('citations', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-citations.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
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
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('google search grounding', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-google-search-grounding.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
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

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });

  it('url context', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-url-context.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include(
      'The Berkshire Hathaway Inc. website serves'
    );
    const groundingMetadata = result.response.candidates?.[0].groundingMetadata;
    expect(groundingMetadata).to.not.be.undefined;
    expect(groundingMetadata!.groundingChunks?.length).to.equal(1);
    expect(groundingMetadata!.groundingChunks?.[0].web?.uri).to.contain(
      'https://berkshirehathaway.com'
    );
    expect(groundingMetadata!.groundingChunks?.[0].web?.title).to.equal(
      'BERKSHIRE HATHAWAY INC.'
    );
    expect(groundingMetadata!.groundingSupports?.length).to.equal(2);
    expect(
      groundingMetadata!.groundingSupports?.[0].groundingChunkIndices
    ).to.deep.equal([0]);
    expect(groundingMetadata!.groundingSupports?.[0].segment).to.deep.equal({
      startIndex: 273,
      endIndex: 450,
      text: "The site also features letters from Warren Buffett and Charlie Munger, details on corporate governance and sustainability, and links to Berkshire Hathaway's operating companies."
    });
    expect(groundingMetadata!.groundingSupports?.[0].segment?.partIndex).to.be
      .undefined;

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      expect.anything()
    );
  });
  it('google maps grounding', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-google-maps-grounding.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include(
      'Here are some pizza restaurants near you:'
    );
    const groundingMetadata = result.response.candidates?.[0].groundingMetadata;
    expect(groundingMetadata).to.not.be.undefined;
    expect(groundingMetadata!.groundingChunks?.length).to.equal(20);
    expect(groundingMetadata!.groundingChunks?.[0].maps?.title).to.equal(
      'Joe’s Pizza'
    );
    expect(groundingMetadata!.groundingChunks?.[0].maps?.placeId).to.equal(
      'places/ChIJqdNaaBVbwokRLTafYrQlZI8'
    );
    expect(groundingMetadata!.groundingChunks?.[0].maps?.uri).to.contain(
      'https://maps.google.com/?cid=10332424901773702701'
    );
    expect(groundingMetadata!.groundingSupports?.length).to.equal(39);
    expect(groundingMetadata!.groundingSupports?.[0].segment?.partIndex).to.be
      .undefined;
    expect(groundingMetadata!.groundingSupports?.[0].segment?.startIndex).to.not
      .be.undefined;
    expect(groundingMetadata!.groundingSupports?.[0].segment?.endIndex).to.not
      .be.undefined;
    expect(groundingMetadata!.groundingSupports?.[0].segment?.text).to.not.be
      .undefined;
    expect(
      groundingMetadata!.groundingSupports?.[0].segment?.startIndex
    ).to.equal(43);
    expect(
      groundingMetadata!.groundingSupports?.[0].segment?.endIndex
    ).to.equal(152);
    expect(groundingMetadata!.groundingSupports?.[0].segment?.text).to.contain(
      "Joe's Pizza"
    );

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('codeExecution', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-code-execution.json'
    );
    vi.spyOn(mockRequest, 'makeRequest').mockResolvedValue(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    const parts = result.response.candidates?.[0].content.parts;
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text).to.throw('SAFETY');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('finishReason safety', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-finish-reason-safety.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text).to.throw('SAFETY');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('empty content', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-empty-content.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.equal('');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('empty part', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-empty-part.json'
    );
    vi.spyOn(mockRequest, 'makeRequest').mockResolvedValue(
      mockResponse as Response
    );
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include(
      'I can certainly help you with that!'
    );
    expect(result.response.inlineDataParts()?.length).to.equal(1);
  });
  it('unknown enum - should ignore', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-unknown-enum-safety-ratings.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams
    );
    expect(result.response.text()).to.include('Some text');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      JSON.stringify(fakeRequestParams)
    );
  });
  it('image rejected (400)', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-image-rejected.json'
    );
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: mockResponse.json
    } as Response);
    await expect(
      generateContent(fakeApiSettings, 'model', fakeRequestParams)
    ).rejects.toThrow(/400.*invalid argument/);
    expect(mockFetch).toHaveBeenCalled();
  });
  it('api not enabled (403)', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-firebasevertexai-api-not-enabled.json'
    );
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: mockResponse.json
    } as Response);
    await expect(
      generateContent(fakeApiSettings, 'model', fakeRequestParams)
    ).rejects.toThrow(
      /firebasevertexai\.googleapis[\s\S]*my-project[\s\S]*api-not-enabled/
    );
    expect(mockFetch).toHaveBeenCalled();
  });
  describe('googleAI', () => {
    let makeRequestStub: MockInstance;

    beforeEach(() => {
      makeRequestStub = vi.spyOn(mockRequest, 'makeRequest');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('throws error when method is defined', async () => {
      const mockResponse = getMockResponse(
        'googleAI',
        'unary-success-basic-reply-short.txt'
      );
      makeRequestStub.mockResolvedValue(mockResponse as Response);

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
      ).rejects.toThrow(AIErrorCode.UNSUPPORTED);
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('maps request to GoogleAI format', async () => {
      const mockResponse = getMockResponse(
        'googleAI',
        'unary-success-basic-reply-short.txt'
      );
      makeRequestStub.mockResolvedValue(mockResponse as Response);

      await generateContent(
        fakeGoogleAIApiSettings,
        'model',
        fakeGoogleAIRequestParams
      );

      expect(makeRequestStub).toHaveBeenCalledWith(
        {
          model: 'model',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeGoogleAIApiSettings,
          stream: false,
          singleRequestOptions: undefined
        },
        JSON.stringify(mapGenerateContentRequest(fakeGoogleAIRequestParams))
      );
    });
  });
  it('generateContent on-device', async () => {
    const chromeAdapter = fakeChromeAdapter;
    const isAvailableStub = vi
      .spyOn(chromeAdapter, 'isAvailable')
      .mockResolvedValue(true);
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const generateContentStub = vi
      .spyOn(chromeAdapter, 'generateContent')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContent(
      fakeApiSettings,
      'model',
      fakeRequestParams,
      chromeAdapter
    );
    expect(result.response.text()).to.include('Mountain View, California');
    expect(result.response.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
    expect(isAvailableStub).toHaveBeenCalled();
    expect(generateContentStub).toHaveBeenCalledWith(fakeRequestParams);
  });
  it('generateContentStream on-device', async () => {
    const chromeAdapter = fakeChromeAdapter;
    const isAvailableStub = vi
      .spyOn(chromeAdapter, 'isAvailable')
      .mockResolvedValue(true);
    const mockResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-basic-reply-short.txt'
    );
    const generateContentStreamStub = vi
      .spyOn(chromeAdapter, 'generateContentStream')
      .mockResolvedValue(mockResponse as Response);
    const result = await generateContentStream(
      fakeApiSettings,
      'model',
      fakeRequestParams,
      chromeAdapter
    );
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('Cheyenne');
    expect(aggregatedResponse.inferenceSource).to.equal(
      InferenceSource.ON_DEVICE
    );
    expect(isAvailableStub).toHaveBeenCalled();
    expect(generateContentStreamStub).toHaveBeenCalledWith(fakeRequestParams);
  });
});

describe('templateGenerateContent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('should call makeRequest with correct parameters and process the response', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const templateId = 'my-template';
    const templateParams = { name: 'world' };
    const singleRequestOptions = { timeout: 5000 };

    const result = await templateGenerateContent(
      fakeApiSettings,
      templateId,
      templateParams,
      singleRequestOptions
    );

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        task: 'templateGenerateContent',
        templateId,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions
      },
      JSON.stringify(templateParams)
    );
    expect(result.response.text()).to.include('Mountain View, California');
  });
});

describe('templateGenerateContentStream', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('should call makeRequest with correct parameters for streaming', async () => {
    const mockResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-basic-reply-short.txt'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const templateId = 'my-stream-template';
    const templateParams = { name: 'streaming world' };
    const singleRequestOptions = { timeout: 10000 };

    const result = await templateGenerateContentStream(
      fakeApiSettings,
      templateId,
      templateParams,
      singleRequestOptions
    );

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        task: 'templateStreamGenerateContent',
        templateId,
        apiSettings: fakeApiSettings,
        stream: true,
        singleRequestOptions
      },
      JSON.stringify(templateParams)
    );

    // Verify the stream processing part
    for await (const item of result.stream) {
      expect(item.text()).to.not.be.empty;
    }
    const response = await result.response;
    expect(response.text()).to.include('Cheyenne');
  });
});
