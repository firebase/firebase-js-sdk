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
import { match, restore, SinonSpy, spy, stub, useFakeTimers } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import * as generateContentMethods from './generate-content';
import {
  Content,
  FunctionDeclaration,
  GenerateContentStreamResult
} from '../types';
import { ChatSession } from './chat-session';
import { ApiSettings } from '../types/internal';
import { VertexAIBackend } from '../backend';
import { fakeChromeAdapter } from '../../test-utils/get-fake-firebase-services';
import { logger } from '../logger';
import { Schema } from '../api';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new VertexAIBackend()
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
    restore();
  });
  describe('sendMessage()', () => {
    it('generateContent errors should be catchable', async () => {
      const generateContentStub = stub(
        generateContentMethods,
        'generateContent'
      ).rejects('generateContent failed');
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await expect(chatSession.sendMessage('hello')).to.be.rejected;
      expect(generateContentStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any
      );
    });
    it('singleRequestOptions overrides requestOptions', async () => {
      const generateContentStub = stub(
        generateContentMethods,
        'generateContent'
      ).rejects('generateContent failed'); // not important
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
      await expect(chatSession.sendMessage('hello', singleRequestOptions)).to.be
        .rejected;
      expect(generateContentStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any,
        match.any,
        match({
          timeout: singleRequestOptions.timeout
        })
      );
    });
    it('singleRequestOptions is merged with requestOptions', async () => {
      const generateContentStub = stub(
        generateContentMethods,
        'generateContent'
      ).rejects('generateContent failed'); // not important
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
      await expect(chatSession.sendMessage('hello', singleRequestOptions)).to.be
        .rejected;
      expect(generateContentStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any,
        match.any,
        match({
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
      const generateContentStub = stub(
        generateContentMethods,
        'generateContent'
      ).resolves({
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
      expect(generateContentStub.args[1][2].contents[0].parts[0].text).to.equal(
        'hello'
      );
      expect(generateContentStub.args[1][2].contents[1]).to.deep.equal(
        fakeResponse.candidates[0].content
      );
      expect(generateContentStub.args[1][2].contents[2].parts[0].text).to.equal(
        'hello 2'
      );
    });
  });
  describe('sendMessageStream()', () => {
    it('generateContentStream errors should be catchable', async () => {
      const clock = useFakeTimers();
      const consoleStub = stub(console, 'error');
      const generateContentStreamStub = stub(
        generateContentMethods,
        'generateContentStream'
      ).rejects('generateContentStream failed');
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await expect(chatSession.sendMessageStream('hello')).to.be.rejected;
      expect(generateContentStreamStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any,
        match.any
      );
      await clock.runAllAsync();
      expect(consoleStub).to.not.be.called;
      clock.restore();
    });
    it('downstream sendPromise errors should log but not throw', async () => {
      const clock = useFakeTimers();
      const consoleStub = stub(console, 'error');
      // make response undefined so that response.candidates errors
      const generateContentStreamStub = stub(
        generateContentMethods,
        'generateContentStream'
      ).resolves({} as unknown as GenerateContentStreamResult);
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await chatSession.sendMessageStream('hello');
      expect(generateContentStreamStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any,
        match.any
      );
      await clock.runAllAsync();
      expect(consoleStub.args[0][1].toString()).to.include(
        // Firefox has different wording when a property is undefined
        'undefined'
      );
      clock.restore();
    });
    it('logs error and rejects user promise when response aggregation fails', async () => {
      const loggerStub = stub(logger, 'error');
      const error = new Error('Aggregation failed');

      // Simulate stream returning, but the response promise failing (e.g. parsing error)
      stub(generateContentMethods, 'generateContentStream').resolves({
        stream: (async function* () {})(),
        response: Promise.reject(error)
      } as unknown as GenerateContentStreamResult);

      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      const initialHistoryLength = (await chatSession.getHistory()).length;

      // Immediate call resolves with the stream object
      const result = await chatSession.sendMessageStream('hello');

      // User's response promise should reject
      await expect(result.response).to.be.rejectedWith(error);

      // Wait for the internal _sendPromise chain to settle
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loggerStub).to.have.been.calledWith(error);

      // History should NOT have been updated (no response appended)
      const finalHistory = await chatSession.getHistory();
      expect(finalHistory.length).to.equal(initialHistoryLength);
    });
    it('logs error but resolves user promise when history appending logic fails', async () => {
      const loggerStub = stub(logger, 'error');

      // Simulate a response that is technically valid enough to resolve aggregation,
      // but malformed in a way that causes the history update logic to throw.
      // Passing `null` as a candidate causes `{ ...response.candidates[0].content }` to throw.
      const malformedResponse = {
        candidates: [null]
      };

      stub(generateContentMethods, 'generateContentStream').resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(malformedResponse)
      } as unknown as GenerateContentStreamResult);

      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      const initialHistoryLength = (await chatSession.getHistory()).length;

      const result = await chatSession.sendMessageStream('hello');

      // The user's response promise SHOULD resolve, because aggregation succeeded.
      // The error is purely internal side-effect (history update).
      await expect(result.response).to.eventually.equal(malformedResponse);

      // Wait for internal chain
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loggerStub).to.have.been.called;
      const errorArg = loggerStub.firstCall.args[0];
      expect(errorArg).to.be.instanceOf(TypeError);

      // The user message WAS added before the crash, but the response wasn't.
      const finalHistory = await chatSession.getHistory();
      expect(finalHistory.length).to.equal(initialHistoryLength + 1);
      expect(finalHistory[finalHistory.length - 1].role).to.equal('user');
    });
    it('error from stream promise should not be logged', async () => {
      const consoleStub = stub(console, 'error');
      stub(generateContentMethods, 'generateContentStream').rejects('foo');
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

      expect(consoleStub).to.not.have.been.called;
    });
    it('error from final response promise should not be logged', async () => {
      const consoleStub = stub(console, 'error');
      stub(generateContentMethods, 'generateContentStream').resolves({
        response: new Promise((_, reject) => reject(new Error()))
      } as unknown as GenerateContentStreamResult);
      const chatSession = new ChatSession(
        fakeApiSettings,
        'a-model',
        fakeChromeAdapter
      );
      await chatSession.sendMessageStream('hello');
      expect(consoleStub).to.not.have.been.called;
    });
    it('singleRequestOptions overrides requestOptions', async () => {
      const generateContentStreamStub = stub(
        generateContentMethods,
        'generateContentStream'
      ).rejects('generateContentStream failed'); // not important
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
      await expect(chatSession.sendMessageStream('hello', singleRequestOptions))
        .to.be.rejected;
      expect(generateContentStreamStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any,
        match.any,
        match({
          timeout: singleRequestOptions.timeout
        })
      );
    });
    it('singleRequestOptions is merged with requestOptions', async () => {
      const generateContentStreamStub = stub(
        generateContentMethods,
        'generateContentStream'
      ).rejects('generateContentStream failed'); // not important
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
      await expect(chatSession.sendMessageStream('hello', singleRequestOptions))
        .to.be.rejected;
      expect(generateContentStreamStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any,
        match.any,
        match({
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
      greetingSpy: SinonSpy
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
      farewellSpy: SinonSpy
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
        const greetingSpy = spy(getGreeting);
        const generateContentStub = stub(
          generateContentMethods,
          'generateContent'
          // @ts-ignore
        ).callsFake(async (apiSettings, model, params) => {
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
        expect(generateContentStub).to.be.calledTwice;
        const functionResponseContents =
          generateContentStub.secondCall.args[2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(1);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
      });
      it('calls two functions automatically', async () => {
        const greetingSpy = spy(getGreeting);
        const farewellSpy = spy(getFarewell);
        const generateContentStub = stub(
          generateContentMethods,
          'generateContent'
          // @ts-ignore
        ).callsFake(async (apiSettings, model, params) => {
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
        expect(generateContentStub).to.be.calledTwice;
        const functionResponseContents =
          generateContentStub.secondCall.args[2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(2);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
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
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
        expect(farewellSpy).to.be.calledWith({ username: 'Bob' });
      });
    });
    describe('sendMessageStream()', () => {
      it('calls one function automatically', async () => {
        const greetingSpy = spy(getGreeting);
        const generateContentStreamStub = stub(
          generateContentMethods,
          'generateContentStream'
          // @ts-ignore
        ).callsFake(async (apiSettings, model, params) => {
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
        expect(generateContentStreamStub).to.be.calledTwice;
        const functionResponseContents =
          generateContentStreamStub.secondCall.args[2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(1);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
      });
      it('calls two functions automatically', async () => {
        const greetingSpy = spy(getGreeting);
        const farewellSpy = spy(getFarewell);
        const generateContentStreamStub = stub(
          generateContentMethods,
          'generateContentStream'
          // @ts-ignore
        ).callsFake(async (apiSettings, model, params) => {
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
        expect(generateContentStreamStub).to.be.calledTwice;
        const functionResponseContents =
          generateContentStreamStub.secondCall.args[2].contents;
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts
            .length
        ).to.equal(2);
        expect(
          functionResponseContents[functionResponseContents.length - 1].parts[0]
            .functionResponse
        ).to.deep.equal({
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
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
        expect(farewellSpy).to.be.calledWith({ username: 'Bob' });
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
      const myFunction1 = spy(() => ({ replyParam: 'hi' }));
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
      expect(myFunction1).to.be.calledWith({ someParam: 'a' });
      expect(responseParts[0].functionResponse).to.deep.equal({
        name: 'myFunction1',
        response: { replyParam: 'hi' }
      });
    });
    it('calls functions and formats responses (2 functions)', async () => {
      const myFunction1 = spy(() => ({ replyParam: 'hi' }));
      const myFunction2 = spy(() => ({ replyParam: 'yo' }));
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
      expect(myFunction1).to.be.calledWith({ someParam: 'a' });
      expect(myFunction2).to.be.calledWith({ someParam: 'b' });
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
      const myFunction1 = spy(() => ({ replyParam: 'hi' }));
      const myFunction2 = spy(() => Promise.resolve({ replyParam: 'yo' }));
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
      expect(myFunction1).to.be.calledWith({ someParam: 'a' });
      expect(myFunction2).to.be.calledWith({ someParam: 'b' });
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
