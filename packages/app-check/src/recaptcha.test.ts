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
import { expect } from 'chai';
import { stub, match } from 'sinon';
import { deleteApp, FirebaseApp } from '@firebase/app';
import {
  getFullApp,
  getFakeGreCAPTCHA,
  removegreCAPTCHAScriptsOnPage,
  findgreCAPTCHAScriptsOnPage,
  FAKE_SITE_KEY
} from '../test/util';
import {
  initializeV3,
  initializeEnterprise,
  getToken,
  GreCAPTCHATopLevel,
  RECAPTCHA_ENTERPRISE_URL,
  RECAPTCHA_URL
} from './recaptcha';
import * as utils from './util';
import {
  clearState,
  DEFAULT_STATE,
  getStateReference,
  setInitialState
} from './state';
import { Deferred } from '@firebase/util';
import { initializeAppCheck } from './api';
import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from './providers';

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
      expect(getStateReference(app).reCAPTCHAState).to.equal(undefined);
      await initializeV3(app, FAKE_SITE_KEY);
      expect(
        getStateReference(app).reCAPTCHAState?.initialized
      ).to.be.instanceof(Deferred);
    });

    it('loads reCAPTCHA script if it was not loaded already', async () => {
      const fakeRecaptcha = getFakeGreCAPTCHA();
      let count = 0;
      stub(utils, 'getRecaptcha').callsFake(() => {
        count++;
        if (count === 1) {
          return undefined;
        }

        return fakeRecaptcha;
      });

      expect(findgreCAPTCHAScriptsOnPage().length).to.equal(0);
      await initializeV3(app, FAKE_SITE_KEY);
      const greCATPCHAScripts = findgreCAPTCHAScriptsOnPage();
      expect(greCATPCHAScripts.length).to.equal(1);
      expect(greCATPCHAScripts[0].src).to.equal(RECAPTCHA_URL);
    });

    it('creates invisible widget', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA();
      const renderStub = stub(grecaptchaFake, 'render').callThrough();
      self.grecaptcha = grecaptchaFake as GreCAPTCHATopLevel;

      await initializeV3(app, FAKE_SITE_KEY);

      expect(renderStub).to.be.calledWith(`fire_app_check_${app.name}`, {
        sitekey: FAKE_SITE_KEY,
        size: 'invisible',
        callback: match.any,
        'error-callback': match.any
      });

      expect(getStateReference(app).reCAPTCHAState?.widgetId).to.equal(
        'fake_widget_1'
      );
    });
  });

  describe('initialize() - Enterprise', () => {
    it('sets reCAPTCHAState', async () => {
      self.grecaptcha = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      expect(getStateReference(app).reCAPTCHAState).to.equal(undefined);
      await initializeEnterprise(app, FAKE_SITE_KEY);
      expect(
        getStateReference(app).reCAPTCHAState?.initialized
      ).to.be.instanceof(Deferred);
    });

    it('loads reCAPTCHA script if it was not loaded already', async () => {
      const fakeRecaptcha = getFakeGreCAPTCHA();
      let count = 0;
      stub(utils, 'getRecaptcha').callsFake(() => {
        count++;
        if (count === 1) {
          return undefined;
        }

        return fakeRecaptcha;
      });

      expect(findgreCAPTCHAScriptsOnPage().length).to.equal(0);
      await initializeEnterprise(app, FAKE_SITE_KEY);
      const greCAPTCHAScripts = findgreCAPTCHAScriptsOnPage();
      expect(greCAPTCHAScripts.length).to.equal(1);
      expect(greCAPTCHAScripts[0].src).to.equal(RECAPTCHA_ENTERPRISE_URL);
    });

    it('creates invisible widget', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      const renderStub = stub(
        grecaptchaFake.enterprise,
        'render'
      ).callThrough();
      self.grecaptcha = grecaptchaFake;

      await initializeEnterprise(app, FAKE_SITE_KEY);

      expect(renderStub).to.be.calledWith(`fire_app_check_${app.name}`, {
        sitekey: FAKE_SITE_KEY,
        size: 'invisible',
        callback: match.any,
        'error-callback': match.any
      });

      expect(getStateReference(app).reCAPTCHAState?.widgetId).to.equal(
        'fake_widget_1'
      );
    });
  });

  describe('getToken() - V3', () => {
    it('throws if AppCheck has not been activated yet', () => {
      return expect(getToken(app)).to.eventually.rejectedWith(
        /appCheck\/use-before-activation/
      );
    });

    it('calls recaptcha.execute with correct widgetId', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA();
      const executeStub = stub(grecaptchaFake, 'execute').returns(
        Promise.resolve('fake-recaptcha-token')
      );
      self.grecaptcha = grecaptchaFake as GreCAPTCHATopLevel;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      await getToken(app);

      expect(executeStub).to.have.been.calledWith('fake_widget_1', {
        action: 'fire_app_check'
      });
    });

    it('resolves with token returned by recaptcha.execute', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA();
      stub(grecaptchaFake, 'execute').returns(
        Promise.resolve('fake-recaptcha-token')
      );
      self.grecaptcha = grecaptchaFake as GreCAPTCHATopLevel;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(FAKE_SITE_KEY)
      });
      const token = await getToken(app);

      expect(token).to.equal('fake-recaptcha-token');
    });
  });

  describe('getToken() - Enterprise', () => {
    it('calls recaptcha.execute with correct widgetId', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      const executeStub = stub(grecaptchaFake.enterprise, 'execute').returns(
        Promise.resolve('fake-recaptcha-token')
      );
      self.grecaptcha = grecaptchaFake;
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      await getToken(app);

      expect(executeStub).to.have.been.calledWith('fake_widget_1', {
        action: 'fire_app_check'
      });
    });

    it('resolves with token returned by recaptcha.execute', async () => {
      const grecaptchaFake = getFakeGreCAPTCHA() as GreCAPTCHATopLevel;
      stub(grecaptchaFake.enterprise, 'execute').returns(
        Promise.resolve('fake-recaptcha-token')
      );
      self.grecaptcha = grecaptchaFake;
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(FAKE_SITE_KEY)
      });
      const token = await getToken(app);

      expect(token).to.equal('fake-recaptcha-token');
    });
  });
});
