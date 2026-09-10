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
import { GenerativeModel, validateGenerationConfig } from './generative-model';
import {
  FunctionCallingMode,
  InferenceMode,
  AIErrorCode,
  ChromeAdapter,
  ThinkingLevel,
  ImageConfigAspectRatio,
  ImageConfigImageSize
} from '../public-types';
import * as request from '../requests/request';
import {
  getMockResponse,
  getMockResponseStreaming
} from '../../test-utils/mock-response';
import { AIError } from '../errors';
import {
  fakeAI,
  fakeChromeAdapter
} from '../../test-utils/get-fake-firebase-services';
import { Availability } from '../types/language-model';

const { mockRequest, mockGenerateContent, mockCountTokens } = vi.hoisted(
  () => ({
    mockRequest: {
      makeRequest: (..._args: any[]): any => {}
    },
    mockGenerateContent: {
      generateContent: (..._args: any[]): any => {},
      generateContentStream: (..._args: any[]): any => {}
    },
    mockCountTokens: {
      countTokens: (..._args: any[]): any => {}
    }
  })
);

vi.mock('../requests/request', async importOriginal => {
  const actual = await importOriginal<any>();
  mockRequest.makeRequest = (...args: any[]) => actual.makeRequest(...args);
  return {
    ...actual,
    makeRequest: (...args: any[]) => mockRequest.makeRequest(...args)
  };
});

vi.mock('../methods/generate-content', async importOriginal => {
  const actual = await importOriginal<any>();
  mockGenerateContent.generateContent = (...args: any[]) =>
    actual.generateContent(...args);
  mockGenerateContent.generateContentStream = (...args: any[]) =>
    actual.generateContentStream(...args);
  return {
    ...actual,
    generateContent: (...args: any[]) =>
      mockGenerateContent.generateContent(...args),
    generateContentStream: (...args: any[]) =>
      mockGenerateContent.generateContentStream(...args)
  };
});

vi.mock('../methods/count-tokens', async importOriginal => {
  const actual = await importOriginal<any>();
  mockCountTokens.countTokens = (...args: any[]) => actual.countTokens(...args);
  return {
    ...actual,
    countTokens: (...args: any[]) => mockCountTokens.countTokens(...args)
  };
});

