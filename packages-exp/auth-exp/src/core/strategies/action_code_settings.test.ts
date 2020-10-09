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
import { ActionCodeSettings } from '@firebase/auth-types-exp';

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { GetOobCodeRequest } from '../../api/authentication/email_and_password';
import { setActionCodeSettingsOnRequest_ } from './action_code_settings';

describe('core/strategies/action_code_settings', () => {
  let auth: TestAuth;
  const request: GetOobCodeRequest = {
  };

  beforeEach(async () => {
    auth = await testAuth();
  });


  it('should require a continue URL', () => {
    expect(() =>
      setActionCodeSettingsOnRequest_(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
        },
        dynamicLinkDomain: 'fdl-domain'
      } as unknown as ActionCodeSettings)
    ).to.throw(
      FirebaseError,
      '(auth/missing-continue-uri)'
    );
  });

  it('should require a non empty continue URL', () => {
    expect(() =>
      setActionCodeSettingsOnRequest_(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
        },
        url: '',
        dynamicLinkDomain: 'fdl-domain'
      })
    ).to.throw(
      FirebaseError,
      '(auth/invalid-continue-uri)'
    );
  });

  it('should allow undefined dynamic link URL', () => {
    expect(() =>
      setActionCodeSettingsOnRequest_(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-´bundle'
        },
        url: 'my-url'
      })
    ).to.not.throw();
  });

  it('should require a non empty dynamic link URL', () => {
    expect(() =>
      setActionCodeSettingsOnRequest_(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-´bundle'
        },
        url: 'my-url',
        dynamicLinkDomain: ''
      })
    ).to.throw(
      FirebaseError,
      '(auth/invalid-dynamic-link-domain)'
    );
  });

  it('should require a non-empty bundle ID', () => {
    expect(() =>
      setActionCodeSettingsOnRequest_(auth, request, {
        handleCodeInApp: true,
        iOS: {
          bundleId: ''
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      })
    ).to.throw(
      FirebaseError,
      '(auth/missing-ios-bundle-id)'
    );
  });

  it('should require a non-empty package name', () => {
    expect(() =>
      setActionCodeSettingsOnRequest_(auth, request, {
        handleCodeInApp: true,
        android: {
          packageName: ''
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      })
    ).to.throw(
      FirebaseError,
      '(auth/missing-android-pkg-name)'
    );
  });
});