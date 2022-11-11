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

 import { expect, use } from 'chai';
 import chaiAsPromised from 'chai-as-promised';
 import * as sinon from 'sinon';
 import sinonChai from 'sinon-chai';
 
//import { mockTotp } from '../../helpers/integration/helpers';
import {Auth, createUserWithEmailAndPassword, multiFactor, signInAnonymously, signInWithEmailAndPassword, UserCredential} from '@firebase/auth';

import {
  cleanUpTestInstance,
  getTestInstance,
  mockTotp,
  randomEmail
} from '../../helpers/integration/helpers';
import { MultiFactorAssertionImpl } from '../../../src/mfa/mfa_assertion';

import { MultiFactorSessionImpl } from '../../../src/mfa/mfa_session';
import { TotpMultiFactorAssertionImpl, TotpMultiFactorGenerator, TotpSecret } from '../../../src/mfa/assertions/totp';
import * as MFA from '../../../src/api/account_management/mfa';
import { FirebaseError } from '@firebase/util';



use(chaiAsPromised);
use(sinonChai);

const TOTP_COMB_A = {

    response: { sharedSecretKey: 'secretKey3',
              verificationCodeLength: 30,
              hashingAlgorithm: 'sha1',
              periodSec:30,
              sessionInfo: 'testsSessionInfo',
              finalizeEnrollmentTime:  Date.now()
              },
    code: '...'
  };
  
  const TOTP_COMB_B = {

    response: { sharedSecretKey: 'secretKey2',
    verificationCodeLength: 30,
    hashingAlgorithm: 'sha1',
    periodSec: 30,
    sessionInfo: 'testsSessionInfo',
    finalizeEnrollmentTime:  Date.now()
    },
    code: '...'
  };

describe(' Integration tests: Mfa TOTP', () => {
    let auth: Auth;
    let idToken: string;
    let signUpCred: UserCredential;
    let email: string;
    let assertion: MultiFactorAssertionImpl;
    let _request: MFA.StartTotpMfaEnrollmentRequest;
    let startMfaResponse: MFA.StartTotpMfaEnrollmentResponse;
    let displayName: string;
  beforeEach(async () => {
    auth = getTestInstance();
    email =randomEmail();
    idToken = 'testIdToken';
    signUpCred = await createUserWithEmailAndPassword(
      auth,
      email,
      'password'
    );
    await auth.signOut();
  });
 
  afterEach(async () => {
    await cleanUpTestInstance(auth);

  });
    it('should verify using otp', async () => {

      console.log(email);
      const cr = await signInWithEmailAndPassword(auth, email, 'password');

      startMfaResponse = { totpSessionInfo: TOTP_COMB_A.response}
      

     
      const mfaUser =  multiFactor(cr.user);
      sinon.spy(MultiFactorSessionImpl, '_fromIdtoken');
 
      sinon.stub(mfaUser, 'getSession').returns(
       Promise.resolve(MultiFactorSessionImpl._fromIdtoken(idToken, auth as any)));
        
      sinon.stub(MFA, 'startEnrollTotpMfa').callsFake((_auth,_request)=>{

        return Promise.resolve(startMfaResponse)
      })
      
     

      const session =  await mfaUser.getSession();
       
      console.log(session);
      
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(
        session
      );

      console.log("**** totpSecret"+ totpSecret);
      // https://stackoverflow.com/questions/48931815/sinon-stub-not-replacing-function
      // https://stackoverflow.com/questions/61051247/chai-spies-expect-to-have-been-called-is-failing-on-local-methods
      expect(MultiFactorSessionImpl._fromIdtoken).to.have.been.calledOnce;
      //expect(TotpSecret._fromStartTotpMfaEnrollmentResponse).to.have.been.calledOnce;
      expect(MFA.startEnrollTotpMfa).to.have.been.calledOnce;

      expect(await MFA.startEnrollTotpMfa(auth as any, _request)).to.eql(startMfaResponse)
      
      expect(totpSecret.secretKey).to.eql(startMfaResponse.totpSessionInfo.sharedSecretKey)
      expect(totpSecret.codeLength).to.eql(startMfaResponse.totpSessionInfo.verificationCodeLength)

      const totpVerificationCode = await mockTotp(totpSecret.secretKey, totpSecret.codeLength, totpSecret.codeIntervalSeconds);

      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        totpVerificationCode
      );
      console.log(totpVerificationCode);
      // auth/invalid-idToken
      await expect(mfaUser.enroll(multiFactorAssertion, displayName)).to.be.rejectedWith('auth/invalid-user-token')
              

    })
})