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
import { GenerativeModel } from './generative-model';
import {
  FunctionCallingMode,
  AI,
  InferenceMode,
  AIErrorCode,
  ChromeAdapter
} from '../public-types';
import * as request from '../requests/request';
import { SinonStub, match, restore, stub } from 'sinon';
import {
  getMockResponse,
  getMockResponseStreaming
} from '../../test-utils/mock-response';
import sinonChai from 'sinon-chai';
import { VertexAIBackend } from '../backend';
import { AIError } from '../errors';
import chaiAsPromised from 'chai-as-promised';
import { fakeChromeAdapter } from '../../test-utils/get-fake-firebase-services';

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

describe('GenerativeModel', () => {
  it('passes params through to generateContent', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        tools: [
          {
            functionDeclarations: [
              {
                name: 'myfunc',
                description: 'mydesc'
              }
            ]
          },
          { googleSearch: {} },
          { codeExecution: {} }
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.NONE }
        },
        systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] }
      },
      {},
      fakeChromeAdapter
    );
    expect(genModel.tools?.length).to.equal(3);
    expect(genModel.toolConfig?.functionCallingConfig?.mode).to.equal(
      FunctionCallingMode.NONE
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel.generateContent('hello');
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.GENERATE_CONTENT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('myfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly')
        );
      }),
      {}
    );
    restore();
  });
  it('passes text-only systemInstruction through to generateContent', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        systemInstruction: 'be friendly'
      },
      {},
      fakeChromeAdapter
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel.generateContent('hello');
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.GENERATE_CONTENT,
      match.any,
      false,
      match((value: string) => {
        return value.includes('be friendly');
      }),
      {}
    );
    restore();
  });
  it('generateContent overrides model values', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        tools: [
          {
            functionDeclarations: [
              {
                name: 'myfunc',
                description: 'mydesc'
              }
            ]
          }
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.NONE }
        },
        systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] }
      },
      {},
      fakeChromeAdapter
    );
    expect(genModel.tools?.length).to.equal(1);
    expect(genModel.toolConfig?.functionCallingConfig?.mode).to.equal(
      FunctionCallingMode.NONE
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
      tools: [
        {
          functionDeclarations: [
            { name: 'otherfunc', description: 'otherdesc' }
          ]
        },
        { googleSearch: {} },
        { codeExecution: {} }
      ],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
      systemInstruction: { role: 'system', parts: [{ text: 'be formal' }] }
    });
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.GENERATE_CONTENT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('otherfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.AUTO) &&
          value.includes('be formal')
        );
      }),
      {}
    );
    restore();
  });
  it('passes base model params through to ChatSession when there are no startChatParams', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        generationConfig: {
          topK: 1
        }
      },
      {},
      fakeChromeAdapter
    );
    const chatSession = genModel.startChat();
    expect(chatSession.params?.generationConfig).to.deep.equal({
      topK: 1
    });
    restore();
  });
  it('overrides base model params with startChatParams', () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        generationConfig: {
          topK: 1
        }
      },
      {},
      fakeChromeAdapter
    );
    const chatSession = genModel.startChat({
      generationConfig: {
        topK: 2
      }
    });
    expect(chatSession.params?.generationConfig).to.deep.equal({
      topK: 2
    });
  });
  it('passes params through to chat.sendMessage', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        tools: [
          { functionDeclarations: [{ name: 'myfunc', description: 'mydesc' }] },
          { googleSearch: {} },
          { codeExecution: {} }
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.NONE }
        },
        systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] },
        generationConfig: {
          topK: 1
        }
      },
      {},
      fakeChromeAdapter
    );
    expect(genModel.tools?.length).to.equal(3);
    expect(genModel.toolConfig?.functionCallingConfig?.mode).to.equal(
      FunctionCallingMode.NONE
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel.startChat().sendMessage('hello');
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.GENERATE_CONTENT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('myfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly') &&
          value.includes('topK')
        );
      }),
      {}
    );
    restore();
  });
  it('passes text-only systemInstruction through to chat.sendMessage', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        systemInstruction: 'be friendly'
      },
      {},
      fakeChromeAdapter
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel.startChat().sendMessage('hello');
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.GENERATE_CONTENT,
      match.any,
      false,
      match((value: string) => {
        return value.includes('be friendly');
      }),
      {}
    );
    restore();
  });
  it('startChat overrides model values', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        tools: [
          { functionDeclarations: [{ name: 'myfunc', description: 'mydesc' }] }
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.NONE }
        },
        systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] },
        generationConfig: {
          responseMimeType: 'image/jpeg'
        }
      },
      {},
      fakeChromeAdapter
    );
    expect(genModel.tools?.length).to.equal(1);
    expect(genModel.toolConfig?.functionCallingConfig?.mode).to.equal(
      FunctionCallingMode.NONE
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel
      .startChat({
        tools: [
          {
            functionDeclarations: [
              { name: 'otherfunc', description: 'otherdesc' }
            ]
          },
          { googleSearch: {} },
          { codeExecution: {} }
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.AUTO }
        },
        systemInstruction: { role: 'system', parts: [{ text: 'be formal' }] },
        generationConfig: {
          responseMimeType: 'image/png'
        }
      })
      .sendMessage('hello');
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.GENERATE_CONTENT,
      match.any,
      false,
      match((value: string) => {
        return (
          value.includes('otherfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.AUTO) &&
          value.includes('be formal') &&
          value.includes('image/png') &&
          !value.includes('image/jpeg')
        );
      }),
      {}
    );
    restore();
  });
  it('calls countTokens', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      { model: 'my-model' },
      {},
      fakeChromeAdapter
    );
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-total-tokens.json'
    );
    const makeRequestStub = stub(request, 'makeRequest').resolves(
      mockResponse as Response
    );
    await genModel.countTokens('hello');
    expect(makeRequestStub).to.be.calledWith(
      'publishers/google/models/my-model',
      request.Task.COUNT_TOKENS,
      match.any,
      false,
      match((value: string) => {
        return value.includes('hello');
      })
    );
    restore();
  });
});

