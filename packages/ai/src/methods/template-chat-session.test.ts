/**
 * @license
 * Copyright 2026 Google LLC
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
import { match, restore, SinonSpy, spy, stub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import * as generateContentMethods from './generate-content';
import { Content, TemplateFunctionDeclaration } from '../types';
import { TemplateChatSession } from './template-chat-session';
import { ApiSettings } from '../types/internal';
import { VertexAIBackend } from '../backend';
import { logger } from '../logger';
import { Schema } from '../api';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new VertexAIBackend('us-central1')
};

const TEMPLATE_ID = 'my-template';

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

describe('TemplateChatSession', () => {
  afterEach(() => {
    restore();
  });
  describe('formatRequest()', () => {
    it(
      'should rename functionDeclarations to templateFunctions' +
        ' and parameters to inputSchema',
      () => {
        const chatSession = new TemplateChatSession(fakeApiSettings, {
          templateId: TEMPLATE_ID,
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'imAFunction',
                  parameters: { type: 'object' }
                }
              ]
            }
          ]
        });
        const formattedRequest = chatSession._formatRequest(
          { role: 'user', parts: [] },
          []
        );
        //@ts-expect-error
        expect(formattedRequest.tools?.[0].functionDeclarations).to.not.exist;
        //@ts-expect-error
        expect(formattedRequest.tools?.[0].templateFunctions?.[0].parameters).to
          .not.exist;
        expect(
          formattedRequest.tools?.[0].templateFunctions?.[0]?.inputSchema?.type
        ).to.equal('object');
        expect(
          formattedRequest.tools?.[0].templateFunctions?.[0]?.name
        ).to.equal('imAFunction');
      }
    );
    it('should not include any properties not provided in params', () => {
      const chatSession = new TemplateChatSession(fakeApiSettings, {
        templateId: TEMPLATE_ID
      });
      const formattedRequest = chatSession._formatRequest(
        { role: 'user', parts: [] },
        []
      );
      expect(formattedRequest.tools).to.not.exist;
      expect(formattedRequest.toolConfig).to.not.exist;
      expect(formattedRequest.templateVariables).to.not.exist;
      expect(formattedRequest.history).to.exist;
    });
  });

  describe('sendMessage()', () => {
    it('generateContent errors should be catchable', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).rejects(new Error('templateGenerateContent failed'));
      const chatSession = new TemplateChatSession(fakeApiSettings, {
        templateId: TEMPLATE_ID
      });
      await expect(chatSession.sendMessage('hello')).to.be.rejected;
      expect(templateGenerateContentStub).to.be.calledWith(
        fakeApiSettings,
        TEMPLATE_ID,
        match.any
      );
    });

    it('adds message and response to history', async () => {
      const fakeContent: Content = {
        role: 'model',
        parts: [{ text: 'hi' }]
      };
      const fakeResponse = {
        candidates: [
          {
            index: 1,
            content: fakeContent
          }
        ]
      };
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({
        // @ts-ignore
        response: fakeResponse
      });
      const chatSession = new TemplateChatSession(fakeApiSettings, {
        templateId: TEMPLATE_ID
      });
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
        (templateGenerateContentStub.args[1][2] as any).history[0].parts[0].text
      ).to.equal('hello');
      expect(
        (templateGenerateContentStub.args[1][2] as any).history[1]
      ).to.deep.equal(fakeResponse.candidates[0].content);
      expect(
        (templateGenerateContentStub.args[1][2] as any).history[2].parts[0].text
      ).to.equal('hello 2');
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
    ): TemplateFunctionDeclaration => ({
      name: 'getGreeting',
      functionReference: greetingSpy,
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
    ): TemplateFunctionDeclaration => ({
      name: 'getFarewell',
      functionReference: farewellSpy,
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
        id: 789,
        name: 'getFarewell',
        args: { username: 'Bob' }
      }
    };

    describe('sendMessage()', () => {
      it('calls one function automatically', async () => {
        const greetingSpy = spy(getGreeting);
        const templateGenerateContentStub = stub(
          generateContentMethods,
          'templateGenerateContent'
          // @ts-ignore
        ).callsFake(async (apiSettings, templateId, params: any) => {
          const parts = params.history[params.history.length - 1].parts;
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
        const chatSession = new TemplateChatSession(fakeApiSettings, {
          templateId: TEMPLATE_ID,
          tools: [
            {
              functionDeclarations: [
                getFunctionDeclarationGreeting(greetingSpy)
              ]
            }
          ]
        });
        const result = await chatSession.sendMessage('My name is Bob');
        expect(
          result.response.candidates?.[0].content.parts[0].text
        ).to.include('final response');
        expect(templateGenerateContentStub).to.be.calledTwice;

        const functionResponseHistory = (
          templateGenerateContentStub.secondCall.args[2] as any
        ).history;
        const lastTurnParts =
          functionResponseHistory[functionResponseHistory.length - 1].parts;

        expect(lastTurnParts.length).to.equal(1);
        expect(lastTurnParts[0].functionResponse).to.deep.equal({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
      });

      it('calls two functions automatically', async () => {
        const greetingSpy = spy(getGreeting);
        const farewellSpy = spy(getFarewell);
        const templateGenerateContentStub = stub(
          generateContentMethods,
          'templateGenerateContent'
          // @ts-ignore
        ).callsFake(async (apiSettings, templateId, params: any) => {
          const parts = params.history[params.history.length - 1].parts;
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
        const chatSession = new TemplateChatSession(fakeApiSettings, {
          templateId: TEMPLATE_ID,
          tools: [
            {
              functionDeclarations: [
                getFunctionDeclarationGreeting(greetingSpy),
                getFunctionDeclarationFarewell(farewellSpy)
              ]
            }
          ]
        });
        const result = await chatSession.sendMessage('My name is Bob');
        expect(
          result.response.candidates?.[0].content.parts[0].text
        ).to.include('final response');
        expect(templateGenerateContentStub).to.be.calledTwice;

        const functionResponseHistory = (
          templateGenerateContentStub.secondCall.args[2] as any
        ).history;
        const lastTurnParts =
          functionResponseHistory[functionResponseHistory.length - 1].parts;

        expect(lastTurnParts.length).to.equal(2);
        expect(lastTurnParts[0].functionResponse).to.deep.equal({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(lastTurnParts[1].functionResponse).to.deep.equal({
          id: 789,
          name: 'getFarewell',
          response: { farewell: 'Bye, Bob' }
        });
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
        expect(farewellSpy).to.be.calledWith({ username: 'Bob' });
      });

      it('does not call any functions if sequential limit is set to 0', async () => {
        const greetingSpy = spy(getGreeting);
        const warnStub = stub(logger, 'warn');
        const templateGenerateContentStub = stub(
          generateContentMethods,
          'templateGenerateContent'
          // @ts-ignore
        ).callsFake(async (apiSettings, templateId, params: any) => {
          const parts = params.history[params.history.length - 1].parts;
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
        const chatSession = new TemplateChatSession(
          fakeApiSettings,
          {
            templateId: TEMPLATE_ID,
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
        expect(templateGenerateContentStub).to.be.calledOnce;
        expect(warnStub).calledWithMatch('exceeded the limit');
        expect(greetingSpy).to.not.be.called;
      });
    });

    describe('sendMessageStream()', () => {
      it('calls one function automatically on stream', async () => {
        const greetingSpy = spy(getGreeting);
        const templateGenerateContentStreamStub = stub(
          generateContentMethods,
          'templateGenerateContentStream'
          // @ts-ignore
        ).callsFake(async (apiSettings, templateId, params: any) => {
          const parts = params.history[params.history.length - 1].parts;
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
        const chatSession = new TemplateChatSession(fakeApiSettings, {
          templateId: TEMPLATE_ID,
          tools: [
            {
              functionDeclarations: [
                getFunctionDeclarationGreeting(greetingSpy)
              ]
            }
          ]
        });
        const result = await chatSession.sendMessageStream('My name is Bob');

        await result.response;
        expect(templateGenerateContentStreamStub).to.be.calledTwice;

        const functionResponseHistory = (
          templateGenerateContentStreamStub.secondCall.args[2] as any
        ).history;
        const lastTurnParts =
          functionResponseHistory[functionResponseHistory.length - 1].parts;

        expect(lastTurnParts.length).to.equal(1);
        expect(lastTurnParts[0].functionResponse).to.deep.equal({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).to.be.calledWith({ username: 'Bob' });
      });
    });
  });
});
