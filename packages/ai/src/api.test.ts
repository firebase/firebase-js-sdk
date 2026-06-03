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
import {
  ImagenModelParams,
  ModelParams,
  AIErrorCode,
  InferenceMode
} from './types';
import { AIError } from './errors';
import {
  getAI,
  ImagenModel,
  LiveGenerativeModel,
  getGenerativeModel,
  getImagenModel,
  getLiveGenerativeModel,
  getTemplateGenerativeModel,
  TemplateGenerativeModel,
  getTemplateImagenModel,
  TemplateImagenModel
} from './api';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { stub, restore } from 'sinon';
import { AI } from './public-types';
import { GenerativeModel } from './models/generative-model';
import { GoogleAIBackend, VertexAIBackend } from './backend';
import { getFullApp } from '../test-utils/get-fake-firebase-services';
import { AI_TYPE } from './constants';
import { logger } from './logger';
import sinonChai from 'sinon-chai';
import * as appCheck from '@firebase/app-check';
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from '@firebase/app-check';
import { _getProvider, deleteApp, FirebaseApp } from '@firebase/app';
import { AIService } from './service';

use(sinonChai);
use(chaiAsPromised);

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

describe('Top level API', () => {
  describe('getAI()', () => {
    let app: FirebaseApp;
    beforeEach(() => {
      app = getFullApp();
    });
    afterEach(async () => {
      restore();
      await deleteApp(app);
    });
    it('works without options', () => {
      const ai = getAI(app);
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
    });
    it('works with options: no backend, limited use token', () => {
      const ai = getAI(app, { useLimitedUseAppCheckTokens: true });
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.true;
    });
    it('works with options: backend specified, limited use token', () => {
      const ai = getAI(app, {
        backend: new VertexAIBackend('us-central1'),
        useLimitedUseAppCheckTokens: true
      });
      expect(ai.backend).to.be.instanceOf(VertexAIBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.true;
    });
    it('works with options: appCheck option is falsy', () => {
      const ai = getAI(app, {
        backend: new VertexAIBackend('us-central1'),
        useLimitedUseAppCheckTokens: undefined
      });
      expect(ai.backend).to.be.instanceOf(VertexAIBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('works with options: backend specified only', () => {
      const ai = getAI(app, {
        backend: new VertexAIBackend('us-central1')
      });
      expect(ai.backend).to.be.instanceOf(VertexAIBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('if a default app check instance exists, do not initialize one', () => {
      const initStub = stub(appCheck, '_initializeAppCheckInternal');
      initializeAppCheck(app);
      const ai = getAI(app);
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
      expect(initStub).to.not.be.called;
    });
    it('if a custom app check instance exists, do not initialize one', async () => {
      const initStub = stub(appCheck, '_initializeAppCheckInternal');
      initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: () => Promise.resolve({ token: 'fsd', expireTimeMillis: 1 })
        })
      });
      const ai = getAI(app);
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
      expect(initStub).to.not.be.called;
    });
    it('if no app check instance exists, initializes one', () => {
      const initStub = stub(appCheck, '_initializeAppCheckInternal');
      const ai = getAI(app);
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
      expect(initStub).calledWith('AI Logic SDK');
    });
    it('does not initialize app check twice if called twice', () => {
      const initStub = stub(appCheck, '_initializeAppCheckInternal');
      getAI(app);
      getAI(app);
      expect(initStub).to.be.calledOnce;
    });
    it(
      'manually initializing App Check with custom options after autoinit' +
        ' will throw a useful error',
      () => {
        getAI(app);
        expect(() =>
          initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider('OTHER_SITE_KEY')
          })
        ).to.throw('initialized by AI Logic SDK');
      }
    );
    it(
      'manually initializing App Check with custom options first causes' +
        ' getAI() to use the already existing instance',
      () => {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider('OTHER_SITE_KEY')
        });
        const internalAppCheck = _getProvider(
          app,
          'app-check-internal'
        ).getImmediate();
        const ai = getAI(app);
        expect((ai as AIService).appCheck).to.equal(internalAppCheck);
      }
    );
  });
  it('getGenerativeModel throws if no model is provided', () => {
    try {
      getGenerativeModel(fakeAI, {} as ModelParams);
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_MODEL);
      expect((e as AIError).message).includes(
        `AI: Must provide a model name. Example: ` +
          `getGenerativeModel({ model: 'my-model-name' }) (${AI_TYPE}/${AIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getGenerativeModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getGenerativeModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_API_KEY);
      expect((e as AIError).message).equals(
        `AI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase AI requires this field to` +
          ` contain a valid API key. (${AI_TYPE}/${AIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getGenerativeModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_PROJECT_ID);
      expect((e as AIError).message).equals(
        `AI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid project ID. (${AI_TYPE}/${AIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getGenerativeModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-projectid' } }
    } as AI;
    try {
      getGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_APP_ID);
      expect((e as AIError).message).equals(
        `AI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid app ID. (${AI_TYPE}/${AIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getGenerativeModel gets a GenerativeModel', () => {
    const genModel = getGenerativeModel(fakeAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(GenerativeModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });
  it('getGenerativeModel warns in hybrid mode if top-level params are set', () => {
    const warnStub = stub(logger, 'warn');
    const genModel = getGenerativeModel(fakeAI, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      generationConfig: {}
    });
    expect(genModel).to.be.an.instanceOf(GenerativeModel);
    expect(warnStub).to.be.calledWithMatch(InferenceMode.PREFER_ON_DEVICE);
    expect(warnStub).to.be.calledWithMatch('generationConfig');
    warnStub.restore();
  });
  it('getImagenModel throws if no model is provided', () => {
    try {
      getImagenModel(fakeAI, {} as ImagenModelParams);
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_MODEL);
      expect((e as AIError).message).includes(
        `AI: Must provide a model name. Example: ` +
          `getImagenModel({ model: 'my-model-name' }) (${AI_TYPE}/${AIErrorCode.NO_MODEL})`
      );
    }
  });
  it('getImagenModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getImagenModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_API_KEY);
      expect((e as AIError).message).equals(
        `AI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase AI requires this field to` +
          ` contain a valid API key. (${AI_TYPE}/${AIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getImagenModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_PROJECT_ID);
      expect((e as AIError).message).equals(
        `AI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid project ID. (${AI_TYPE}/${AIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getImagenModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-project' } }
    } as AI;
    try {
      getImagenModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_APP_ID);
      expect((e as AIError).message).equals(
        `AI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid app ID. (${AI_TYPE}/${AIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getImagenModel gets an ImagenModel', () => {
    const genModel = getImagenModel(fakeAI, { model: 'my-model' });
    expect(genModel).to.be.an.instanceOf(ImagenModel);
    expect(genModel.model).to.equal('publishers/google/models/my-model');
  });

  it('getLiveGenerativeModel throws if no apiKey is provided', () => {
    const fakeVertexNoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getLiveGenerativeModel(fakeVertexNoApiKey, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_API_KEY);
      expect((e as AIError).message).equals(
        `AI: The "apiKey" field is empty in the local ` +
          `Firebase config. Firebase AI requires this field to` +
          ` contain a valid API key. (${AI_TYPE}/${AIErrorCode.NO_API_KEY})`
      );
    }
  });
  it('getLiveGenerativeModel throws if no projectId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getLiveGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_PROJECT_ID);
      expect((e as AIError).message).equals(
        `AI: The "projectId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid project ID. (${AI_TYPE}/${AIErrorCode.NO_PROJECT_ID})`
      );
    }
  });
  it('getLiveGenerativeModel throws if no appId is provided', () => {
    const fakeVertexNoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-project' } }
    } as AI;
    try {
      getLiveGenerativeModel(fakeVertexNoProject, { model: 'my-model' });
    } catch (e) {
      expect((e as AIError).code).includes(AIErrorCode.NO_APP_ID);
      expect((e as AIError).message).equals(
        `AI: The "appId" field is empty in the local` +
          ` Firebase config. Firebase AI requires this field ` +
          `to contain a valid app ID. (${AI_TYPE}/${AIErrorCode.NO_APP_ID})`
      );
    }
  });
  it('getLiveGenerativeModel gets a LiveGenerativeModel', () => {
    const liveGenerativeModel = getLiveGenerativeModel(fakeAI, {
      model: 'my-model'
    });
    expect(liveGenerativeModel).to.be.an.instanceOf(LiveGenerativeModel);
    expect(liveGenerativeModel.model).to.equal(
      'publishers/google/models/my-model'
    );
  });
  it('getTemplateGenerativeModel gets a TemplateGenerativeModel', () => {
    expect(getTemplateGenerativeModel(fakeAI)).to.be.an.instanceOf(
      TemplateGenerativeModel
    );
  });
  it('getImagenModel gets a TemplateImagenModel', () => {
    expect(getTemplateImagenModel(fakeAI)).to.be.an.instanceOf(
      TemplateImagenModel
    );
  });
});
