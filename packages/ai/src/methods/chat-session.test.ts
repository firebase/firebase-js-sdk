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

import { expect, vi, type Mock } from 'vitest';

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: {
    generateContent: (..._args: any[]): any => {},
    generateContentStream: (..._args: any[]): any => {}
  }
}));

vi.mock('./generate-content', async importOriginal => {
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

import {
  Content,
  FunctionDeclaration,
  GenerateContentStreamResult
} from '../types';
import { ChatSession } from './chat-session';
import { ApiSettings } from '../types/internal';
import { AgentPlatformBackend } from '../backend';
import { fakeChromeAdapter } from '../../test-utils/get-fake-firebase-services';
import { logger } from '../logger';
import { Schema } from '../api';

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'global',
  backend: new AgentPlatformBackend()
};

function getGreeting({
  username
}: Record<string, unknown>): Record<string, unknown> {
  return { greeting: `Hi, ${username}` };
}

function getFarewell({
  username
}: Record<string, unknown>): Record<string, unknown> {
  return { farewell: `Bye, ${username}` };
}

describe('ChatSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('formats systemInstruction if it is provided as a string', () => {
    const chatSession = new ChatSession(
      fakeApiSettings,
      'a-model',
      fakeChromeAdapter,
      {
        systemInstruction: 'be friendly'
      }
    );
    expect(chatSession.params?.systemInstruction).to.deep.equal({
      role: 'system',
      parts: [{ text: 'be friendly' }]
    });
  });
  it('leaves systemInstruction unchanged if it is already a Content object', () => {
    const systemInstruction: Content = {
      role: 'system',
      parts: [{ text: 'be friendly' }]
    };
    const chatSession = new ChatSession(
      fakeApiSettings,
      'a-model',
      fakeChromeAdapter,
      { systemInstruction }
    );
    expect(chatSession.params?.systemInstruction).to.deep.equal(
      systemInstruction
    );
  });
  it('leaves systemInstruction as undefined if not provided', () => {
    const chatSession = new ChatSession(
      fakeApiSettings,
      'a-model',
      fakeChromeAdapter,
      {}
    );
    expect(chatSession.params?.systemInstruction).to.be.undefined;
  });
  describe('sendMessage()', () => {
    it('sends the correct params to generateContent()', async () => {
      const generateContentStub = vi
        .spyOn(mockGenerateContent, 'generateContent')
        .mockResolvedValue(undefined as any);
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          systemInstruction: {
            role: 'system',
            parts: [{ text: 'system instruction text' }]
          },
          history: [
            { role: 'user', parts: [{ text: 'user turn 1' }] },
            { role: 'model', parts: [{ text: 'model turn 1' }] }
          ]
        }
      );
      // The result isn't important.
      await chatSession.sendMessage('user turn 2');
      expect(generateContentStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.objectContaining({
          systemInstruction: {
            role: 'system',
            parts: [{ text: 'system instruction text' }]
          }
        }),
        expect.anything(),
        expect.anything()
      );
      expect(generateContentStub.mock.calls[0][2].contents).to.deep.equal([
        { role: 'user', parts: [{ text: 'user turn 1' }] },
        { role: 'model', parts: [{ text: 'model turn 1' }] },
        { role: 'user', parts: [{ text: 'user turn 2' }] }
      ]);
    });
    it('generateContent errors should be catchable', async () => {
      const generateContentStub = vi
        .spyOn(mockGenerateContent, 'generateContent')
        .mockRejectedValue('generateContent failed');
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await expect(chatSession.sendMessage('hello')).rejects.toThrow();
      expect(generateContentStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
    it('singleRequestOptions overrides requestOptions', async () => {
      const generateContentStub = vi
        .spyOn(mockGenerateContent, 'generateContent')
        .mockRejectedValue('generateContent failed'); // not important
      const requestOptions = {
        timeout: 1000
      };
      const singleRequestOptions = {
        timeout: 2000
      };
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        undefined,
        undefined,
        requestOptions
      );
      await expect(
        chatSession.sendMessage('hello', singleRequestOptions)
      ).rejects.toThrow();
      expect(generateContentStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        undefined,
        expect.objectContaining({
          timeout: singleRequestOptions.timeout
        })
      );
    });
    it('singleRequestOptions is merged with requestOptions', async () => {
      const generateContentStub = vi
        .spyOn(mockGenerateContent, 'generateContent')
        .mockRejectedValue('generateContent failed'); // not important
      const abortController = new AbortController();
      const requestOptions = {
        timeout: 1000
      };
      const singleRequestOptions = {
        signal: abortController.signal
      };
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        undefined,
        undefined,
        requestOptions
      );
      await expect(
        chatSession.sendMessage('hello', singleRequestOptions)
      ).rejects.toThrow();
      expect(generateContentStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        undefined,
        expect.objectContaining({
          timeout: requestOptions.timeout,
          signal: singleRequestOptions.signal
        })
      );
    });
    it('adds message and response to history', async () => {
      const fakeContent: Content = {
        role: 'model',
        parts: [
          { text: 'hi' },
          {
            text: 'thought about hi',
            thoughtSignature: 'thought signature'
          }
        ]
      };
      const fakeResponse = {
        candidates: [
          {
            index: 1,
            content: fakeContent
          }
        ]
      };
      const generateContentStub = vi
        .spyOn(mockGenerateContent, 'generateContent')
        .mockResolvedValue({
          // @ts-ignore
          response: fakeResponse
        });
      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      const result = await chatSession.sendMessage('hello');
      // @ts-ignore
      expect(result.response).to.equal(fakeResponse);
      // Test: stores history correctly?
      const history = await chatSession.getHistory();
      expect(history[0].role).to.equal('user');
      expect(history[0].parts[0].text).to.equal('hello');
      expect(history[1]).to.deep.equal(fakeResponse.candidates[0].content);
      // Test: sends history correctly?
      await chatSession.sendMessage('hello 2');
      expect(
        generateContentStub.mock.calls[1][2].contents[0].parts[0].text
      ).to.equal('hello');
      expect(generateContentStub.mock.calls[1][2].contents[1]).to.deep.equal(
        fakeResponse.candidates[0].content
      );
      expect(
        generateContentStub.mock.calls[1][2].contents[2].parts[0].text
      ).to.equal('hello 2');
      expect(generateContentStub.mock.calls[1][2].contents.length).to.equal(3);
    });
  });
  describe('sendMessageStream()', () => {
    it('sends the correct params to generateContentStream()', async () => {
      vi.useFakeTimers();
      const generateContentStreamStub = vi
        .spyOn(mockGenerateContent, 'generateContentStream')
        .mockResolvedValue(undefined as any);
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          systemInstruction: {
            role: 'system',
            parts: [{ text: 'system instruction text' }]
          },
          history: [
            { role: 'user', parts: [{ text: 'user turn 1' }] },
            { role: 'model', parts: [{ text: 'model turn 1' }] }
          ]
        }
      );
      // Expected as the stub resolved undefined, the result isn't important.
      await expect(
        chatSession.sendMessageStream('user turn 2')
      ).rejects.toThrow();
      expect(generateContentStreamStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.objectContaining({
          systemInstruction: {
            role: 'system',
            parts: [{ text: 'system instruction text' }]
          }
        }),
        expect.anything(),
        expect.anything()
      );
      expect(generateContentStreamStub.mock.calls[0][2].contents).to.deep.equal(
        [
          { role: 'user', parts: [{ text: 'user turn 1' }] },
          { role: 'model', parts: [{ text: 'model turn 1' }] },
          { role: 'user', parts: [{ text: 'user turn 2' }] }
        ]
      );
      await vi.runAllTimersAsync();
      vi.useRealTimers();
    });
    it('generateContentStream errors should be catchable', async () => {
      vi.useFakeTimers();
      const consoleStub = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const generateContentStreamStub = vi
        .spyOn(mockGenerateContent, 'generateContentStream')
        .mockRejectedValue(new Error('generateContentStream failed'));
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await expect(chatSession.sendMessageStream('hello')).rejects.toThrow();
      expect(generateContentStreamStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      await vi.runAllTimersAsync();
      expect(consoleStub).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
    it('downstream sendPromise errors should log but not throw', async () => {
      vi.useFakeTimers();
      const consoleStub = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      // make response undefined so that response.candidates errors
      const generateContentStreamStub = vi
        .spyOn(mockGenerateContent, 'generateContentStream')
        .mockResolvedValue({} as unknown as GenerateContentStreamResult);
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await chatSession.sendMessageStream('hello');
      expect(generateContentStreamStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      await vi.runAllTimersAsync();
      expect(consoleStub.mock.calls[0][1].toString()).to.include(
        // Firefox has different wording when a property is undefined
        'undefined'
      );
      vi.useRealTimers();
    });
    it('logs error and rejects user promise when response aggregation fails', async () => {
      const loggerStub = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const error = new Error('Aggregation failed');

      // Simulate stream returning, but the response promise failing (e.g. parsing error)
      vi.spyOn(mockGenerateContent, 'generateContentStream').mockResolvedValue({
        stream: (async function* () {})(),
        response: Promise.reject(error)
      } as unknown as GenerateContentStreamResult);

      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      const initialHistoryLength = (await chatSession.getHistory()).length;

      // Immediate call resolves with the stream object
      const result = await chatSession.sendMessageStream('hello');

      // User's response promise should reject
      await expect(result.response).rejects.toThrow(error);

      // Wait for the internal _sendPromise chain to settle
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loggerStub).toHaveBeenCalledWith(error);

      // History should NOT have been updated (no response appended)
      const finalHistory = await chatSession.getHistory();
      expect(finalHistory.length).to.equal(initialHistoryLength);
    });
    it('logs error but resolves user promise when history appending logic fails', async () => {
      const loggerStub = vi.spyOn(logger, 'error').mockImplementation(() => {});

      // Simulate a response that is technically valid enough to resolve aggregation,
      // but malformed in a way that causes the history update logic to throw.
      // Passing `null` as a candidate causes `{ ...response.candidates[0].content }` to throw.
      const malformedResponse = {
        candidates: [null]
      };

      vi.spyOn(mockGenerateContent, 'generateContentStream').mockResolvedValue({
        stream: (async function* () {})(),
        response: Promise.resolve(malformedResponse)
      } as unknown as GenerateContentStreamResult);

      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      const initialHistoryLength = (await chatSession.getHistory()).length;

      const result = await chatSession.sendMessageStream('hello');

      // The user's response promise SHOULD resolve, because aggregation succeeded.
      // The error is purely internal side-effect (history update).
      await expect(result.response).resolves.toEqual(malformedResponse);

      // Wait for internal chain
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loggerStub).toHaveBeenCalled();
      const errorArg = loggerStub.mock.calls[0][0];
      expect(errorArg).to.be.instanceOf(TypeError);

      // The user message WAS added before the crash, but the response wasn't.
      const finalHistory = await chatSession.getHistory();
      expect(finalHistory.length).to.equal(initialHistoryLength + 1);
      expect(finalHistory[finalHistory.length - 1].role).to.equal('user');
    });
    it('error from stream promise should not be logged', async () => {
      const consoleStub = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const customErr = new Error('foo');
      customErr.name = 'foo';
      vi.spyOn(mockGenerateContent, 'generateContentStream').mockRejectedValue(
        customErr
      );
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      try {
        // This will throw since generateContentStream will reject immediately.
        await chatSession.sendMessageStream('hello');
      } catch (e) {
        expect((e as unknown as any).name).to.equal('foo');
      }

      expect(consoleStub).not.toHaveBeenCalled();
    });
    it('error from final response promise should not be logged', async () => {
      const consoleStub = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.spyOn(mockGenerateContent, 'generateContentStream').mockResolvedValue({
        response: new Promise((_, reject) => reject(new Error()))
      } as unknown as GenerateContentStreamResult);
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await chatSession.sendMessageStream('hello');
      expect(consoleStub).not.toHaveBeenCalled();
    });
    it('singleRequestOptions overrides requestOptions', async () => {
      const generateContentStreamStub = vi
        .spyOn(mockGenerateContent, 'generateContentStream')
        .mockRejectedValue(new Error('generateContentStream failed')); // not important
      const requestOptions = {
        timeout: 1000
      };
      const singleRequestOptions = {
        timeout: 2000
      };
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        undefined,
        undefined,
        requestOptions
      );
      await expect(
        chatSession.sendMessageStream('hello', singleRequestOptions)
      ).rejects.toThrow();
      expect(generateContentStreamStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        undefined,
        expect.objectContaining({
          timeout: singleRequestOptions.timeout
        })
      );
    });
    it('singleRequestOptions is merged with requestOptions', async () => {
      const generateContentStreamStub = vi
        .spyOn(mockGenerateContent, 'generateContentStream')
        .mockRejectedValue(new Error('generateContentStream failed')); // not important
      const abortController = new AbortController();
      const requestOptions = {
        timeout: 1000
      };
      const singleRequestOptions = {
        signal: abortController.signal
      };
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        undefined,
        undefined,
        requestOptions
      );
      await expect(
        chatSession.sendMessageStream('hello', singleRequestOptions)
      ).rejects.toThrow();
      expect(generateContentStreamStub).toHaveBeenCalledWith(
        fakeApiSettings,
        'a-model',
        expect.anything(),
        undefined,
        expect.objectContaining({
          timeout: requestOptions.timeout,
          signal: singleRequestOptions.signal
        })
      );
    });
  });
  describe('Automatic function calling', () => {
    const finalResponse = {
      candidates: [
        {
          index: 1,
          content: {
            role: 'model',
            parts: [
              {
                text: 'final response'
              }
            ]
          }
        }
      ]
    };
    const getFunctionDeclarationGreeting = (
      greetingSpy: Mock
    ): FunctionDeclaration => ({
      name: 'getGreeting',
      functionReference: greetingSpy,
      description: `Given the user's name, give a custom greeting`,
      parameters: Schema.object({
        properties: {
          username: Schema.string({
            description: "The user's name"
          })
        }
      })
    });
    const getFunctionDeclarationFarewell = (
      farewellSpy: Mock
    ): FunctionDeclaration => ({
      name: 'getFarewell',
      functionReference: farewellSpy,
      description: `Given the user's name, give a custom farewell`,
      parameters: Schema.object({
        properties: {
          username: Schema.string({
            description: "The user's name"
          })
        }
      })
    });
    const functionCallPartGreeting = {
      functionCall: {
        id: 123,
        name: 'getGreeting',
        args: { username: 'Bob' }
      }
    };
    const functionCallPartFarewell = {
      functionCall: {
        name: 'getFarewell',
        args: { username: 'Bob' }
      }
    };
    describe('sendMessage()', () => {
      it('calls one function automatically', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const generateContentStub = vi
          .spyOn(mockGenerateContent, 'generateContent')
          // @ts-ignore
          .mockImplementation(async (apiSettings, model, params) => {
            const parts = params.contents[params.contents.length - 1].parts;
            if (parts[0].text?.includes('Bob')) {
              return {
                response: {
                  candidates: [
                    {
                      index: 1,
                      content: {
                        role: 'model',
                        parts: [functionCallPartGreeting]
                      }
                    }
                  ]
                }
              };
            } else if (parts[0].functionResponse) {
              return {
                response: finalResponse
              };
            }
          });
        const chatSession = new ChatSession(
          fakeApiSettings,
          'a-model',
          undefined,
          {
            tools: [
              {
                functionDeclarations: [
                  getFunctionDeclarationGreeting(greetingSpy)
                ]
              }
            ]
          }
        );
        const result = await chatSession.sendMessage('My name is Bob');
        expect(
          result.response.candidates?.[0].content.parts[0].text
        ).to.include('final response');
        expect(generateContentStub).toHaveBeenCalledTimes(2);
        const functionResponseContents =
          generateContentStub.mock.calls[1][2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(1);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
          id: 123,
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });
      it('calls two functions automatically', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const farewellSpy = vi.fn(getFarewell);
        const generateContentStub = vi
          .spyOn(mockGenerateContent, 'generateContent')
          // @ts-ignore
          .mockImplementation(async (apiSettings, model, params) => {
            const parts = params.contents[params.contents.length - 1].parts;
            if (parts[0].text?.includes('Bob')) {
              return {
                response: {
                  candidates: [
                    {
                      index: 1,
                      content: {
                        role: 'model',
                        parts: [
                          functionCallPartGreeting,
                          functionCallPartFarewell
                        ]
                      }
                    }
                  ]
                }
              };
            } else if (parts[0].functionResponse) {
              return {
                response: finalResponse
              };
            }
          });
        const chatSession = new ChatSession(
          fakeApiSettings,
          'a-model',
          undefined,
          {
            tools: [
              {
                functionDeclarations: [
                  getFunctionDeclarationGreeting(greetingSpy),
                  getFunctionDeclarationFarewell(farewellSpy)
                ]
              }
            ]
          }
        );
        const result = await chatSession.sendMessage('My name is Bob');
        expect(
          result.response.candidates?.[0].content.parts[0].text
        ).to.include('final response');
        expect(generateContentStub).toHaveBeenCalledTimes(2);
        const functionResponseContents =
          generateContentStub.mock.calls[1][2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(2);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
          id: 123,
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[1]
            .functionResponse
        ).to.deep.equal({
          name: 'getFarewell',
          response: { farewell: 'Bye, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
        expect(farewellSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });
      it('does not call any functions if sequential limit is set to 0', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const generateContentStub = vi
          .spyOn(mockGenerateContent, 'generateContent')
          // @ts-ignore
          .mockImplementation(async (apiSettings, model, params) => {
            const parts = params.contents[params.contents.length - 1].parts;
            if (parts[0].text?.includes('Bob')) {
              return {
                response: {
                  candidates: [
                    {
                      index: 1,
                      content: {
                        role: 'model',
                        parts: [functionCallPartGreeting]
                      }
                    }
                  ]
                }
              };
            } else if (parts[0].functionResponse) {
              return {
                response: finalResponse
              };
            }
          });
        const chatSession = new ChatSession(
          fakeApiSettings,
          'a-model',
          undefined,
          {
            tools: [
              {
                functionDeclarations: [
                  getFunctionDeclarationGreeting(greetingSpy)
                ]
              }
            ]
          },
          {
            maxSequentialFunctionCalls: 0
          }
        );
        const result = await chatSession.sendMessage('My name is Bob');
        expect(
          result.response.candidates?.[0].content.parts[0].functionCall?.name
        ).to.equal('getGreeting');
        expect(generateContentStub).toHaveBeenCalledTimes(1);
        expect(warnStub).toHaveBeenCalledWith(
          expect.stringContaining('exceeded the limit')
        );
        expect(greetingSpy).not.toHaveBeenCalled();
      });
    });
    describe('sendMessageStream()', () => {
      it('calls one function automatically', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const generateContentStreamStub = vi
          .spyOn(mockGenerateContent, 'generateContentStream')
          // @ts-ignore
          .mockImplementation(async (apiSettings, model, params) => {
            const parts = params.contents[params.contents.length - 1].parts;
            if (parts[0].text?.includes('Bob')) {
              return {
                firstValue: {
                  candidates: [
                    {
                      index: 1,
                      content: {
                        role: 'model',
                        parts: [functionCallPartGreeting]
                      }
                    }
                  ]
                }
              };
            } else if (parts[0].functionResponse) {
              return {
                firstValue: finalResponse,
                response: finalResponse
              };
            }
          });
        const chatSession = new ChatSession(
          fakeApiSettings,
          'a-model',
          undefined,
          {
            tools: [
              {
                functionDeclarations: [
                  getFunctionDeclarationGreeting(greetingSpy)
                ]
              }
            ]
          }
        );
        const result = await chatSession.sendMessageStream('My name is Bob');
        // No sense testing the stream fully, it's just stubbed data.
        await result.response;
        expect(generateContentStreamStub).toHaveBeenCalledTimes(2);
        const functionResponseContents =
          generateContentStreamStub.mock.calls[1][2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(1);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
          id: 123,
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });
      it('calls two functions automatically', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const farewellSpy = vi.fn(getFarewell);
        const generateContentStreamStub = vi
          .spyOn(mockGenerateContent, 'generateContentStream')
          // @ts-ignore
          .mockImplementation(async (apiSettings, model, params) => {
            const parts = params.contents[params.contents.length - 1].parts;
            if (parts[0].text?.includes('Bob')) {
              return {
                firstValue: {
                  candidates: [
                    {
                      index: 1,
                      content: {
                        role: 'model',
                        parts: [
                          functionCallPartGreeting,
                          functionCallPartFarewell
                        ]
                      }
                    }
                  ]
                }
              };
            } else if (parts[0].functionResponse) {
              return {
                firstValue: finalResponse,
                response: finalResponse
              };
            }
          });
        const chatSession = new ChatSession(
          fakeApiSettings,
          'a-model',
          undefined,
          {
            tools: [
              {
                functionDeclarations: [
                  getFunctionDeclarationGreeting(greetingSpy),
                  getFunctionDeclarationFarewell(farewellSpy)
                ]
              }
            ]
          }
        );
        const result = await chatSession.sendMessageStream('My name is Bob');
        await result.response;
        expect(generateContentStreamStub).toHaveBeenCalledTimes(2);
        const functionResponseContents =
          generateContentStreamStub.mock.calls[1][2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(2);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
          id: 123,
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[1]
            .functionResponse
        ).to.deep.equal({
          name: 'getFarewell',
          response: { farewell: 'Bye, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
        expect(farewellSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });
      it('does not call any functions if sequential limit is set to 0', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const functionCallResponse = {
          candidates: [
            {
              index: 1,
              content: {
                role: 'model',
                parts: [functionCallPartGreeting]
              }
            }
          ]
        };
        const generateContentStreamStub = vi
          .spyOn(mockGenerateContent, 'generateContentStream')
          // @ts-ignore
          .mockImplementation(async (apiSettings, model, params) => {
            const parts = params.contents[params.contents.length - 1].parts;
            if (parts[0].text?.includes('Bob')) {
              return {
                firstValue: functionCallResponse,
                response: functionCallResponse
              };
            } else if (parts[0].functionResponse) {
              return {
                firstValue: finalResponse,
                response: finalResponse
              };
            }
          });
        const chatSession = new ChatSession(
          fakeApiSettings,
          'a-model',
          undefined,
          {
            tools: [
              {
                functionDeclarations: [
                  getFunctionDeclarationGreeting(greetingSpy)
                ]
              }
            ]
          },
          {
            maxSequentialFunctionCalls: 0
          }
        );
        const result = await chatSession.sendMessageStream('My name is Bob');
        // No sense testing the stream fully, it's just stubbed data.
        const response = await result.response;
        expect(
          response.candidates?.[0].content.parts[0].functionCall?.name
        ).to.equal('getGreeting');
        expect(generateContentStreamStub).toHaveBeenCalledTimes(1);
        expect(warnStub).toHaveBeenCalledWith(
          expect.stringContaining('exceeded the limit')
        );
        expect(greetingSpy).not.toHaveBeenCalled();
      });
    });
  });
  describe('_getCallableFunctionCalls()', () => {
    it('returns all functions if they have references', async () => {
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'myFunction1',
                  functionReference: () => {},
                  description: 'a function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                },
                {
                  name: 'myFunction2',
                  functionReference: () => {},
                  description: 'another function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                }
              ]
            }
          ]
        }
      );
      const query1 = chatSession._getCallableFunctionCalls({
        candidates: [
          {
            index: 1,
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'myFunction1', args: {} } }]
            }
          }
        ]
      });
      expect(query1?.length).to.equal(1);
      const query2 = chatSession._getCallableFunctionCalls({
        candidates: [
          {
            index: 1,
            content: {
              role: 'model',
              parts: [
                { functionCall: { name: 'myFunction1', args: {} } },
                { functionCall: { name: 'myFunction2', args: {} } }
              ]
            }
          }
        ]
      });
      expect(query2?.length).to.equal(2);
    });
    it('returns undefined if any called function does not have a reference', async () => {
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'myFunction1',
                  functionReference: () => {},
                  description: 'a function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                },
                {
                  name: 'myFunction2',
                  description: 'another function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                }
              ]
            }
          ]
        }
      );
      const query1 = chatSession._getCallableFunctionCalls({
        candidates: [
          {
            index: 1,
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'myFunction1', args: {} } }]
            }
          }
        ]
      });
      expect(query1?.length).to.equal(1);
      const query2 = chatSession._getCallableFunctionCalls({
        candidates: [
          {
            index: 1,
            content: {
              role: 'model',
              parts: [
                { functionCall: { name: 'myFunction1', args: {} } },
                { functionCall: { name: 'myFunction2', args: {} } }
              ]
            }
          }
        ]
      });
      expect(query2).to.be.undefined;
    });
  });
  describe('_callFunctionsAsNeeded()', () => {
    it('calls functions and formats responses', async () => {
      const myFunction1 = vi.fn(() => ({ replyParam: 'hi' }));
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'myFunction1',
                  functionReference: myFunction1,
                  description: 'a function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                }
              ]
            }
          ]
        }
      );
      const responseParts = await chatSession._callFunctionsAsNeeded([
        { name: 'myFunction1', args: { someParam: 'a' } }
      ]);
      expect(myFunction1).toHaveBeenCalledWith({ someParam: 'a' });
      expect(responseParts[0].functionResponse).to.deep.equal({
        name: 'myFunction1',
        response: { replyParam: 'hi' }
      });
    });
    it('calls functions and formats responses (2 functions)', async () => {
      const myFunction1 = vi.fn(() => ({ replyParam: 'hi' }));
      const myFunction2 = vi.fn(() => ({ replyParam: 'yo' }));
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'myFunction1',
                  functionReference: myFunction1,
                  description: 'a function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                },
                {
                  name: 'myFunction2',
                  functionReference: myFunction2,
                  description: 'another function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                }
              ]
            }
          ]
        }
      );
      const responseParts = await chatSession._callFunctionsAsNeeded([
        { name: 'myFunction1', args: { someParam: 'a' } },
        { name: 'myFunction2', args: { someParam: 'b' } }
      ]);
      expect(myFunction1).toHaveBeenCalledWith({ someParam: 'a' });
      expect(myFunction2).toHaveBeenCalledWith({ someParam: 'b' });
      expect(responseParts[0].functionResponse).to.deep.equal({
        name: 'myFunction1',
        response: { replyParam: 'hi' }
      });
      expect(responseParts[1].functionResponse).to.deep.equal({
        name: 'myFunction2',
        response: { replyParam: 'yo' }
      });
    });
    it('calls functions and formats responses (one function async)', async () => {
      const myFunction1 = vi.fn(() => ({ replyParam: 'hi' }));
      const myFunction2 = vi.fn(() => Promise.resolve({ replyParam: 'yo' }));
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter,
        {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'myFunction1',
                  functionReference: myFunction1,
                  description: 'a function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                },
                {
                  name: 'myFunction2',
                  functionReference: myFunction2,
                  description: 'another function',
                  parameters: Schema.object({
                    properties: {
                      someParam: Schema.string({
                        description: 'some param'
                      })
                    }
                  })
                }
              ]
            }
          ]
        }
      );
      const responseParts = await chatSession._callFunctionsAsNeeded([
        { name: 'myFunction1', args: { someParam: 'a' } },
        { name: 'myFunction2', args: { someParam: 'b' } }
      ]);
      expect(myFunction1).toHaveBeenCalledWith({ someParam: 'a' });
      expect(myFunction2).toHaveBeenCalledWith({ someParam: 'b' });
      expect(responseParts[0].functionResponse).to.deep.equal({
        name: 'myFunction1',
        response: { replyParam: 'hi' }
      });
      expect(responseParts[1].functionResponse).to.deep.equal({
        name: 'myFunction2',
        response: { replyParam: 'yo' }
      });
    });
  });
});
