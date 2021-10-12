import firebase from '@firebase/app-compat';
import { AuthError, ConfirmationResult, MultiFactorError, MultiFactorResolver, RecaptchaVerifier, User } from '@firebase/auth-types';
import { assert, expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
  createNewTenant,
  initializeTestInstance,
  cleanUpTestInstance,
  randomEmail,
  randomPhone,
  getOobCodes,
  OobCodeSession,
  getPhoneVerificationCodes
} from '../../helpers/helpers';

use(chaiAsPromised);

describe('Integration test: multi-factor', () => {
  let email: string;
  let phone: string;
  let fakeRecaptchaContainer: HTMLElement;
  let verifier: RecaptchaVerifier;

  beforeEach(() => {
    initializeTestInstance();
    email = randomEmail();
    phone = randomPhone();
    fakeRecaptchaContainer = document.createElement('div');
    document.body.appendChild(fakeRecaptchaContainer);
    verifier = new firebase.auth.RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any,
    );
  });

  /** If in the emulator, search for the code in the API */
  async function phoneCode(
    crOrId: ConfirmationResult | string,
    tenantId?: string
  ): Promise<string> {
    const codes = await getPhoneVerificationCodes(tenantId);
    const vid = typeof crOrId === 'string' ? crOrId : crOrId.verificationId;
    return codes[vid].code;
  }

  afterEach(async () => {
    await cleanUpTestInstance();
    document.body.removeChild(fakeRecaptchaContainer);
  });

  function resetVerifier(): void {
    verifier.clear();
    verifier = new firebase.auth.RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any,
    );
  }

  async function enroll(user: User, phoneNumber: string, displayName: string): Promise<void> {
    const mfaUser = user.multiFactor;
    const mfaSession = await mfaUser.getSession();

    // Send verification code.
    const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
    const phoneInfoOptions = {
      phoneNumber,
      session: mfaSession
    };
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, verifier);
    const phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId, user.tenantId || undefined));
    const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
    await mfaUser.enroll(multiFactorAssertion, displayName);
  }

  context('with email/password', () => {
    const password = 'password';
    let user: User;

    beforeEach(async () => {
      user = (await firebase.auth().createUserWithEmailAndPassword(email, password)).user!;
    });

    async function oobCode(toEmail: string, tenant?: string): Promise<OobCodeSession> {
      const codes = await getOobCodes(tenant);
      return codes.reverse().find(({ email }) => email === toEmail)!;
    }

    async function verify() {
      await user.sendEmailVerification();
      // Apply the email verification code
      await firebase.auth().applyActionCode((await oobCode(email, user.tenantId || undefined)).oobCode);
      await user.reload();
    }

    it('allows enrollment, sign in, and unenrollment', async () => {
      await verify();
      
      await enroll(user, phone, 'Display name');

      // Log out and try logging in
      await firebase.auth().signOut();
      let resolver!: MultiFactorResolver;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = (e as MultiFactorError).resolver;
        } else {
          throw e;
        }
      }

      // Check the resolver hints and reverify
      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq('signIn');
      expect(userCredential.user).to.eq(firebase.auth().currentUser);

      // Now unenroll and try again
      const mfaUser = firebase.auth().currentUser!.multiFactor;
      await mfaUser.unenroll(resolver.hints[0].uid);

      // Sign in should happen without MFA
      user = (await firebase.auth().signInWithEmailAndPassword(email, password)).user!;
      expect(user).to.eq(firebase.auth().currentUser);
    });

    it('multiple factors can be enrolled', async () => {
      await verify();

      const secondaryPhone = randomPhone();
      
      await enroll(user, phone, 'Main phone');
      resetVerifier();
      await enroll(user, secondaryPhone, 'Backup phone');

      // Log out and try logging in
      await firebase.auth().signOut();
      let resolver!: MultiFactorResolver;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = (e as MultiFactorError).resolver;
        } else {
          throw e;
        }
      }

      // Use the primary phone
      let hint = resolver.hints.find(h => h.displayName === 'Main phone')!;
      resetVerifier();
      let verificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({
        multiFactorHint: hint,
        session: resolver.session
      }, verifier);
      let phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      let multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      let userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq('signIn');
      expect(userCredential.user).to.eq(firebase.auth().currentUser);

      // Now unenroll primary phone and try again
      const mfaUser = firebase.auth().currentUser!.multiFactor;
      await mfaUser.unenroll(hint.uid);

      // Sign in should still trigger MFA
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = (e as MultiFactorError).resolver;
        } else {
          throw e;
        }
      }

      // Use the secondary phone now
      hint = resolver.hints.find(h => h.displayName === 'Backup phone')!;
      resetVerifier();
      verificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({
        multiFactorHint: hint,
        session: resolver.session
      }, verifier);

      phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq('signIn');
      expect(userCredential.user).to.eq(firebase.auth().currentUser);
    });

    it('fails if the email is not verified', async () => {
      await expect(enroll(user, phone, 'nope')).to.be.rejectedWith('auth/unverified-email');
    });

    it('fails reauth if wrong code given', async () => {
      await verify();
      await enroll(user, phone, 'Display name');
      let resolver!: MultiFactorResolver;

      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = (e as MultiFactorError).resolver;
        } else {
          throw e;
        }
      }

      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, 'not-code');
      const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      await expect(resolver.resolveSignIn(multiFactorAssertion)).to.be.rejectedWith('auth/invalid-verification-code');
    });

    it('works in a multi-tenant context', async () => {
      const tenantId = await createNewTenant();
      firebase.auth().tenantId = tenantId;
      // Need to create a new user for this
      user = (await firebase.auth().createUserWithEmailAndPassword(email, password)).user!;
      await verify();
      
      await enroll(user, phone, 'Display name');

      // Log out and try logging in
      await firebase.auth().signOut();
      let resolver!: MultiFactorResolver;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = (e as MultiFactorError).resolver;
        } else {
          throw e;
        }
      }

      // Check the resolver hints and reverify
      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId, tenantId));
      const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq('signIn');
      expect(userCredential.user).to.eq(firebase.auth().currentUser);

      // Now unenroll and try again
      const mfaUser = firebase.auth().currentUser!.multiFactor;
      await mfaUser.unenroll(resolver.hints[0].uid);

      // Sign in should happen without MFA
      user = (await firebase.auth().signInWithEmailAndPassword(email, password)).user!;
      expect(user).to.eq(firebase.auth().currentUser);
      expect(user.tenantId).to.eq(tenantId);
    });
  });

  context('OAuth', () => {
    it('allows enroll and sign in', async () => {
      const oauthIdToken = JSON.stringify({
        email,
        'email_verified': true,
        sub: `oauthidp--${email}--oauthidp`
      });
      let {user} = await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(oauthIdToken));
      await enroll(user!, phone, 'Display name');

      // Log out and try logging in
      await firebase.auth().signOut();
      let resolver!: MultiFactorResolver;
      try {
        await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(oauthIdToken));
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = (e as MultiFactorError).resolver;
        } else {
          throw e;
        }
      }

      // Check the resolver hints and reverify
      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq('signIn');
      expect(userCredential.user).to.eq(firebase.auth().currentUser);

      // Now unenroll and try again
      const mfaUser = firebase.auth().currentUser!.multiFactor;
      await mfaUser.unenroll(resolver.hints[0].uid);

      // Sign in should happen without MFA
      ({user} = await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(oauthIdToken)));
      expect(user).to.eq(firebase.auth().currentUser);
    });
  });
});