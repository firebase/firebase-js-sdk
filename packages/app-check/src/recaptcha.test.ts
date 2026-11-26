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

import type { MockInstance } from 'vitest';
import { deleteApp, FirebaseApp } from '@firebase/app';
import {
  getFullApp,
  getFakeGreCAPTCHA,
  removegreCAPTCHAScriptsOnPage,
  findgreCAPTCHAScriptsOnPage,
  FAKE_SITE_KEY
} from '../test/util';
import { Deferred } from '@firebase/util';
import * as utils from './util';
import {
  initializeV3,
  initializeEnterprise,
  getToken,
  GreCAPTCHARenderOption,
  GreCAPTCHATopLevel,
  RECAPTCHA_URL,
  RECAPTCHA_ENTERPRISE_URL
} from './recaptcha';
import {
  clearState,
  DEFAULT_STATE,
  getStateReference,
  setInitialState
} from './state';
import { initializeAppCheck } from './api';
import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from './providers';

vi.mock('./util', { spy: true });

describe('recaptcha', () => {
  let app: FirebaseApp;

  beforeEach(() => {
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
      vi.spyOn(utils, 'getRecaptcha').mockImplementation(() => {
        count++;
        if (count === 1) {
          return undefined;
        }
        return fakeRecaptcha;
      });

      const srcSetter = vi.spyOn(HTMLScriptElement.prototype, 'src', 'set');

      expect(findgreCAPTCHAScriptsOnPage().length).toBe(0);
      await initializeV3(app, FAKE_SITE_KEY);
      const scripts = findgreCAPTCHAScriptsOnPage();
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe(RECAPTCHA_URL);
      if (typeof window.TrustedScriptURL !== 'undefined') {
        expect(srcSetter).toHaveBeenCalledWith(
          expect.any(window.TrustedScriptURL)
        );
      }
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
      vi.spyOn(utils, 'getRecaptcha').mockImplementation(() => {
        count++;
        if (count === 1) {
          return undefined;
        }

        return fakeRecaptcha;
      });

      const srcSetter = vi.spyOn(HTMLScriptElement.prototype, 'src', 'set');

      expect(findgreCAPTCHAScriptsOnPage().length).toBe(0);
      await initializeEnterprise(app, FAKE_SITE_KEY);
      const scripts = findgreCAPTCHAScriptsOnPage();
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe(
        `${RECAPTCHA_ENTERPRISE_URL}?render=explicit`
      );
      if (typeof window.TrustedScriptURL !== 'undefined') {
        expect(srcSetter).toHaveBeenCalledWith(
          expect.any(window.TrustedScriptURL)
        );
      }
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

  describe('getToken() - attempts given up on and stale callbacks', () => {
    // A grecaptcha whose execute() calls are settled by the test and whose
    // ready() callbacks can be held back, to stand in for a script that
    // loads late.
    function getControlledGreCAPTCHA(holdReady: boolean): {
      fake: GreCAPTCHATopLevel;
      executions: Array<Deferred<string>>;
      executeSpy: MockInstance;
      pendingReady: Array<() => void>;
      setHoldReady: (hold: boolean) => void;
      getRenderParams: () => GreCAPTCHARenderOption;
    } {
      const fake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      const pendingReady: Array<() => void> = [];
      let hold = holdReady;
      fake.ready = callback => {
        if (hold) {
          pendingReady.push(callback);
        } else {
          callback();
        }
      };
      let renderParams: GreCAPTCHARenderOption | undefined;
      vi.spyOn(fake, 'render').mockImplementation((_container, params) => {
        renderParams = params;
        return 'fake_widget_1';
      });
      const executions: Array<Deferred<string>> = [];
      const executeSpy = vi.spyOn(fake, 'execute').mockImplementation(() => {
        const execution = new Deferred<string>();
        executions.push(execution);
        return execution.promise;
      });
      return {
        fake,
        executions,
        executeSpy,
        pendingReady,
        setHoldReady: value => {
          hold = value;
          if (!hold) {
            pendingReady.splice(0).forEach(callback => callback());
          }
        },
        getRenderParams: () => renderParams!
      };
    }

    async function until(condition: () => boolean): Promise<void> {
      for (let i = 0; i < 100 && !condition(); i++) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      expect(condition()).toBe(true);
    }

    it('does not call execute for attempts given up on before the script initialised', async () => {
      const { fake, executeSpy, setHoldReady } = getControlledGreCAPTCHA(true);
      const readySpy = vi.spyOn(fake, 'ready');
      self.grecaptcha = fake;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      const controllers = [
        new AbortController(),
        new AbortController(),
        new AbortController()
      ];
      const attempts = controllers.map(controller =>
        getToken(app, controller.signal)
      );
      controllers.forEach(controller => controller.abort());

      // The script finally loads.
      setHoldReady(false);
      const results = await Promise.allSettled(attempts);

      for (const result of results) {
        expect(result.status).toBe('rejected');
        expect((result as PromiseRejectedResult).reason.code).toBe(
          'appCheck/exchange-timeout'
        );
      }
      expect(executeSpy).not.toHaveBeenCalled();
      // Only the initialisation call: the abort check after the `initialized`
      // await stops the three attempts from calling ready().
      expect(readySpy).toHaveBeenCalledTimes(1);
    });

    it('does not call execute if the signal is aborted before ready fires', async () => {
      const { fake, executeSpy, pendingReady, setHoldReady } =
        getControlledGreCAPTCHA(false);
      self.grecaptcha = fake;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      await getStateReference(app).reCAPTCHAState!.initialized.promise;
      setHoldReady(true);
      const controller = new AbortController();

      const attempt = getToken(app, controller.signal);
      await until(() => pendingReady.length === 1);
      controller.abort();
      setHoldReady(false);

      await expect(attempt).rejects.toMatchObject({
        code: 'appCheck/exchange-timeout'
      });
      expect(executeSpy).not.toHaveBeenCalled();
    });

    // B's execution starts while A's is still running. B fails, A's stale
    // success callback lands, and the provider must still reject B's
    // attestation without calling the exchange endpoint or throttling.
    async function runStaleSuccessScenario(
      settleB: (resolveB: () => void, fireCallbacks: () => void) => void
    ): Promise<void> {
      const { fake, executions, getRenderParams } =
        getControlledGreCAPTCHA(false);
      self.grecaptcha = fake;
      const provider = new ReCaptchaV3Provider(FAKE_SITE_KEY);
      initializeAppCheck(app, { provider });
      const exchangeBody = { token: 'app-check-token-c', ttl: '3600s' };
      const fetchSpy = vi
        .spyOn(window, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify(exchangeBody), { status: 200 })
        );

      const first = provider.getToken();
      await until(() => executions.length === 1);
      const second = provider.getToken();
      await until(() => executions.length === 2);
      settleB(
        () => executions[1].resolve('attestation-b'),
        () => {
          getRenderParams()['error-callback']();
          getRenderParams().callback();
        }
      );

      await expect(second).rejects.toMatchObject({
        code: 'appCheck/recaptcha-error'
      });
      executions[0].resolve('attestation-a');
      await first.catch(() => {});
      expect(fetchSpy).not.toHaveBeenCalled();

      // Not throttled: the next attempt reaches the exchange endpoint.
      const third = provider.getToken();
      await until(() => executions.length === 3);
      getRenderParams().callback();
      executions[2].resolve('attestation-c');
      expect((await third).token).toBe('app-check-token-c');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    }

    it('rejects the attestation when B errors, A succeeds late, then B resolves', async () => {
      await runStaleSuccessScenario((resolveB, fireCallbacks) => {
        fireCallbacks();
        resolveB();
      });
    });

    it('rejects the attestation when the callbacks land right after B resolves, before the provider checks', async () => {
      await runStaleSuccessScenario((resolveB, fireCallbacks) => {
        resolveB();
        // Queued without awaiting in between, so it runs before the
        // provider's continuation after the attestation.
        queueMicrotask(fireCallbacks);
      });
    });
  });
});
