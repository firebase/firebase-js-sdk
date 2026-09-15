/**
 * @license
 * Copyright 2020 Google LLC
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

import '../test/setup';
import { expect, vi } from 'vitest';
import { deleteApp, FirebaseApp } from '@firebase/app';
import {
  getFullApp,
  getFakeGreCAPTCHA,
  removegreCAPTCHAScriptsOnPage,
  findgreCAPTCHAScriptsOnPage,
  FAKE_SITE_KEY
} from '../test/util';
import { Deferred } from '@firebase/util';

const { mockGetRecaptcha } = vi.hoisted(() => ({
  mockGetRecaptcha: vi.fn()
}));

vi.mock('./util', async importOriginal => {
  const actual = await importOriginal<typeof import('./util')>();
  return {
    ...actual,
    getRecaptcha: (isEnterprise?: boolean) =>
      mockGetRecaptcha.getMockImplementation()
        ? mockGetRecaptcha(isEnterprise)
        : actual.getRecaptcha(isEnterprise)
  };
});

import {
  initializeV3,
  initializeEnterprise,
  getToken,
  GreCAPTCHATopLevel
} from './recaptcha';
import {
  clearState,
  DEFAULT_STATE,
  getStateReference,
  setInitialState
} from './state';
import { initializeAppCheck } from './api';
import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from './providers';

describe('recaptcha', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    mockGetRecaptcha.mockReset();
    app = getFullApp();
    setInitialState(app, { ...DEFAULT_STATE });
  });

  afterEach(() => {
    clearState();
    removegreCAPTCHAScriptsOnPage();
    return deleteApp(app);
  });

  describe('initialize() - V3', () => {
    it('sets reCAPTCHAState', async () => {
      self.grecaptcha = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      expect(getStateReference(app).reCAPTCHAState).toBe(undefined);
      await initializeV3(app, FAKE_SITE_KEY);
      expect(getStateReference(app).reCAPTCHAState?.initialized).toBeInstanceOf(
        Deferred
      );
    });

    it('loads reCAPTCHA script if it was not loaded already', async () => {
      const fakeRecaptcha = getFakeGreCAPTCHA();
      let count = 0;
      mockGetRecaptcha.mockImplementation(() => {
        count++;
        if (count === 1) {
          return undefined;
        }

        return fakeRecaptcha;
      });

      expect(findgreCAPTCHAScriptsOnPage().length).toBe(0);
      await initializeV3(app, FAKE_SITE_KEY);
      expect(findgreCAPTCHAScriptsOnPage().length).toBe(1);
    });

    it('creates invisible widget', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA();
      const renderStub = vi.spyOn(grecaptchaFake, 'render');
      self.grecaptcha = grecaptchaFake as GreCAPTCHATopLevel;

      await initializeV3(app, FAKE_SITE_KEY);

      expect(renderStub).toHaveBeenCalledWith(`fire_app_check_${app.name}`, {
        sitekey: FAKE_SITE_KEY,
        size: 'invisible',
        callback: expect.anything(),
        'error-callback': expect.anything()
      });

      expect(getStateReference(app).reCAPTCHAState?.widgetId).toBe(
        'fake_widget_1'
      );
    });
  });

  describe('initialize() - Enterprise', () => {
    it('sets reCAPTCHAState', async () => {
      self.grecaptcha = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      expect(getStateReference(app).reCAPTCHAState).toBe(undefined);
      await initializeEnterprise(app, FAKE_SITE_KEY);
      expect(getStateReference(app).reCAPTCHAState?.initialized).toBeInstanceOf(
        Deferred
      );
    });

    it('loads reCAPTCHA script if it was not loaded already', async () => {
      const fakeRecaptcha = getFakeGreCAPTCHA();
      let count = 0;
      mockGetRecaptcha.mockImplementation(() => {
        count++;
        if (count === 1) {
          return undefined;
        }

        return fakeRecaptcha;
      });

      expect(findgreCAPTCHAScriptsOnPage().length).toBe(0);
      await initializeEnterprise(app, FAKE_SITE_KEY);
      expect(findgreCAPTCHAScriptsOnPage().length).toBe(1);
    });

    it('creates invisible widget', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      const renderStub = vi.spyOn(grecaptchaFake.enterprise, 'render');
      self.grecaptcha = grecaptchaFake;

      await initializeEnterprise(app, FAKE_SITE_KEY);

      expect(renderStub).toHaveBeenCalledWith(`fire_app_check_${app.name}`, {
        sitekey: FAKE_SITE_KEY,
        size: 'invisible',
        callback: expect.anything(),
        'error-callback': expect.anything()
      });

      expect(getStateReference(app).reCAPTCHAState?.widgetId).toBe(
        'fake_widget_1'
      );
    });
  });

  describe('getToken() - V3', () => {
    it('throws if AppCheck has not been activated yet', async () => {
      await expect(getToken(app)).rejects.toThrow(
        /appCheck\/use-before-activation/
      );
    });

    it('calls recaptcha.execute with correct widgetId', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA();
      const executeStub = vi
        .spyOn(grecaptchaFake, 'execute')
        .mockResolvedValue('fake-recaptcha-token');
      self.grecaptcha = grecaptchaFake as GreCAPTCHATopLevel;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      await getToken(app);

      expect(executeStub).toHaveBeenCalledWith('fake_widget_1', {
        action: 'fire_app_check'
      });
    });

    it('resolves with token returned by recaptcha.execute', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA();
      vi.spyOn(grecaptchaFake, 'execute').mockResolvedValue(
        'fake-recaptcha-token'
      );
      self.grecaptcha = grecaptchaFake as GreCAPTCHATopLevel;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      const token = await getToken(app);

      expect(token).toBe('fake-recaptcha-token');
    });
  });

  describe('getToken() - Enterprise', () => {
    it('calls recaptcha.execute with correct widgetId', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      const executeStub = vi
        .spyOn(grecaptchaFake.enterprise, 'execute')
        .mockResolvedValue('fake-recaptcha-token');
      self.grecaptcha = grecaptchaFake;
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      await getToken(app);

      expect(executeStub).toHaveBeenCalledWith('fake_widget_1', {
        action: 'fire_app_check'
      });
    });

    it('resolves with token returned by recaptcha.execute', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      vi.spyOn(grecaptchaFake.enterprise, 'execute').mockResolvedValue(
        'fake-recaptcha-token'
      );
      self.grecaptcha = grecaptchaFake;
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      const token = await getToken(app);

      expect(token).toBe('fake-recaptcha-token');
    });
  });
});
