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
import { restore, stub } from 'sinon';
import { AI, Content } from '../public-types';
import { VertexAIBackend } from '../backend';
import { TemplateGenerativeModel } from './template-generative-model';
import * as generateContentMethods from '../methods/generate-content';
import { TemplateChatSession } from '../methods/template-chat-session';

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

const TEMPLATE_ID = 'my-template';
const TEMPLATE_VARS = { a: 1, b: '2' };

describe('TemplateGenerativeModel', () => {
  afterEach(() => {
    restore();
  });

  describe('constructor', () => {
    it('should initialize _apiSettings correctly', () => {
      const model = new TemplateGenerativeModel(fakeAI);
      expect(model._apiSettings.apiKey).to.equal('key');
      expect(model._apiSettings.project).to.equal('my-project');
      expect(model._apiSettings.appId).to.equal('my-appid');
    });
  });

  describe('generateContent', () => {
    it('should call templateGenerateContent with correct parameters', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 5000 });

      await model.generateContent(TEMPLATE_ID, TEMPLATE_VARS);

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS },
        { timeout: 5000 }
      );
    });
  });

  describe('generateContentStream', () => {
    it('should call templateGenerateContentStream with correct parameters', async () => {
      const templateGenerateContentStreamStub = stub(
        generateContentMethods,
        'templateGenerateContentStream'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 5000 });

      await model.generateContentStream(TEMPLATE_ID, TEMPLATE_VARS);

      expect(templateGenerateContentStreamStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS },
        { timeout: 5000 }
      );
    });
  });

  describe('startChat', () => {
    it('should return a TemplateChatSession instance', () => {
      const model = new TemplateGenerativeModel(fakeAI);
      const chat = model.startChat(TEMPLATE_ID);
      expect(chat).to.be.an.instanceOf(TemplateChatSession);
      expect(chat.templateId).to.equal(TEMPLATE_ID);
    });

    it('should pass history and requestOptions to TemplateChatSession', () => {
      const history: Content[] = [{ role: 'user', parts: [{ text: 'hi' }] }];
      const requestOptions = { timeout: 1000 };
      const model = new TemplateGenerativeModel(fakeAI, requestOptions);
      const chat = model.startChat(TEMPLATE_ID, history);

      expect(chat.requestOptions).to.deep.equal(requestOptions);
      // Private property, but we can check it for test purposes
      expect((chat as any)._history).to.deep.equal(history);
    });
  });
});