describe('GenerativeModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('throws if generationConfig is invalid', () => {
    expect(
      () =>
        new GenerativeModel(fakeAI, {
          model: 'my-model',
          generationConfig: {
            thinkingConfig: {
              thinkingBudget: 1000,
              thinkingLevel: ThinkingLevel.LOW
            }
          }
        })
    ).to.throw(AIErrorCode.UNSUPPORTED);
  });
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.generateContent('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return (
          value.includes('myfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly')
        );
      })
    );
    vi.restoreAllMocks();
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.generateContent('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return value.includes('be friendly');
      })
    );
    vi.restoreAllMocks();
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
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
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return (
          value.includes('otherfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.AUTO) &&
          value.includes('be formal')
        );
      })
    );
    vi.restoreAllMocks();
  });
  it('generateContent singleRequestOptions overrides requestOptions', async () => {
    const generateContentStub = vi
      .spyOn(mockGenerateContent, 'generateContent')
      .mockRejectedValue(new Error('generateContent failed')); // not important
    const requestOptions = {
      timeout: 1000
    };
    const singleRequestOptions = {
      timeout: 2000
    };
    const genModel = new GenerativeModel(
      fakeAI,
      { model: 'my-model' },
      requestOptions
    );
    await expect(
      genModel.generateContent('hello', singleRequestOptions)
    ).rejects.toThrow();
    expect(generateContentStub).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.objectContaining({
        timeout: singleRequestOptions.timeout
      })
    );
  });
  it('passes single-speaker speechConfig through to generateContent', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        generationConfig: {
          speechConfig: {
            languageCode: 'en-US',
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          }
        }
      },
      {},
      fakeChromeAdapter
    );

    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);

    await genModel.generateContent('Say hello!');

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return value.includes('en-US') && value.includes('Puck');
      })
    );
  });
  it('passes single-speaker speechConfig through to generateContentStream', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        generationConfig: {
          speechConfig: {
            languageCode: 'en-US',
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      },
      {},
      fakeChromeAdapter
    );

    const mockResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-basic-reply-short.txt'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);

    await genModel.generateContentStream('Have a conversation.');

    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.STREAM_GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: true,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return value.includes('en-US') && value.includes('Kore');
      })
    );

    vi.restoreAllMocks();
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
    vi.restoreAllMocks();
  });
  it('generateContent singleRequestOptions is merged with requestOptions', async () => {
    const generateContentStub = vi
      .spyOn(mockGenerateContent, 'generateContent')
      .mockRejectedValue(new Error('generateContent failed')); // not important
    const abortController = new AbortController();
    const requestOptions = {
      timeout: 1000
    };
    const singleRequestOptions = {
      signal: abortController.signal
    };
    const genModel = new GenerativeModel(
      fakeAI,
      { model: 'my-model' },
      requestOptions
    );
    await expect(
      genModel.generateContent('hello', singleRequestOptions)
    ).rejects.toThrow();
    expect(generateContentStub).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.objectContaining({
        timeout: requestOptions.timeout,
        signal: singleRequestOptions.signal
      })
    );
  });
  it('passes base model params through to ChatSession when there are no startChatParams', async () => {
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      generationConfig: {
        topK: 1
      }
    });
    const chatSession = genModel.startChat();
    expect(chatSession.params?.generationConfig).to.deep.equal({
      topK: 1
    });
    vi.restoreAllMocks();
  });
  it('passes imageConfig through to ChatSession', () => {
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      generationConfig: {
        imageConfig: {
          aspectRatio: ImageConfigAspectRatio.SQUARE_1x1,
          imageSize: ImageConfigImageSize.SIZE_512
        }
      }
    });
    const chatSession = genModel.startChat();
    expect(chatSession.params?.generationConfig?.imageConfig).to.deep.equal({
      aspectRatio: '1:1',
      imageSize: '512'
    });
  });
  it('overrides base model params with startChatParams', () => {
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      generationConfig: {
        topK: 1
      }
    });
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.startChat().sendMessage('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return (
          value.includes('myfunc') &&
          value.includes('googleSearch') &&
          value.includes('codeExecution') &&
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly') &&
          value.includes('topK')
        );
      })
    );
    vi.restoreAllMocks();
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.startChat().sendMessage('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return value.includes('be friendly');
      })
    );
    vi.restoreAllMocks();
  });
  it('startChat overrides model values', async () => {
    const genModel = new GenerativeModel(
      fakeAI,
      {
        model: 'my-model',
        tools: [
          { functionDeclarations: [{ name: 'myfunc', description: 'mydesc' }] },
          { googleSearch: {} },
          { urlContext: {} }
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
    expect(genModel.tools?.length).to.equal(3);
    expect(genModel.toolConfig?.functionCallingConfig?.mode).to.equal(
      FunctionCallingMode.NONE
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.startChat().sendMessage('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return (
          value.includes('myfunc') &&
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly')
          // value.includes('topK')
        );
      })
    );
    vi.restoreAllMocks();
  });
  it('passes text-only systemInstruction through to chat.sendMessage', async () => {
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      systemInstruction: 'be friendly'
    });
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.startChat().sendMessage('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return value.includes('be friendly');
      })
    );
    vi.restoreAllMocks();
  });
  it('startChat overrides model values', async () => {
    const genModel = new GenerativeModel(fakeAI, {
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
    });
    expect(genModel.tools?.length).to.equal(1);
    expect(genModel.toolConfig?.functionCallingConfig?.mode).to.equal(
      FunctionCallingMode.NONE
    );
    expect(genModel.systemInstruction?.parts[0].text).to.equal('be friendly');
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-basic-reply-short.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel
      .startChat({
        tools: [
          {
            functionDeclarations: [
              { name: 'otherfunc', description: 'otherdesc' }
            ]
          }
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
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.GENERATE_CONTENT,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return (
          value.includes('otherfunc') &&
          value.includes(FunctionCallingMode.AUTO) &&
          value.includes('be formal') &&
          value.includes('image/png') &&
          !value.includes('image/jpeg')
        );
      })
    );
    vi.restoreAllMocks();
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
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    await genModel.countTokens('hello');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'publishers/google/models/my-model',
        task: request.Task.COUNT_TOKENS,
        apiSettings: expect.anything(),
        stream: false,
        singleRequestOptions: {}
      },
      expect.toSatisfy((value: string) => {
        return value.includes('hello');
      })
    );
    vi.restoreAllMocks();
  });
  it('countTokens singleRequestOptions overrides requestOptions', async () => {
    const countTokensStub = vi
      .spyOn(mockCountTokens, 'countTokens')
      .mockRejectedValue('countTokens failed');
    const requestOptions = {
      timeout: 1000
    };
    const singleRequestOptions = {
      timeout: 2000
    };
    const genModel = new GenerativeModel(
      fakeAI,
      { model: 'my-model' },
      requestOptions
    );
    await expect(
      genModel.countTokens('hello', singleRequestOptions)
    ).rejects.toThrow();
    expect(countTokensStub).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.objectContaining({
        timeout: singleRequestOptions.timeout
      })
    );
  });
  it('countTokens singleRequestOptions is merged with requestOptions', async () => {
    const countTokensStub = vi
      .spyOn(mockCountTokens, 'countTokens')
      .mockRejectedValue('countTokens failed');
    const abortController = new AbortController();
    const requestOptions = {
      timeout: 1000
    };
    const singleRequestOptions = {
      signal: abortController.signal
    };
    const genModel = new GenerativeModel(
      fakeAI,
      { model: 'my-model' },
      requestOptions
    );
    await expect(
      genModel.countTokens('hello', singleRequestOptions)
    ).rejects.toThrow();
    expect(countTokensStub).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.objectContaining({
        timeout: requestOptions.timeout,
        signal: singleRequestOptions.signal
      })
    );
  });
});
describe('initializeDeviceModel', () => {
  it('throws if unavailable and ONLY_ON_DEVICE', async () => {
    // @ts-ignore
    const mockChromeAdapter = {
      mode: InferenceMode.ONLY_ON_DEVICE,
      downloadIfAvailable: vi.fn().mockResolvedValue(Availability.UNAVAILABLE),
      download: vi.fn()
    };
    const model = new GenerativeModel(
      fakeAI,
      { model: 'model' },
      {},
      //@ts-ignore
      mockChromeAdapter
    );
    await expect(model.initializeDeviceModel()).rejects.toThrow(
      'Local LanguageModel API not available in this environment'
    );
    expect(mockChromeAdapter.download).not.toHaveBeenCalled();
  });
  it('noops if ONLY_IN_CLOUD', async () => {
    // @ts-ignore
    const mockChromeAdapter = {
      mode: InferenceMode.ONLY_IN_CLOUD,
      downloadIfAvailable: vi.fn().mockResolvedValue(Availability.AVAILABLE),
      download: vi.fn()
    };
    const model = new GenerativeModel(
      fakeAI,
      { model: 'model' },
      {},
      //@ts-ignore
      mockChromeAdapter
    );
    await model.initializeDeviceModel();
    expect(mockChromeAdapter.download).not.toHaveBeenCalled();
  });
  it('noops if no adapter', async () => {
    // @ts-ignore
    const mockChromeAdapter = {
      mode: InferenceMode.PREFER_ON_DEVICE,
      downloadIfAvailable: vi.fn().mockResolvedValue(Availability.AVAILABLE),
      download: vi.fn()
    };
    const model = new GenerativeModel(fakeAI, { model: 'model' }, {});
    await model.initializeDeviceModel();
    expect(mockChromeAdapter.download).not.toHaveBeenCalled();
  });
  it('passes downloadProgress callback to download()', async () => {
    // @ts-ignore
    const mockChromeAdapter = {
      mode: InferenceMode.PREFER_ON_DEVICE,
      downloadIfAvailable: vi.fn().mockResolvedValue(Availability.AVAILABLE)
    };
    const model = new GenerativeModel(
      fakeAI,
      { model: 'model' },
      {},
      //@ts-ignore
      mockChromeAdapter
    );
    const progressCallback = (): void => {};
    await model.initializeDeviceModel(progressCallback);
    expect(mockChromeAdapter.downloadIfAvailable).toHaveBeenCalledWith(
      progressCallback
    );
  });
});

