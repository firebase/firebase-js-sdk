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
import { match, restore, stub, useFakeTimers } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import * as generateContentMethods from './generate-content';
import { Content, GenerateContentStreamResult } from '../types';
import { ChatSession } from './chat-session';
import { ApiSettings } from '../types/internal';
import { VertexAIBackend } from '../backend';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new VertexAIBackend()
};

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
      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      await expect(chatSession.sendMessage('hello')).to.be.rejected;
      expect(generateContentStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any
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
      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      await expect(chatSession.sendMessageStream('hello')).to.be.rejected;
      expect(generateContentStreamStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
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
      const chatSession = new ChatSession(fakeApiSettings, 'a-model');
      await chatSession.sendMessageStream('hello');
      expect(generateContentStreamStub).to.be.calledWith(
        fakeApiSettings,
        'a-model',
        match.any
      );
      await clock.runAllAsync();
      expect(consoleStub.args[0][1].toString()).to.include(
        // Firefox has different wording when a property is undefined
        'undefined'
      );
      clock.restore();
    });
  });
});
