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
import { ModelParams, AIErrorCode, InferenceMode } from './types';
import { AIError } from './errors';
import {
  getAI,
  LiveGenerativeModel,
  getGenerativeModel,
  getLiveGenerativeModel,
  getTemplateGenerativeModel,
  TemplateGenerativeModel
} from './api';
import { AI } from './public-types';
import { GenerativeModel } from './models/generative-model';
import { GoogleAIBackend, AgentPlatformBackend } from './backend';
import { fakeAI, getFullApp } from '../test-utils/get-fake-firebase-services';
import { AI_TYPE } from './constants';
import { logger } from './logger';
import {
  FirebaseApp,
  deleteApp,
  _addOrOverwriteComponent
} from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';

describe('Top level API', () => {
  describe('getAI()', () => {
    let app: FirebaseApp;
    beforeEach(() => {
      app = getFullApp({ apiKey: 'my-key', appId: 'my-appid' });
    });
    afterEach(async () => {
      await deleteApp(app);
    });
    it('works without options', () => {
      const ai = getAI(app);
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('works with options: no backend, limited use token', () => {
      const ai = getAI(app, { useLimitedUseAppCheckTokens: true });
      expect(ai.backend).to.be.instanceOf(GoogleAIBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.true;
    });
    it('works with options: backend specified, limited use token', () => {
      const ai = getAI(app, {
        backend: new AgentPlatformBackend('global'),
        useLimitedUseAppCheckTokens: true
      });
      expect(ai.backend).to.be.instanceOf(AgentPlatformBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.true;
    });
    it('works with options: appCheck option is falsy', () => {
      const ai = getAI(app, {
        backend: new AgentPlatformBackend('global'),
        useLimitedUseAppCheckTokens: undefined
      });
      expect(ai.backend).to.be.instanceOf(AgentPlatformBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('works with options: backend specified only', () => {
      const ai = getAI(app, {
        backend: new AgentPlatformBackend('global')
      });
      expect(ai.backend).to.be.instanceOf(AgentPlatformBackend);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('creates a separate instance per backend', () => {
      const googleAI = getAI(app, { useLimitedUseAppCheckTokens: true });
      const agentPlatform = getAI(app, {
        backend: new AgentPlatformBackend('global')
      });
      expect(agentPlatform).to.not.equal(googleAI);
      expect(googleAI.options?.useLimitedUseAppCheckTokens).to.be.true;
      expect(agentPlatform.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('returns the existing instance, keeping its options, when called again without useLimitedUseAppCheckTokens', () => {
      const ai = getAI(app, { useLimitedUseAppCheckTokens: true });
      const aiAgain = getAI(app);
      const aiAgainWithBackend = getAI(app, { backend: new GoogleAIBackend() });
      expect(aiAgain).to.equal(ai);
      expect(aiAgainWithBackend).to.equal(ai);
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.true;
    });
    it('returns the existing instance when called again with the same useLimitedUseAppCheckTokens value', () => {
      const ai = getAI(app, { useLimitedUseAppCheckTokens: true });
      expect(getAI(app, { useLimitedUseAppCheckTokens: true })).to.equal(ai);
      const aiDefault = getAI(app, {
        backend: new AgentPlatformBackend('global')
      });
      expect(
        getAI(app, {
          backend: new AgentPlatformBackend('global'),
          useLimitedUseAppCheckTokens: false
        })
      ).to.equal(aiDefault);
    });
    it('throws ALREADY_INITIALIZED when called again with a different useLimitedUseAppCheckTokens value', () => {
      const ai = getAI(app, { useLimitedUseAppCheckTokens: true });
      try {
        getAI(app, { useLimitedUseAppCheckTokens: false });
        expect.fail('getAI() should have thrown');
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.ALREADY_INITIALIZED);
        expect((e as AIError).message).to.include(
          'useLimitedUseAppCheckTokens: true'
        );
      }
      // The existing instance must be left untouched.
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.true;
    });
    it('throws ALREADY_INITIALIZED when opting in to limited use tokens after the instance was created without them', () => {
      const ai = getAI(app);
      try {
        getAI(app, { useLimitedUseAppCheckTokens: true });
        expect.fail('getAI() should have thrown');
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.ALREADY_INITIALIZED);
      }
      expect(ai.options?.useLimitedUseAppCheckTokens).to.be.false;
    });
    it('keeps using limited use tokens for models created after a later getAI() call', async () => {
      const getToken = vi.fn().mockResolvedValue({ token: 'standard-token' });
      const getLimitedUseToken = vi
        .fn()
        .mockResolvedValue({ token: 'limited-use-token' });
      _addOrOverwriteComponent(
        app,
        // `_addOrOverwriteComponent` expects a `Component<Name>` (same workaround as `getFullApp`).
        //@ts-ignore
        new Component(
          'app-check-internal',
          () =>
            ({
              getToken,
              getLimitedUseToken,
              addTokenListener: () => {},
              removeTokenListener: () => {}
            }) as FirebaseAppCheckInternal,
          ComponentType.PUBLIC
        )
      );

      const ai = getAI(app, { useLimitedUseAppCheckTokens: true });
      // e.g. a different module that only needs the default instance.
      getAI(app);
      const model = getGenerativeModel(ai, { model: 'my-model' });

      const result = await model._apiSettings.getAppCheckToken!();
      expect(result.token).to.equal('limited-use-token');
      expect(getLimitedUseToken).toHaveBeenCalledOnce();
      expect(getToken).not.toHaveBeenCalled();
    });
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
    const fakeAINoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getGenerativeModel(fakeAINoApiKey, { model: 'my-model' });
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
    const fakeAINoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getGenerativeModel(fakeAINoProject, { model: 'my-model' });
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
    const fakeAINoAppId = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-projectid' } }
    } as AI;
    try {
      getGenerativeModel(fakeAINoAppId, { model: 'my-model' });
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
    const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const genModel = getGenerativeModel(fakeAI, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      generationConfig: {}
    });
    expect(genModel).to.be.an.instanceOf(GenerativeModel);
    expect(warnStub).toHaveBeenCalledWith(
      expect.stringContaining(InferenceMode.PREFER_ON_DEVICE)
    );
    expect(warnStub).toHaveBeenCalledWith(
      expect.stringContaining('generationConfig')
    );
    warnStub.mockRestore();
  });

  it('getLiveGenerativeModel throws if no apiKey is provided', () => {
    const fakeAINoApiKey = {
      ...fakeAI,
      app: { options: { projectId: 'my-project', appId: 'my-appid' } }
    } as AI;
    try {
      getLiveGenerativeModel(fakeAINoApiKey, { model: 'my-model' });
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
    const fakeAINoProject = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', appId: 'my-appid' } }
    } as AI;
    try {
      getLiveGenerativeModel(fakeAINoProject, { model: 'my-model' });
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
    const fakeAINoAppId = {
      ...fakeAI,
      app: { options: { apiKey: 'my-key', projectId: 'my-project' } }
    } as AI;
    try {
      getLiveGenerativeModel(fakeAINoAppId, { model: 'my-model' });
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
});
