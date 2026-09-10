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

import { expect, vi, Mock } from 'vitest';

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: {
    templateGenerateContent: (..._args: any[]): any => {},
    templateGenerateContentStream: (..._args: any[]): any => {}
  }
}));

vi.mock('./generate-content', async importOriginal => {
  const actual = await importOriginal<any>();
  mockGenerateContent.templateGenerateContent = (...args: any[]) =>
    actual.templateGenerateContent(...args);
  mockGenerateContent.templateGenerateContentStream = (...args: any[]) =>
    actual.templateGenerateContentStream(...args);
  return {
    ...actual,
    templateGenerateContent: (...args: any[]) =>
      mockGenerateContent.templateGenerateContent(...args),
    templateGenerateContentStream: (...args: any[]) =>
      mockGenerateContent.templateGenerateContentStream(...args)
  };
});

import { Content, TemplateFunctionDeclaration } from '../types';
import { TemplateChatSessionImpl } from './template-chat-session';
import { ApiSettings } from '../types/internal';
import { AgentPlatformBackend } from '../backend';
import { logger } from '../logger';
import { Schema } from '../api';

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'global',
  backend: new AgentPlatformBackend('global')
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
    vi.restoreAllMocks();
  });
  describe('formatRequest()', () => {
    it(
      'should rename functionDeclarations to templateFunctions' +
        ' and parameters to inputSchema',
      () => {
        const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
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
        expect(
          (formattedRequest.tools?.[0] as any)?.functionDeclarations
        ).toBeUndefined();
        expect(
          (formattedRequest.tools?.[0].templateFunctions?.[0] as any)
            ?.parameters
        ).toBeUndefined();
        expect(
          formattedRequest.tools?.[0].templateFunctions?.[0]?.inputSchema?.type
        ).toBe('object');
        expect(formattedRequest.tools?.[0].templateFunctions?.[0]?.name).toBe(
          'imAFunction'
        );
      }
    );
    it('should not include any properties not provided in params', () => {
      const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
        templateId: TEMPLATE_ID
      });
      const formattedRequest = chatSession._formatRequest(
        { role: 'user', parts: [] },
        []
      );
      expect(formattedRequest.tools).toBeUndefined();
      expect(formattedRequest.toolConfig).toBeUndefined();
      expect(formattedRequest.templateVariables).toBeUndefined();
      expect(formattedRequest.history).toBeDefined();
    });
  });

  describe('sendMessage()', () => {
    it('generateContent errors should be catchable', async () => {
      const templateGenerateContentStub = vi
        .spyOn(mockGenerateContent, 'templateGenerateContent')
        .mockRejectedValue(new Error('templateGenerateContent failed'));
      const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
        templateId: TEMPLATE_ID
      });
      await expect(chatSession.sendMessage('hello')).rejects.toThrow();
      expect(templateGenerateContentStub).toHaveBeenCalledWith(
        fakeApiSettings,
        TEMPLATE_ID,
        {
          history: [
            {
              role: 'user',
              parts: [{ text: 'hello' }]
            }
          ]
        },
        {}
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
      const templateGenerateContentStub = vi
        .spyOn(mockGenerateContent, 'templateGenerateContent')
        .mockResolvedValue({
          // @ts-ignore
          response: fakeResponse
        });
      const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
        templateId: TEMPLATE_ID
      });
      const result = await chatSession.sendMessage('hello');
      // @ts-ignore
      expect(result.response).toBe(fakeResponse);

      // Test: stores history correctly?
      const history = await chatSession.getHistory();
      expect(history[0].role).toBe('user');
      expect(history[0].parts[0].text).toBe('hello');
      expect(history[1]).toEqual(fakeResponse.candidates[0].content);

      // Test: sends history correctly?
      await chatSession.sendMessage('hello 2');
      expect(
        (templateGenerateContentStub.mock.calls[1][2] as any).history[0]
          .parts[0].text
      ).toBe('hello');
      expect(
        (templateGenerateContentStub.mock.calls[1][2] as any).history[1]
      ).toEqual(fakeResponse.candidates[0].content);
      expect(
        (templateGenerateContentStub.mock.calls[1][2] as any).history[2]
          .parts[0].text
      ).toBe('hello 2');
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
      farewellSpy: Mock
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
        const greetingSpy = vi.fn(getGreeting);
        const templateGenerateContentStub = vi
          .spyOn(mockGenerateContent, 'templateGenerateContent')
          // @ts-ignore
          .mockImplementation(async (apiSettings, templateId, params: any) => {
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
        const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
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
        expect(result.response.candidates?.[0].content.parts[0].text).toContain(
          'final response'
        );
        expect(templateGenerateContentStub).toHaveBeenCalledTimes(2);

        const functionResponseHistory = (
          templateGenerateContentStub.mock.calls[1][2] as any
        ).history;
        const lastTurnParts =
          functionResponseHistory[functionResponseHistory.length - 1].parts;

        expect(lastTurnParts.length).toBe(1);
        expect(lastTurnParts[0].functionResponse).toEqual({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });

      it('calls two functions automatically', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const farewellSpy = vi.fn(getFarewell);
        const templateGenerateContentStub = vi
          .spyOn(mockGenerateContent, 'templateGenerateContent')
          // @ts-ignore
          .mockImplementation(async (apiSettings, templateId, params: any) => {
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
        const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
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
        expect(result.response.candidates?.[0].content.parts[0].text).toContain(
          'final response'
        );
        expect(templateGenerateContentStub).toHaveBeenCalledTimes(2);

        const functionResponseHistory = (
          templateGenerateContentStub.mock.calls[1][2] as any
        ).history;
        const lastTurnParts =
          functionResponseHistory[functionResponseHistory.length - 1].parts;

        expect(lastTurnParts.length).toBe(2);
        expect(lastTurnParts[0].functionResponse).toEqual({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(lastTurnParts[1].functionResponse).toEqual({
          id: 789,
          name: 'getFarewell',
          response: { farewell: 'Bye, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
        expect(farewellSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });

      it('does not call any functions if sequential limit is set to 0', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const templateGenerateContentStub = vi
          .spyOn(mockGenerateContent, 'templateGenerateContent')
          // @ts-ignore
          .mockImplementation(async (apiSettings, templateId, params: any) => {
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
        const chatSession = new TemplateChatSessionImpl(
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
        ).toBe('getGreeting');
        expect(templateGenerateContentStub).toHaveBeenCalledTimes(1);
        expect(warnStub).toHaveBeenCalledWith(
          expect.stringContaining('exceeded the limit')
        );
        expect(greetingSpy).not.toHaveBeenCalled();
      });
    });

    describe('sendMessageStream()', () => {
      it('calls one function automatically on stream', async () => {
        const greetingSpy = vi.fn(getGreeting);
        const templateGenerateContentStreamStub = vi
          .spyOn(mockGenerateContent, 'templateGenerateContentStream')
          // @ts-ignore
          .mockImplementation(async (apiSettings, templateId, params: any) => {
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
        const chatSession = new TemplateChatSessionImpl(fakeApiSettings, {
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
        expect(templateGenerateContentStreamStub).toHaveBeenCalledTimes(2);

        const functionResponseHistory = (
          templateGenerateContentStreamStub.mock.calls[1][2] as any
        ).history;
        const lastTurnParts =
          functionResponseHistory[functionResponseHistory.length - 1].parts;

        expect(lastTurnParts.length).toBe(1);
        expect(lastTurnParts[0].functionResponse).toEqual({
          name: 'getGreeting',
          response: { greeting: 'Hi, Bob' }
        });
        expect(greetingSpy).toHaveBeenCalledWith({ username: 'Bob' });
      });
    });
  });
});
