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
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { restore, stub } from 'sinon';
import { VertexAIBackend } from '../backend';
import * as generateContentMethods from './generate-content';
import { TemplateChatSession } from './template-chat-session';
import { ApiSettings } from '../types/internal';
import { GenerateContentResult, Part, Role } from '../types';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new VertexAIBackend()
};

const TEMPLATE_ID = 'my-chat-template';

const FAKE_MODEL_RESPONSE_1 = {
  response: {
    candidates: [
      {
        index: 0,
        content: {
          role: 'model' as Role,
          parts: [{ text: 'Response 1' }]
        }
      }
    ]
  }
};

const FAKE_MODEL_RESPONSE_2 = {
  response: {
    candidates: [
      {
        index: 0,
        content: {
          role: 'model' as Role,
          parts: [{ text: 'Response 2' }]
        }
      }
    ]
  }
};

describe('TemplateChatSession', () => {
  let templateGenerateContentStub: sinon.SinonStub;
  let templateGenerateContentStreamStub: sinon.SinonStub;

  beforeEach(() => {
    templateGenerateContentStub = stub(
      generateContentMethods,
      'templateGenerateContent'
    );
    templateGenerateContentStreamStub = stub(
      generateContentMethods,
      'templateGenerateContentStream'
    );
  });

  afterEach(() => {
    restore();
  });

  describe('history and state management', () => {
    it('should update history correctly after a single successful call', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage('Request 1');
      const history = await chat.getHistory();
      expect(history).to.have.lengthOf(2);
      expect(history[0].role).to.equal('user');
      expect(history[0].parts[0].text).to.equal('Request 1');
      expect(history[1].role).to.equal('model');
      expect(history[1].parts[0].text).to.equal('Response 1');
    });

    it('should maintain history over multiple turns', async () => {
      templateGenerateContentStub
        .onFirstCall()
        .resolves(FAKE_MODEL_RESPONSE_1 as GenerateContentResult);
      templateGenerateContentStub
        .onSecondCall()
        .resolves(FAKE_MODEL_RESPONSE_2 as GenerateContentResult);

      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage('Request 1');
      await chat.sendMessage('Request 2');

      const history = await chat.getHistory();
      expect(history).to.have.lengthOf(4);
      expect(history[0].parts[0].text).to.equal('Request 1');
      expect(history[1].parts[0].text).to.equal('Response 1');
      expect(history[2].parts[0].text).to.equal('Request 2');
      expect(history[3].parts[0].text).to.equal('Response 2');
    });

    it('should handle sequential calls to sendMessage and sendMessageStream', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      templateGenerateContentStreamStub.resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(FAKE_MODEL_RESPONSE_2.response)
      });

      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage('Request 1');
      await chat.sendMessageStream('Request 2');

      const history = await chat.getHistory();
      expect(history).to.have.lengthOf(4);
      expect(history[2].parts[0].text).to.equal('Request 2');
      expect(history[3].parts[0].text).to.equal('Response 2');
    });

    it('should be able to be initialized with a history', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_2 as GenerateContentResult
      );
      const initialHistory = [
        { role: 'user' as Role, parts: [{ text: 'Request 1' }] },
        FAKE_MODEL_RESPONSE_1.response.candidates[0].content
      ];
      const chat = new TemplateChatSession(
        fakeApiSettings,
        TEMPLATE_ID,
        initialHistory
      );
      await chat.sendMessage('Request 2');
      const history = await chat.getHistory();
      expect(history).to.have.lengthOf(4);
      expect(history[0].parts[0].text).to.equal('Request 1');
      expect(history[1].parts[0].text).to.equal('Response 1');
      expect(history[2].parts[0].text).to.equal('Request 2');
      expect(history[3].parts[0].text).to.equal('Response 2');
    });
  });

  describe('error handling', () => {
    it('templateGenerateContent errors should be catchable', async () => {
      templateGenerateContentStub.rejects('failed');
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await expect(chat.sendMessage('Request 1')).to.be.rejected;
    });

    it('templateGenerateContentStream errors should be catchable', async () => {
      templateGenerateContentStreamStub.rejects('failed');
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await expect(chat.sendMessageStream('Request 1')).to.be.rejected;
    });

    it('getHistory should fail if templateGenerateContent fails', async () => {
      templateGenerateContentStub.rejects('failed');
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await expect(chat.sendMessage('Request 1')).to.be.rejected;
      await expect(chat.getHistory()).to.be.rejected;
    });

    it('getHistory should fail if templateGenerateContentStream fails', async () => {
      templateGenerateContentStreamStub.rejects('failed');
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await expect(chat.sendMessageStream('Request 1')).to.be.rejected;
    });

    it('should not update history if response has no candidates', async () => {
      templateGenerateContentStub.resolves({
        response: {}
      } as GenerateContentResult);
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage('Request 1');
      const history = await chat.getHistory();
      expect(history).to.be.empty;
    });
  });

  describe('input variations for sendMessage', () => {
    it('should handle request as a single string', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage('Just a string');
      const history = await chat.getHistory();
      expect(history[0].parts[0].text).to.equal('Just a string');
    });

    it('should handle request as an array of strings', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage(['string 1', 'string 2']);
      const history = await chat.getHistory();
      expect(history[0].parts).to.deep.equal([
        { text: 'string 1' },
        { text: 'string 2' }
      ]);
    });

    it('should handle request as an array of Part objects', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      const parts: Part[] = [{ text: 'part 1' }, { text: 'part 2' }];
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessage(parts);
      const history = await chat.getHistory();
      expect(history[0].parts).to.deep.equal(parts);
    });

    it('should pass inputs to templateGenerateContent', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      const inputs = { someVar: 'someValue' };
      await chat.sendMessage('A request', inputs);
      expect(templateGenerateContentStub).to.have.been.calledWith(
        fakeApiSettings,
        TEMPLATE_ID,
        {
          inputs: { ...inputs },
          history: []
        },
        undefined
      );
    });

    it('should pass requestOptions to templateGenerateContent', async () => {
      templateGenerateContentStub.resolves(
        FAKE_MODEL_RESPONSE_1 as GenerateContentResult
      );
      const requestOptions = { timeout: 5000 };
      const chat = new TemplateChatSession(
        fakeApiSettings,
        TEMPLATE_ID,
        [],
        requestOptions
      );
      await chat.sendMessage('A request');
      expect(templateGenerateContentStub).to.have.been.calledWith(
        fakeApiSettings,
        TEMPLATE_ID,
        {
          inputs: {},
          history: []
        },
        requestOptions
      );
    });
  });

  describe('input variations for sendMessageStream', () => {
    it('should handle request as a single string', async () => {
      templateGenerateContentStreamStub.resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(FAKE_MODEL_RESPONSE_1.response)
      });
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessageStream('Just a string');
      const history = await chat.getHistory();
      expect(history[0].parts[0].text).to.equal('Just a string');
    });

    it('should handle request as an array of strings', async () => {
      templateGenerateContentStreamStub.resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(FAKE_MODEL_RESPONSE_1.response)
      });
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessageStream(['string 1', 'string 2']);
      const history = await chat.getHistory();
      expect(history[0].parts).to.deep.equal([
        { text: 'string 1' },
        { text: 'string 2' }
      ]);
    });

    it('should handle request as an array of Part objects', async () => {
      templateGenerateContentStreamStub.resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(FAKE_MODEL_RESPONSE_1.response)
      });
      const parts: Part[] = [{ text: 'part 1' }, { text: 'part 2' }];
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      await chat.sendMessageStream(parts);
      const history = await chat.getHistory();
      expect(history[0].parts).to.deep.equal(parts);
    });

    it('should pass inputs to templateGenerateContentStream', async () => {
      templateGenerateContentStreamStub.resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(FAKE_MODEL_RESPONSE_1.response)
      });
      const chat = new TemplateChatSession(fakeApiSettings, TEMPLATE_ID);
      const inputs = { someVar: 'someValue' };
      await chat.sendMessageStream('A request', inputs);
      expect(templateGenerateContentStreamStub).to.have.been.calledWith(
        fakeApiSettings,
        TEMPLATE_ID,
        {
          inputs: { ...inputs },
          history: []
        }
      );
    });

    it('should pass requestOptions to templateGenerateContentStream', async () => {
      templateGenerateContentStreamStub.resolves({
        stream: (async function* () {})(),
        response: Promise.resolve(FAKE_MODEL_RESPONSE_1.response)
      });
      const requestOptions = { timeout: 5000 };
      const chat = new TemplateChatSession(
        fakeApiSettings,
        TEMPLATE_ID,
        [],
        requestOptions
      );
      await chat.sendMessageStream('A request');
      expect(templateGenerateContentStreamStub).to.have.been.calledWith(
        fakeApiSettings,
        TEMPLATE_ID,
        {
          inputs: {},
          history: []
        },
        requestOptions
      );
    });
  });
});
