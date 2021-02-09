/**
 * @license
 * Copyright 2021 Google LLC
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

import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { expect, use } from 'chai';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fbUtils from '@firebase/util';
import {
  _checkCordovaConfiguration,
  _generateHandlerUrl,
  _performRedirect
} from './utils';
import { AuthEvent, AuthEventType } from '../../model/popup_redirect';
import { GoogleAuthProvider } from '../../core/providers/google';
import { AuthProvider } from '../../../internal';
import { _generateNewEvent } from './events';

const ANDROID_UA = 'UserAgent/5.0 (Linux; Android 0.0.0)';
const IOS_UA = 'UserAgent/5.0 (iPhone; CPU iPhone 0.0.0)';
const IOS_8_UA = 'UserAgent/5.0 (iPhone OS 8_2)';
const DESKTOP_UA = 'UserAgent/5.0 (Linux; Ubuntu 0.0.0)';

use(chaiAsPromised);
use(sinonChai);

describe('platform_cordova/popup_redirect/utils', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    attachExpectedPlugins();
  });

  afterEach(() => {
    sinon.restore();
    // Clean up the window object from attachExpectedPlugins()
    removeProp(window, 'cordova');
    removeProp(window, 'BuildInfo');
    removeProp(window, 'universalLinks');
  });

  function setUA(ua: string): void {
    sinon.stub(fbUtils, 'getUA').returns(ua);
  }

  describe('_checkCordovaConfiguration', () => {
    // TODO: Rest of the tests go here
    it('does not reject if all plugins installed', () => {
      expect(() => _checkCordovaConfiguration(auth)).not.to.throw;
    });

    it('rejects if universal links is missing', () => {
      removeProp(window, 'universalLinks');
      expect(() => _checkCordovaConfiguration(auth))
        .to.throw(fbUtils.FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-universal-links-plugin-fix'
        });
    });

    it('rejects if build info is missing', () => {
      removeProp(window.BuildInfo, 'packageName');
      expect(() => _checkCordovaConfiguration(auth))
        .to.throw(fbUtils.FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-plugin-buildInfo'
        });
    });

    it('rejects if browsertab openUrl is missing', () => {
      removeProp(window.cordova.plugins.browsertab, 'openUrl');
      expect(() => _checkCordovaConfiguration(auth))
        .to.throw(fbUtils.FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-plugin-browsertab'
        });
    });

    it('rejects if InAppBrowser is missing', () => {
      removeProp(window.cordova.InAppBrowser, 'open');
      expect(() => _checkCordovaConfiguration(auth))
        .to.throw(fbUtils.FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-plugin-inappbrowser'
        });
    });
  });

  describe('_generateHandlerUrl', () => {
    let event: AuthEvent;
    let provider: AuthProvider;

    beforeEach(() => {
      event = _generateNewEvent(auth, AuthEventType.REAUTH_VIA_REDIRECT);
      provider = new GoogleAuthProvider();
    });

    function getParams(url: string): URLSearchParams {
      return new URL(url).searchParams;
    }

    it('hashes the sessionId and does not pass it through', async () => {
      setUA(ANDROID_UA);
      const hashedSessionId = getParams(
        await _generateHandlerUrl(auth, event, provider)
      ).get('sessionId');
      expect(hashedSessionId).not.to.eq(event.sessionId);
      // SHA-256 hash as a hex string is 64 chars
      expect(hashedSessionId).to.have.length(64);
    });

    it('sets the ibi and not apn for iOS devices', async () => {
      setUA(IOS_UA);
      const params = getParams(
        await _generateHandlerUrl(auth, event, provider)
      );
      expect(params.get('ibi')).to.eq('com.example.name.package');
      expect(params.has('apn')).to.be.false;
    });

    it('sets the apn and not ibi for Android devices', async () => {
      setUA(ANDROID_UA);
      const params = getParams(
        await _generateHandlerUrl(auth, event, provider)
      );
      expect(params.get('apn')).to.eq('com.example.name.package');
      expect(params.has('ibi')).to.be.false;
    });

    it('throws an error for any other user agent', async () => {
      setUA(DESKTOP_UA);
      await expect(
        _generateHandlerUrl(auth, event, provider)
      ).to.be.rejectedWith(
        fbUtils.FirebaseError,
        'auth/operation-not-supported-in-this-environment'
      );
    });

    it('does not attach a display name if none is present', async () => {
      setUA(ANDROID_UA);
      const params = getParams(
        await _generateHandlerUrl(auth, event, provider)
      );
      expect(params.has('appDisplayName')).to.be.false;
    });

    it('attaches the relevant display name', async () => {
      setUA(IOS_UA);
      (BuildInfo as { displayName: string }).displayName = 'This is my app';
      const params = getParams(
        await _generateHandlerUrl(auth, event, provider)
      );
      expect(params.get('appDisplayName')).to.eq('This is my app');
    });
  });

  describe('_performRedirect', () => {
    let isBrowsertabAvailable: boolean;
    beforeEach(() => {
      isBrowsertabAvailable = false;
      sinon
        .stub(cordova.plugins.browsertab, 'isAvailable')
        .callsFake(cb => cb(isBrowsertabAvailable));
      sinon.stub(cordova.plugins.browsertab, 'openUrl');
      sinon.stub(cordova.InAppBrowser, 'open');
    });

    it('uses browserTab if that is available', async () => {
      isBrowsertabAvailable = true;
      await _performRedirect('https://localhost/__/auth/handler');
      expect(cordova.plugins.browsertab.openUrl).to.have.been.calledWith(
        'https://localhost/__/auth/handler'
      );
      expect(cordova.InAppBrowser.open).not.to.have.been.called;
    });

    it('falls back to InAppBrowser if need be', async () => {
      isBrowsertabAvailable = false;
      setUA(ANDROID_UA);
      await _performRedirect('https://localhost/__/auth/handler');
      expect(cordova.plugins.browsertab.openUrl).not.to.have.been.called;
      expect(cordova.InAppBrowser.open).to.have.been.calledWith(
        'https://localhost/__/auth/handler',
        '_system',
        'location=yes'
      );
    });

    it('uses _blank for iOS 8', async () => {
      isBrowsertabAvailable = false;
      setUA(IOS_8_UA);
      await _performRedirect('https://localhost/__/auth/handler');
      expect(cordova.plugins.browsertab.openUrl).not.to.have.been.called;
      expect(cordova.InAppBrowser.open).to.have.been.calledWith(
        'https://localhost/__/auth/handler',
        '_blank',
        'location=yes'
      );
    });
  });
});

function attachExpectedPlugins(): void {
  // Eventually these will be replaced with full mocks
  const win = (window as unknown) as Record<string, unknown>;
  win.cordova = {
    plugins: {
      browsertab: {
        isAvailable: () => {},
        openUrl: () => {}
      }
    },
    InAppBrowser: {
      open: () => {}
    }
  };
  win.universalLinks = {
    subscribe: () => {}
  };
  win.BuildInfo = {
    packageName: 'com.example.name.package'
  };
}

function removeProp(obj: unknown, prop: string): void {
  delete (obj as Record<string, unknown>)[prop];
}
