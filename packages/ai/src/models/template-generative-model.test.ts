/**
 * @license
 * Copyright 2025 Google LLC
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
import {
  AI,
  TemplateToolConfig,
  RetrievalConfig,
  LatLng
} from '../public-types';
import { VertexAIBackend } from '../backend';
import { TemplateGenerativeModel } from './template-generative-model';
import * as generateContentMethods from '../methods/generate-content';

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
    it('should call templateGenerateContent with correct parameters no options', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI);

      await model.generateContent(TEMPLATE_ID, TEMPLATE_VARS);

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined }
      );
    });

    it('should call templateGenerateContent with correct parameters w/ request options', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI);

      await model.generateContent(TEMPLATE_ID, TEMPLATE_VARS);

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined }
      );
    });

    it('should call templateGenerateContent with correct parameters w/ tool config', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI);
      const latLng: LatLng = {
        latitude: 50.0,
        longitude: 50.0
      };
      const retrievalConfig: RetrievalConfig = { latLng };
      const templateToolConfig: TemplateToolConfig = { retrievalConfig };

      await model.generateContent(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        undefined,
        templateToolConfig
      );

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: templateToolConfig }
      );
    });

    it('should call templateGenerateContent with correct parameters w/ both optional params', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI);
      const latLng: LatLng = {
        latitude: 50.0,
        longitude: 50.0
      };
      const retrievalConfig: RetrievalConfig = { latLng };
      const templateToolConfig: TemplateToolConfig = { retrievalConfig };

      await model.generateContent(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        { timeout: 5000 },
        templateToolConfig
      );

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: templateToolConfig },
        { timeout: 5000 }
      );
    });

    it('singleRequestOptions overrides requestOptions', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 1000 });
      const singleRequestOptions = { timeout: 2000 };

      await model.generateContent(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        singleRequestOptions
      );

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined },
        { timeout: 2000 }
      );
    });

    it('singleRequestOptions is merged with requestOptions', async () => {
      const templateGenerateContentStub = stub(
        generateContentMethods,
        'templateGenerateContent'
      ).resolves({} as any);
      const abortController = new AbortController();
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 1000 });
      const singleRequestOptions = { signal: abortController.signal };

      await model.generateContent(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        singleRequestOptions
      );

      expect(templateGenerateContentStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined },
        { timeout: 1000, signal: abortController.signal }
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
        { inputs: TEMPLATE_VARS, toolConfig: undefined },
        { timeout: 5000 }
      );
    });

    it('should call templateGenerateContentStream with correct parameters w/ request options', async () => {
      const templateGenerateContentStreamStub = stub(
        generateContentMethods,
        'templateGenerateContentStream'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI);
      await model.generateContentStream(TEMPLATE_ID, TEMPLATE_VARS, {
        timeout: 5000
      });

      expect(templateGenerateContentStreamStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined },
        { timeout: 5000 }
      );
    });

    it('should call templateGenerateContentStream with correct parameters w/ tool config', async () => {
      const templateGenerateContentStreamStub = stub(
        generateContentMethods,
        'templateGenerateContentStream'
      ).resolves({} as any);
      const latLng: LatLng = {
        latitude: 50.0,
        longitude: 50.0
      };
      const retrievalConfig: RetrievalConfig = { latLng };
      const templateToolConfig: TemplateToolConfig = { retrievalConfig };
      const model = new TemplateGenerativeModel(fakeAI);
      await model.generateContentStream(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        undefined,
        templateToolConfig
      );

      expect(templateGenerateContentStreamStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: templateToolConfig }
      );
    });

    it('should call templateGenerateContent with correct parameters w/ both optional params', async () => {
      const templateGenerateContentStreamStub = stub(
        generateContentMethods,
        'templateGenerateContentStream'
      ).resolves({} as any);
      const latLng: LatLng = {
        latitude: 50.0,
        longitude: 50.0
      };
      const retrievalConfig: RetrievalConfig = { latLng };
      const templateToolConfig: TemplateToolConfig = { retrievalConfig };
      const model = new TemplateGenerativeModel(fakeAI);
      await model.generateContentStream(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        { timeout: 5000 },
        templateToolConfig
      );

      expect(templateGenerateContentStreamStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: templateToolConfig },
        { timeout: 5000 }
      );
    });

    it('singleRequestOptions overrides requestOptions', async () => {
      const templateGenerateContentStreamStub = stub(
        generateContentMethods,
        'templateGenerateContentStream'
      ).resolves({} as any);
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 1000 });
      const singleRequestOptions = { timeout: 2000 };

      await model.generateContentStream(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        singleRequestOptions
      );

      expect(templateGenerateContentStreamStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined },
        { timeout: 2000 }
      );
    });

    it('singleRequestOptions is merged with requestOptions', async () => {
      const templateGenerateContentStreamStub = stub(
        generateContentMethods,
        'templateGenerateContentStream'
      ).resolves({} as any);
      const abortController = new AbortController();
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 1000 });
      const singleRequestOptions = { signal: abortController.signal };

      await model.generateContentStream(
        TEMPLATE_ID,
        TEMPLATE_VARS,
        singleRequestOptions
      );

      expect(templateGenerateContentStreamStub).to.have.been.calledOnceWith(
        model._apiSettings,
        TEMPLATE_ID,
        { inputs: TEMPLATE_VARS, toolConfig: undefined },
        { timeout: 1000, signal: abortController.signal }
      );
    });
  });

  describe('startChat', () => {
    it('returns a TemplateChatSession initialized with params and requestOptions', () => {
      const model = new TemplateGenerativeModel(fakeAI, { timeout: 1000 });
      const chat = model.startChat({
        templateId: TEMPLATE_ID,
        templateVariables: TEMPLATE_VARS,
        tools: [
          {
            functionDeclarations: [{ name: 'testFunction' }] // Testing that tools are passed along
          }
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: 'ANY'
          }
        }
      });

      expect(chat.params.templateId).to.equal(TEMPLATE_ID);
      expect(chat.params.templateVariables).to.deep.equal(TEMPLATE_VARS);
      expect(chat.params.tools?.length).to.equal(1);
      expect(chat.params.toolConfig?.functionCallingConfig?.mode).to.equal(
        'ANY'
      );
      expect(chat.requestOptions?.timeout).to.equal(1000);
    });
  });
});