describe('GenerativeModel hybrid dispatch logic', () => {
  let makeRequestStub: MockInstance;
  let mockChromeAdapter: ChromeAdapter;

  function stubMakeRequest(stream?: boolean): void {
    if (stream) {
      makeRequestStub = vi
        .spyOn(mockRequest, 'makeRequest')
        .mockResolvedValue(
          getMockResponseStreaming(
            'vertexAI',
            'streaming-success-basic-reply-short.txt'
          ) as Response
        );
    } else {
      makeRequestStub = vi
        .spyOn(mockRequest, 'makeRequest')
        .mockResolvedValue(
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
      isAvailable: vi.fn(),
      generateContent: vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({}))),
      generateContentStream: vi
        .fn()
        .mockResolvedValue(
          getMockResponseStreaming(
            'vertexAI',
            'streaming-success-basic-reply-short.txt'
          ) as Response
        ),
      countTokens: vi.fn().mockResolvedValue(new Response(JSON.stringify({}))),
      mode: InferenceMode.PREFER_ON_DEVICE
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PREFER_ON_DEVICE', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.PREFER_ON_DEVICE;
    });
    it('should use on-device for generateContent when available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(mockChromeAdapter.generateContent).toHaveBeenCalledTimes(1);
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('should use cloud for generateContent when on-device is not available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(mockChromeAdapter.generateContent).not.toHaveBeenCalled();
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
    });
    it('should use on-device for generateContentStream when available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(mockChromeAdapter.generateContentStream).toHaveBeenCalledTimes(1);
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('should use cloud for generateContentStream when on-device is not available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(mockChromeAdapter.generateContentStream).not.toHaveBeenCalled();
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
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
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
    });
  });

  describe('ONLY_ON_DEVICE', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.ONLY_ON_DEVICE;
    });
    it('should use on-device for generateContent when available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(mockChromeAdapter.generateContent).toHaveBeenCalledTimes(1);
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('generateContent should throw when on-device is not available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await expect(model.generateContent('hello')).rejects.toThrow(
        /on-device model is not available/
      );
      expect(mockChromeAdapter.generateContent).not.toHaveBeenCalled();
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('should use on-device for generateContentStream when available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(mockChromeAdapter.generateContentStream).toHaveBeenCalledTimes(1);
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('generateContentStream should throw when on-device is not available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(false);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await expect(model.generateContentStream('hello')).rejects.toThrow(
        /on-device model is not available/
      );
      expect(mockChromeAdapter.generateContent).not.toHaveBeenCalled();
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
    it('should always throw for countTokens', async () => {
      stubMakeRequest();
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await expect(model.countTokens('hello')).rejects.toThrow(AIError);
      expect(makeRequestStub).not.toHaveBeenCalled();
    });
  });

  describe('ONLY_IN_CLOUD', () => {
    beforeEach(() => {
      mockChromeAdapter.mode = InferenceMode.ONLY_IN_CLOUD;
    });
    it('should use cloud for generateContent even when on-device is available', async () => {
      stubMakeRequest();
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
      expect(mockChromeAdapter.generateContent).not.toHaveBeenCalled();
    });
    it('should use cloud for generateContentStream even when on-device is available', async () => {
      stubMakeRequest(true);
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
      expect(mockChromeAdapter.generateContentStream).not.toHaveBeenCalled();
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
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
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
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
      expect(mockChromeAdapter.generateContent).not.toHaveBeenCalled();
    });
    it('should fall back to on-device for generateContent if cloud fails', async () => {
      makeRequestStub.mockRejectedValue(
        new AIError(AIErrorCode.FETCH_ERROR, 'Network error')
      );
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContent('hello');
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
      expect(mockChromeAdapter.generateContent).toHaveBeenCalledTimes(1);
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
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
      expect(mockChromeAdapter.generateContentStream).not.toHaveBeenCalled();
    });
    it('should fall back to on-device for generateContentStream if cloud fails', async () => {
      makeRequestStub.mockRejectedValue(
        new AIError(AIErrorCode.FETCH_ERROR, 'Network error')
      );
      (mockChromeAdapter.isAvailable as any).mockResolvedValue(true);
      const model = new GenerativeModel(
        fakeAI,
        { model: 'model' },
        {},
        mockChromeAdapter
      );
      await model.generateContentStream('hello');
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
      expect(mockChromeAdapter.generateContentStream).toHaveBeenCalledTimes(1);
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
      expect(makeRequestStub).toHaveBeenCalledTimes(1);
    });
  });
});

