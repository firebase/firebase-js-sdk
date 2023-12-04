/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  Endpoint,
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaActionName
} from '../../api';
import { mockEndpointWithParams } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../../api/errors';
import { AuthInternal } from '../../model/auth';

import { MockGreCAPTCHATopLevel } from './recaptcha_mock';
import {
  RecaptchaEnterpriseVerifier,
  FAKE_TOKEN,
  handleRecaptchaFlow
} from './recaptcha_enterprise_verifier';
import { RecaptchaConfig } from './recaptcha';
import { AuthErrorCode } from '../../core/errors';
import { _createError } from '../../core/util/assert';

use(chaiAsPromised);
use(sinonChai);

describe('platform_browser/recaptcha/recaptcha_enterprise_verifier', () => {
  let auth: TestAuth;
  let verifier: RecaptchaEnterpriseVerifier;

  const recaptchaConfigResponseEnforce = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: 'EMAIL_PASSWORD_PROVIDER',
        enforcementState: 'ENFORCE'
      }
    ]
  };
  const recaptchaConfigEnforce = new RecaptchaConfig(
    recaptchaConfigResponseEnforce
  );
  const recaptchaConfigResponseOff = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: 'EMAIL_PASSWORD_PROVIDER',
        enforcementState: 'OFF'
      }
    ]
  };
  const recaptchaConfigOff = new RecaptchaConfig(recaptchaConfigResponseOff);

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    verifier = new RecaptchaEnterpriseVerifier(auth);
  });

  afterEach(() => {
    mockFetch.tearDown();
    sinon.restore();
  });

  context('#verify', () => {
    const request = {
      clientType: RecaptchaClientType.WEB,
      version: RecaptchaVersion.ENTERPRISE
    };

    let recaptcha: MockGreCAPTCHATopLevel;
    beforeEach(() => {
      recaptcha = new MockGreCAPTCHATopLevel();
      window.grecaptcha = recaptcha;
    });

    it('returns if response is available', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        request,
        recaptchaConfigResponseEnforce
      );
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('recaptcha-response'));
      expect(await verifier.verify()).to.eq('recaptcha-response');
    });

    it('reject if error is thrown when retrieve site key', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        request,
        {
          error: {
            code: 400,
            message: ServerError.MISSING_CLIENT_TYPE
          }
        },
        400
      );
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('recaptcha-response'));
      await expect(verifier.verify()).to.be.rejectedWith(
        Error,
        'auth/missing-client-type'
      );
    });

    it('return fake recaptcha token if error is thrown when retrieve recaptcha token', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        request,
        recaptchaConfigResponseEnforce
      );
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.reject(Error('retrieve-recaptcha-token-error')));
      expect(await verifier.verify()).to.eq(FAKE_TOKEN);
    });
  });

  context('handleRecaptchaFlow', () => {
    let mockAuthInstance: AuthInternal;
    let mockRequest: any;
    let mockActionMethod: sinon.SinonStub;

    beforeEach(async () => {
      mockAuthInstance = await testAuth();
      mockRequest = {};
      mockActionMethod = sinon.stub();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should call actionMethod with request if emailPasswordEnabled is true', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      sinon
        .stub(mockAuthInstance, '_getRecaptchaConfig')
        .returns(recaptchaConfigEnforce);
      sinon
        .stub(RecaptchaEnterpriseVerifier.prototype, 'verify')
        .resolves('recaptcha-response');
      mockRequest = { foo: 'bar' };
      mockActionMethod = sinon.stub().resolves('testResponse');
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        mockActionMethod
      );
      expect(mockActionMethod).to.have.been.calledOnce;
      expect(response).to.equal('testResponse');
    });

    // "Errors like "MISSING_RECAPTCHA_TOKEN" will be handled irrespective of the enablement status of "emailPasswordEnabled", but this test verifies the more likely scenario where emailPasswordEnabled is false"
    it('should handle MISSING_RECAPTCHA_TOKEN error when emailPasswordEnabled is false', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      sinon
        .stub(mockAuthInstance, '_getRecaptchaConfig')
        .returns(recaptchaConfigOff);
      sinon
        .stub(RecaptchaEnterpriseVerifier.prototype, 'verify')
        .resolves('recaptcha-response');
      mockRequest = { foo: 'bar' };
      let callCount = 0;
      mockActionMethod = sinon.stub().callsFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.MISSING_RECAPTCHA_TOKEN)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        mockActionMethod
      );
      expect(mockActionMethod).to.have.been.calledTwice;
      expect(response).to.equal('testResponse');
    });

    it('should handle non MISSING_RECAPTCHA_TOKEN error when emailPasswordEnabled is false', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      sinon
        .stub(mockAuthInstance, '_getRecaptchaConfig')
        .returns(recaptchaConfigOff);
      sinon
        .stub(RecaptchaEnterpriseVerifier.prototype, 'verify')
        .resolves('recaptcha-response');
      mockRequest = { foo: 'bar' };
      let callCount = 0;
      mockActionMethod = sinon.stub().callsFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.RECAPTCHA_NOT_ENABLED)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });

      const response = handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        mockActionMethod
      );
      await expect(response).to.be.rejectedWith(
        AuthErrorCode.RECAPTCHA_NOT_ENABLED
      );
      expect(mockActionMethod).to.have.been.calledOnce;
    });
  });
});
