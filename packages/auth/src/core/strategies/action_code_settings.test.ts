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

import { FirebaseError } from '@firebase/util';
import { expect } from 'chai';

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { GetOobCodeRequest } from '../../api/authentication/email_and_password';
import { _setActionCodeSettingsOnRequest } from './action_code_settings';

describe('core/strategies/action_code_settings', () => {
  let auth: TestAuth;
  const request: GetOobCodeRequest = {};

  const TEST_BUNDLE_ID = 'my-bundle';
  const TEST_FDL_DOMAIN = 'fdl-domain';
  const TEST_URL = 'my-url';

  beforeEach(async () => {
    auth = await testAuth();
  });

  it('should require a non empty continue URL', () => {
    expect(() =>
      _setActionCodeSettingsOnRequest(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: TEST_BUNDLE_ID
        },
        url: '',
        dynamicLinkDomain: TEST_FDL_DOMAIN
      })
    ).to.throw(FirebaseError, '(auth/invalid-continue-uri)');
  });

  it('should allow undefined dynamic link URL', () => {
    expect(() =>
      _setActionCodeSettingsOnRequest(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: TEST_BUNDLE_ID
        },
        url: TEST_URL
      })
    ).to.not.throw();
  });

  it('should require a non empty dynamic link URL', () => {
    expect(() =>
      _setActionCodeSettingsOnRequest(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: TEST_BUNDLE_ID
        },
        url: TEST_URL,
        dynamicLinkDomain: ''
      })
    ).to.throw(FirebaseError, '(auth/invalid-dynamic-link-domain)');
  });

  it('should require a non empty Hosting link URL', () => {
    expect(() =>
      _setActionCodeSettingsOnRequest(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: TEST_BUNDLE_ID
        },
        url: TEST_URL,
        linkDomain: ''
      })
    ).to.throw(FirebaseError, '(auth/invalid-hosting-link-domain)');
  });

  it('should require a non-empty bundle ID', () => {
    expect(() =>
      _setActionCodeSettingsOnRequest(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: ''
        },
        url: TEST_URL,
        dynamicLinkDomain: TEST_FDL_DOMAIN
      })
    ).to.throw(FirebaseError, '(auth/missing-ios-bundle-id)');
  });

  it('should require a non-empty package name', () => {
    expect(() =>
      _setActionCodeSettingsOnRequest(auth, request, {
        handleCodeInApp: true,
        android: {
          packageName: ''
        },
        url: TEST_URL,
        dynamicLinkDomain: TEST_FDL_DOMAIN
      })
    ).to.throw(FirebaseError, '(auth/missing-android-pkg-name)');
  });
});
