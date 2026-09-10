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
import { expect, vi } from 'vitest';
import { AI, AIErrorCode } from '../public-types';
import { AIError } from '../errors';
import { AgentPlatformBackend } from '../backend';
import { AIService } from '../service';
import { initApiSettings } from './utils';
import { fakeAI } from '../../test-utils/get-fake-firebase-services';

describe('initApiSettings', () => {
  it('calls regular app check token when option is set', async () => {
    const getTokenStub = vi.fn().mockResolvedValue(undefined);
    const getLimitedUseTokenStub = vi.fn().mockResolvedValue(undefined);
    const apiSettings = initApiSettings(
      //@ts-ignore
      {
        ...fakeAI,
        options: { useLimitedUseAppCheckTokens: false },
        appCheck: {
          getToken: getTokenStub,
          getLimitedUseToken: getLimitedUseTokenStub
        }
      } as AIService
    );
    if (apiSettings?.getAppCheckToken) {
      await apiSettings.getAppCheckToken();
    }
    expect(getTokenStub).toHaveBeenCalled();
    expect(getLimitedUseTokenStub).not.toHaveBeenCalled();
    getTokenStub.mockReset();
    getLimitedUseTokenStub.mockReset();
  });
  it('calls limited use token when option is set', async () => {
    const getTokenStub = vi.fn().mockResolvedValue(undefined);
    const getLimitedUseTokenStub = vi.fn().mockResolvedValue(undefined);
    const apiSettings = initApiSettings(
      //@ts-ignore
      {
        ...fakeAI,
        options: { useLimitedUseAppCheckTokens: true },
        appCheck: {
          getToken: getTokenStub,
          getLimitedUseToken: getLimitedUseTokenStub
        }
      } as AIService
    );
    if (apiSettings?.getAppCheckToken) {
      await apiSettings.getAppCheckToken();
    }
    expect(getTokenStub).not.toHaveBeenCalled();
    expect(getLimitedUseTokenStub).toHaveBeenCalled();
    getTokenStub.mockReset();
    getLimitedUseTokenStub.mockReset();
  });
  it('throws if not passed an api key', () => {
    const fakeAI: AI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          projectId: 'my-project'
        }
      },
      backend: new AgentPlatformBackend('global'),
      location: 'global'
    };
    try {
      initApiSettings(fakeAI);
    } catch (e) {
      expect((e as AIError).code).to.equal(AIErrorCode.NO_API_KEY);
    }
  });
  it('throws if not passed a project ID', () => {
    const fakeAI: AI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key'
        }
      },
      backend: new AgentPlatformBackend('global'),
      location: 'global'
    };
    try {
      initApiSettings(fakeAI);
    } catch (e) {
      expect((e as AIError).code).to.equal(AIErrorCode.NO_PROJECT_ID);
    }
  });
  it('throws if not passed an app ID', () => {
    const fakeAI: AI = {
      app: {
        name: 'DEFAULT',
        automaticDataCollectionEnabled: true,
        options: {
          apiKey: 'key',
          projectId: 'my-project'
        }
      },
      backend: new AgentPlatformBackend('global'),
      location: 'global'
    };
    try {
      initApiSettings(fakeAI);
    } catch (e) {
      expect((e as AIError).code).to.equal(AIErrorCode.NO_APP_ID);
    }
  });
});