describe('GenerativeModel dispatch logic', () => {
  let makeRequestStub: SinonStub;
  let mockChromeAdapter: ChromeAdapter;

  function stubMakeRequest(stream?: boolean): void {
    if (stream) {
      makeRequestStub = stub(request, 'makeRequest').resolves(
        getMockResponseStreaming(
          'vertexAI',
          'unary-success-basic-reply-short.json'
        ) as Response
      );
    } else {
      makeRequestStub = stub(request, 'makeRequest').resolves(
        getMockResponse(
          'vertexAI',
          'unary-success-basic-reply-short.json'
        ) as Response
      );
    }
  }

  beforeEach(() => {
    // @ts-ignore
    mockChromeAdapter = {
      isAvailable: stub(),
      generateContent: stub().resolves(new Response(JSON.stringify({}))),
      generateContentStream: stub().resolves(
        new Response(new ReadableStream())
      ),
      countTokens: stub().resolves(new Response(JSON.stringify({}))),
      mode: InferenceMode.PREFER_ON_DEVICE
    };
  });

  afterEach(() => {
    restore();
  });

  describe('PREFER_ON_DEVICE', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.PREFER_ON_DEVICE;
    });
    it('should use on-device for generateContent when available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(mockChromeAdapter.generateContent).to.have.been.calledOnce;
      expect(makeRequestStub).to.not.have.been.called;
    });
    it('should use cloud for generateContent when on-device is not available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as SinonStub).resolves(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(mockChromeAdapter.generateContent).to.not.have.been.called;
      expect(makeRequestStub).to.have.been.calledOnce;
    });
    it('should use on-device for generateContentStream when available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(mockChromeAdapter.generateContentStream).to.have.been.calledOnce;
      expect(makeRequestStub).to.not.have.been.called;
    });
    it('should use cloud for generateContentStream when on-device is not available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as SinonStub).resolves(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(mockChromeAdapter.generateContentStream).to.not.have.been.called;
      expect(makeRequestStub).to.have.been.calledOnce;
    });
    it('should use cloud for countTokens', async () => {
      stubMakeRequest();
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.countTokens('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
    });
  });

  describe('ONLY_ON_DEVICE', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.ONLY_ON_DEVICE;
    });
    it('should use on-device for generateContent when available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(mockChromeAdapter.generateContent).to.have.been.calledOnce;
      expect(makeRequestStub).to.not.have.been.called;
    });
    it('generateContent should throw when on-device is not available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as SinonStub).resolves(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await expect(model.generateContent('hello')).to.be.rejectedWith(
        /on-device model is not available/
      );
      expect(mockChromeAdapter.generateContent).to.not.have.been.called;
      expect(makeRequestStub).to.not.have.been.called;
    });
    it('should use on-device for generateContentStream when available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(mockChromeAdapter.generateContentStream).to.have.been.calledOnce;
      expect(makeRequestStub).to.not.have.been.called;
    });
    it('generateContentStream should throw when on-device is not available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as SinonStub).resolves(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await expect(model.generateContentStream('hello')).to.be.rejectedWith(
        /on-device model is not available/
      );
      expect(mockChromeAdapter.generateContent).to.not.have.been.called;
      expect(makeRequestStub).to.not.have.been.called;
    });
    it('should always throw for countTokens', async () => {
      stubMakeRequest();
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await expect(model.countTokens('hello')).to.be.rejectedWith(AIError);
      expect(makeRequestStub).to.not.have.been.called;
    });
  });

  describe('ONLY_IN_CLOUD', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.ONLY_IN_CLOUD;
    });
    it('should use cloud for generateContent even when on-device is available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
      expect(mockChromeAdapter.generateContent).to.not.have.been.called;
    });
    it('should use cloud for generateContentStream even when on-device is available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
      expect(mockChromeAdapter.generateContentStream).to.not.have.been.called;
    });
    it('should always use cloud for countTokens', async () => {
      stubMakeRequest();
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.countTokens('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
    });
  });

  describe('PREFER_IN_CLOUD', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.PREFER_IN_CLOUD;
    });
    it('should use cloud for generateContent when available', async () => {
      stubMakeRequest();
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
      expect(mockChromeAdapter.generateContent).to.not.have.been.called;
    });
    it('should fall back to on-device for generateContent if cloud fails', async () => {
      makeRequestStub.rejects(
        new AIError(AIErrorCode.FETCH_ERROR, 'Network error')
      );
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
      expect(mockChromeAdapter.generateContent).to.have.been.calledOnce;
    });
    it('should use cloud for generateContentStream when available', async () => {
      stubMakeRequest(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
      expect(mockChromeAdapter.generateContentStream).to.not.have.been.called;
    });
    it('should fall back to on-device for generateContentStream if cloud fails', async () => {
      makeRequestStub.rejects(
        new AIError(AIErrorCode.FETCH_ERROR, 'Network error')
      );
      (mockChromeAdapter.isAvailable as SinonStub).resolves(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
      expect(mockChromeAdapter.generateContentStream).to.have.been.calledOnce;
    });
    it('should use cloud for countTokens', async () => {
      stubMakeRequest();
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.countTokens('hello');
      expect(makeRequestStub).to.have.been.calledOnce;
    });
  });
});
