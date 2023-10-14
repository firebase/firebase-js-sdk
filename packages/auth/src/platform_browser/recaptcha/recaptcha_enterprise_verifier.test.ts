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

use(chaiAsPromised);
use(sinonChai);

describe('platform_browser/recaptcha/recaptcha_enterprise_verifier', () => {
  let auth: TestAuth;
  let verifier: RecaptchaEnterpriseVerifier;

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
    const recaptchaConfigResponseEnforce = {
      recaptchaKey: 'foo/bar/to/site-key',
      recaptchaEnforcementState: [
        {
          provider: 'EMAIL_PASSWORD_PROVIDER',
          enforcementState: 'ENFORCE'
        }
      ]
    };

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

    it('should handle recaptcha when emailPasswordEnabled is true', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      sinon.stub(mockAuthInstance, '_getRecaptchaConfig').returns({
        emailPasswordEnabled: true,
        siteKey: 'mock_site_key'
      });
      mockActionMethod.resolves('success');
      mockEndpointWithParams(Endpoint.SEND_OOB_CODE, mockRequest, {
        email: 'test@foo.com'
      });

      const result = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.GET_OOB_CODE,
        mockActionMethod
      );

      expect(result).to.equal('success');
      expect(mockActionMethod).to.have.been.calledOnce;
    });

    // it('should handle action without recaptcha when emailPasswordEnabled is false and no error', async () => {
    //   if (typeof window === 'undefined') {
    //     return;
    //   }
    //   sinon.stub(mockAuthInstance, '_getRecaptchaConfig').returns({
    //     emailPasswordEnabled: false,
    //     siteKey: 'mock_site_key'
    //   });
    //   mockActionMethod.resolves('success');

    //   const result = await handleRecaptchaFlow(
    //     mockAuthInstance,
    //     mockRequest,
    //     RecaptchaActionName.GET_OOB_CODE,
    //     mockActionMethod
    //   );

    //   expect(result).to.equal('success');
    //   expect(mockActionMethod).to.have.been.calledOnce;
    // });

    // it('should handle MISSING_RECAPTCHA_TOKEN error when emailPasswordEnabled is false', async () => {
    //   if (typeof window === 'undefined') {
    //     return;
    //   }
    //   sinon.stub(mockAuthInstance, '_getRecaptchaConfig').returns({
    //     emailPasswordEnabled: false,
    //     siteKey: 'mock_site_key'
    //   });
    //   mockActionMethod.onFirstCall().rejects({
    //     code: 'auth/MISSING_RECAPTCHA_TOKEN'
    //   });
    //   mockActionMethod.onSecondCall().resolves('success-after-recaptcha');

    //   const result = await handleRecaptchaFlow(
    //     mockAuthInstance,
    //     mockRequest,
    //     RecaptchaActionName.GET_OOB_CODE,
    //     mockActionMethod
    //   );

    //   expect(result).to.equal('success-after-recaptcha');
    //   expect(mockActionMethod).to.have.been.calledTwice;
    // });
  });
});