describe('validateGenerationConfig', () => {
  it('does not allow setting both thinkingBudget and thinkingLevel', () => {
    expect(() => {
      validateGenerationConfig({
        thinkingConfig: {
          thinkingBudget: 200
        }
      });
    }).to.not.throw();
    expect(() => {
      validateGenerationConfig({
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      });
    }).to.not.throw();
    expect(() => {
      validateGenerationConfig({
        thinkingConfig: {
          thinkingBudget: 200,
          thinkingLevel: ThinkingLevel.LOW
        }
      });
    }).to.throw();
  });
  it('does not allow setting both responseSchema and responseJsonSchema', () => {
    expect(() => {
      validateGenerationConfig({
        responseSchema: {},
        responseMimeType: 'application/json'
      });
    }).to.not.throw();
    expect(() => {
      validateGenerationConfig({
        responseJsonSchema: {},
        responseMimeType: 'application/json'
      });
    }).to.not.throw();
    expect(() => {
      validateGenerationConfig({
        responseSchema: {},
        responseJsonSchema: {},
        responseMimeType: 'application/json'
      });
    }).to.throw();
  });
  it(
    'throws if responseSchema or responseJsonSchema are set' +
      ' and responseMimeType is not "application/json" or "text/x.enum"',
    () => {
      expect(() => {
        validateGenerationConfig({
          responseSchema: {}
        });
      }).to.throw();
      expect(() => {
        validateGenerationConfig({
          responseJsonSchema: {}
        });
      }).to.throw();
      expect(() => {
        validateGenerationConfig({
          responseJsonSchema: {},
          responseMimeType: 'text/plain'
        });
      }).to.throw();
    }
  );
});
