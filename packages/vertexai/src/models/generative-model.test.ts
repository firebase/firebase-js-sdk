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
import { FunctionCallingMode, AI } from '../public-types';
import * as request from '../requests/request';
import { match, restore, stub } from 'sinon';
import { getMockResponse } from '../../test-utils/mock-response';
import sinonChai from 'sinon-chai';
import { VertexAIBackend } from '../backend';

use(sinonChai);

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
    const genModel = new GenerativeModel(fakeAI, {
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
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.NONE } },
      systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] }
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
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly')
        );
      }),
      {}
    );
    restore();
  });
  it('passes text-only systemInstruction through to generateContent', async () => {
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      systemInstruction: 'be friendly'
    });
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
    const genModel = new GenerativeModel(fakeAI, {
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
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.NONE } },
      systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] }
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
        }
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
          value.includes(FunctionCallingMode.AUTO) &&
          value.includes('be formal')
        );
      }),
      {}
    );
    restore();
  });
  it('passes base model params through to ChatSession when there are no startChatParams', async () => {
    const genModel = new GenerativeModel(fakeVertexAI, {
      model: 'my-model',
      generationConfig: {
        topK: 1
      }
    });
    const chatSession = genModel.startChat();
    expect(chatSession.params?.generationConfig).to.deep.equal({
      topK: 1
    });
    restore();
  });
  it('overrides base model params with startChatParams', () => {
    const genModel = new GenerativeModel(fakeVertexAI, {
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
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      tools: [
        { functionDeclarations: [{ name: 'myfunc', description: 'mydesc' }] }
      ],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.NONE } },
      systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] }
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
          value.includes(FunctionCallingMode.NONE) &&
          value.includes('be friendly')
        );
      }),
      {}
    );
    restore();
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
    const genModel = new GenerativeModel(fakeAI, {
      model: 'my-model',
      tools: [
        { functionDeclarations: [{ name: 'myfunc', description: 'mydesc' }] }
      ],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.NONE } },
      systemInstruction: { role: 'system', parts: [{ text: 'be friendly' }] }
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
          }
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.AUTO }
        },
        systemInstruction: { role: 'system', parts: [{ text: 'be formal' }] }
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
          value.includes(FunctionCallingMode.AUTO) &&
          value.includes('be formal')
        );
      }),
      {}
    );
    restore();
  });
  it('calls countTokens', async () => {
    const genModel = new GenerativeModel(fakeAI, { model: 'my-model' });
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
