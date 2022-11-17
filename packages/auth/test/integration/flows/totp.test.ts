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
import {Auth, createUserWithEmailAndPassword, multiFactor, signInWithEmailAndPassword, UserCredential, sendEmailVerification, applyActionCode, getMultiFactorResolver} from '@firebase/auth';
import { FirebaseError, getApp } from '@firebase/app';
import {
  cleanUpTestInstance,
  code,
  getTestInstance,
  getTotpCode,
  delay,
  randomEmail,
  verifyEmail,
  email
} from '../../helpers/integration/helpers';
import { MultiFactorAssertionImpl } from '../../../src/mfa/mfa_assertion';

import { MultiFactorSessionImpl } from '../../../src/mfa/mfa_session';
import { TotpMultiFactorGenerator, TotpSecret } from '../../../src/mfa/assertions/totp';
import * as MFA from '../../../src/api/account_management/mfa';
import { async } from '@firebase/util';
import { UserCredentialImpl } from '../../../src/core/user/user_credential_impl';
import { resolve } from 'dns';
import { UserCredentialInternal } from '../../../internal';
import { verify } from 'crypto';



use(chaiAsPromised);
use(sinonChai);

describe(' Integration tests: Mfa TOTP', () => {

    
    let auth: Auth;
    let idToken: string;
    let signUpCred: UserCredential;
    let totpSecret: TotpSecret;
    let assertion: MultiFactorAssertionImpl;
    let _request: MFA.StartTotpMfaEnrollmentRequest;
    let startMfaResponse: MFA.StartTotpMfaEnrollmentResponse;
    let displayName: string;
  beforeEach(async () => {
    auth = getTestInstance();
    displayName = 'totp-integration-test';
  });
 
  afterEach(async () => {
    await cleanUpTestInstance(auth, 'totp');
    
  });

  it('should not enroll if incorrect totp supplied', async () => {
    let session;
    console.log(email);
    console.log('session info for: ', getApp().options.projectId);
    console.log('auth current User:', auth.currentUser);  

    await expect(createUserWithEmailAndPassword(auth, email, 'password')).to.be.rejectedWith('auth/email-already-in-use');

    const cr = await signInWithEmailAndPassword(auth, email, 'password');

    console.log('signed In for totp');
    const mfaUser =  multiFactor(cr.user);

    console.log('session info for: ');
    session =  await mfaUser.getSession();
    console.log(JSON.stringify(session));
    
    
    totpSecret = await TotpMultiFactorGenerator.generateSecret(
      session
    );

    console.log("**** totpSecret****");
    console.log(totpSecret.secretKey);
    console.log(totpSecret.codeLength);
    console.log(totpSecret.codeIntervalSeconds);
    console.log(totpSecret.hashingAlgorithm);

    const totpVerificationCode =  getTotpCode(totpSecret.secretKey, totpSecret.codeIntervalSeconds, totpSecret.codeLength,  totpSecret.hashingAlgorithm);
    
    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
      totpSecret,
      totpVerificationCode + '0'
    );

    console.log(totpVerificationCode);
    await expect(mfaUser.enroll(multiFactorAssertion, displayName)).to.be.rejectedWith('auth/invalid-verification-code');
    await auth.signOut();
  })
    it('should enroll using correct otp', async () => {

      let session;
      console.log(email);
      console.log('session info for: ', getApp().options.projectId);
      console.log('auth current User:', auth.currentUser);  
      await expect(createUserWithEmailAndPassword(auth, email, 'password')).to.be.rejectedWith('auth/email-already-in-use');
      const cr = await signInWithEmailAndPassword(auth, email, 'password');

      console.log('signed In for totp');
      const mfaUser =  multiFactor(cr.user);
      
      console.log('session info for: ');


      session =  await mfaUser.getSession();

      
      console.log('session');
      console.log(JSON.stringify(session));
      
      
      totpSecret = await TotpMultiFactorGenerator.generateSecret(
        session
      );

      console.log("**** totpSecret****");

      console.log(totpSecret.secretKey);
      console.log(totpSecret.codeLength);
      console.log(totpSecret.codeIntervalSeconds);
      console.log(totpSecret.hashingAlgorithm);


     
   
      const totpVerificationCode = getTotpCode(totpSecret.secretKey, totpSecret.codeIntervalSeconds, totpSecret.codeLength,  totpSecret.hashingAlgorithm);

      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        totpVerificationCode
      );
      console.log(totpVerificationCode);
   
      await expect(mfaUser.enroll(multiFactorAssertion, displayName)).to.be.fulfilled;
              
      await auth.signOut();

    })

    it('should not allow sign-in with incorrect totp',  async () => {
      let session;
      let cr;
      let resolver;
      console.log(email);
      console.log('session info for: ', getApp().options.projectId);
      await expect(createUserWithEmailAndPassword(auth, email, 'password')).to.be.rejectedWith('auth/email-already-in-use');
      // Added a delay so that getTotpCode() actually generates a new totp code 
      await delay(30*1000);
      try{

        const userCredential = await signInWithEmailAndPassword(auth, email, 'password');

        console.log('success: ', userCredential);
        
        throw new Error('Signin should not have been successful');

      } catch(error ){

        
        console.log('error occured: ', (error as any).code);
        expect((error as any).code).to.eql('auth/multi-factor-auth-required');

        resolver = getMultiFactorResolver(auth,error as any);
        console.log(resolver.hints, totpSecret.secretKey);
        expect(resolver.hints).to.have.length(1);

        const totpVerificationCode = getTotpCode(totpSecret.secretKey, totpSecret.codeIntervalSeconds, totpSecret.codeLength,  totpSecret.hashingAlgorithm);
        console.log(totpVerificationCode, resolver.hints[0].uid )
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(
          resolver.hints[0].uid,
          totpVerificationCode + '0'
        );

        console.log(assertion);

        
        await expect(resolver.resolveSignIn(assertion)).to.be.rejectedWith('auth/invalid-verification-code');
        
        await auth.signOut();
     
    }
       
      
    }).timeout(31000);

    it('should allow sign-in with for correct totp and unenroll successfully', async() => {

      let resolver;
 
      console.log(email);
      console.log('session info for: ', getApp().options.projectId);
      
      await expect(createUserWithEmailAndPassword(auth, email, 'password')).to.be.rejectedWith('auth/email-already-in-use');
      // Added a delay so that getTotpCode() actually generates a new totp code
      await delay(30*1000);
      try{

        const userCredential = await signInWithEmailAndPassword(auth, email, 'password');

        console.log('success: ', userCredential);
        
        throw new Error('Signin should not have been successful');

      } catch(error ){

        
        console.log('error occured: ', (error as any).code);
        expect((error as any).code).to.eql('auth/multi-factor-auth-required');

        resolver = getMultiFactorResolver(auth,error as any);
        console.log(resolver.hints, totpSecret.secretKey);
        expect(resolver.hints).to.have.length(1);

        const totpVerificationCode = getTotpCode(totpSecret.secretKey, totpSecret.codeIntervalSeconds, totpSecret.codeLength,  totpSecret.hashingAlgorithm);
        console.log(totpVerificationCode, resolver.hints[0].uid )
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(
          resolver.hints[0].uid,
          totpVerificationCode 
        );

        console.log(assertion);

        
        const userCredential = await resolver.resolveSignIn(assertion);
        
        const mfaUser = multiFactor(userCredential.user);
        
        await expect(mfaUser.unenroll(resolver.hints[0].uid)).to.be.fulfilled;
     
        await auth.signOut();
     
    }
    }).timeout(35000);
})