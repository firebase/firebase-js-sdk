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
import { expect, use } from 'chai';
import { testAuth, TestAuth } from '../../test/helpers/mock_auth';
import { SingletonInstantiator } from '../core/util/instantiator';
import { AuthEventType, PopupRedirectResolver } from '../model/popup_redirect';
import { cordovaPopupRedirectResolver } from './popup_redirect';
import { GoogleAuthProvider } from '../core/providers/google';
import { FirebaseError } from '@firebase/util';

use(chaiAsPromised);
use(sinonChai);

describe('platform_cordova/popup_redirect', () => {
  let auth: TestAuth;
  let resolver: PopupRedirectResolver;

  beforeEach(async () => {
    auth = await testAuth();
    attachExpectedPlugins();
    resolver = new (cordovaPopupRedirectResolver as SingletonInstantiator<PopupRedirectResolver>)();
  });

  describe('_openRedirect plugin checks', () => {
    // TODO: Rest of the tests go here
    it('does not reject if all plugins installed', () => {
      expect(() =>
        resolver._openRedirect(
          auth,
          new GoogleAuthProvider(),
          AuthEventType.SIGN_IN_VIA_REDIRECT
        )
      ).not.to.throw;
    });

    it('rejects if universal links is missing', () => {
      removeProp(window, 'universalLinks');
      expect(() =>
        resolver._openRedirect(
          auth,
          new GoogleAuthProvider(),
          AuthEventType.SIGN_IN_VIA_REDIRECT
        )
      )
        .to.throw(FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-universal-links-plugin-fix'
        });
    });

    it('rejects if build info is missing', () => {
      removeProp(window.BuildInfo, 'packageName');
      expect(() =>
        resolver._openRedirect(
          auth,
          new GoogleAuthProvider(),
          AuthEventType.SIGN_IN_VIA_REDIRECT
        )
      )
        .to.throw(FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-plugin-buildInfo'
        });
    });

    it('rejects if browsertab openUrl is missing', () => {
      removeProp(window.cordova.plugins.browsertab, 'openUrl');
      expect(() =>
        resolver._openRedirect(
          auth,
          new GoogleAuthProvider(),
          AuthEventType.SIGN_IN_VIA_REDIRECT
        )
      )
        .to.throw(FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-plugin-browsertab'
        });
    });

    it('rejects if InAppBrowser is missing', () => {
      removeProp(window.cordova.InAppBrowser, 'open');
      expect(() =>
        resolver._openRedirect(
          auth,
          new GoogleAuthProvider(),
          AuthEventType.SIGN_IN_VIA_REDIRECT
        )
      )
        .to.throw(FirebaseError, 'auth/invalid-cordova-configuration')
        .that.has.deep.property('customData', {
          appName: 'test-app',
          missingPlugin: 'cordova-plugin-inappbrowser'
        });
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
