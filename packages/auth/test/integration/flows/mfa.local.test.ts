// eslint-disable-next-line import/no-extraneous-dependencies
import {
  applyActionCode,
  Auth, AuthError, ConfirmationResult, createUserWithEmailAndPassword, getMultiFactorResolver, GoogleAuthProvider, multiFactor, MultiFactorError, MultiFactorResolver, OperationType, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier, sendEmailVerification, signInWithCredential, signInWithCustomToken, signInWithEmailAndPassword, User,
} from '@firebase/auth';
import { createNewTenant, getOobCodes, getPhoneVerificationCodes, OobCodeSession } from '../../helpers/integration/emulator_rest_helpers';
import { cleanUpTestInstance, getTestInstance, randomEmail, randomPhone } from '../../helpers/integration/helpers';
import { expect, use, assert } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('Integration test: multi-factor', () => {
  let auth: Auth;
  let email: string;
  let phone: string;
  let fakeRecaptchaContainer: HTMLElement;
  let verifier: RecaptchaVerifier;

  beforeEach(() => {
    auth = getTestInstance(/** requireTestInstance */ true);
    email = randomEmail();
    phone = randomPhone();
    fakeRecaptchaContainer = document.createElement('div');
    document.body.appendChild(fakeRecaptchaContainer);
    verifier = new RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any,
      auth
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
    await cleanUpTestInstance(auth);
    document.body.removeChild(fakeRecaptchaContainer);
  });

  function resetVerifier(): void {
    verifier.clear();
    verifier = new RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any,
      auth
    );
  }

  async function enroll(user: User, phoneNumber: string, displayName: string): Promise<void> {
    const mfaUser = multiFactor(user);
    const mfaSession = await mfaUser.getSession();

    // Send verification code.
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const phoneInfoOptions = {
      phoneNumber,
      session: mfaSession
    };
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, verifier);
    const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId, user.tenantId || undefined));
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
    await mfaUser.enroll(multiFactorAssertion, displayName);
  }

  context('with email/password', () => {
    const password = 'password';
    let user: User;

    beforeEach(async () => {
      ({user} = await createUserWithEmailAndPassword(auth, email, password));
    });

    async function oobCode(toEmail: string, tenant?: string): Promise<OobCodeSession> {
      const codes = await getOobCodes(tenant);
      return codes.reverse().find(({ email }) => email === toEmail)!;
    }

    async function verify() {
      await sendEmailVerification(user);
      // Apply the email verification code
      await applyActionCode(auth, (await oobCode(email, user.tenantId || undefined)).oobCode);
      await user.reload();
    }

    it('allows enrollment, sign in, and unenrollment', async () => {
      await verify();
      
      await enroll(user, phone, 'Display name');

      // Log out and try logging in
      await auth.signOut();
      let resolver!: MultiFactorResolver;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = getMultiFactorResolver(auth, (e as MultiFactorError));
        } else {
          throw e;
        }
      }

      // Check the resolver hints and reverify
      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user).to.eq(auth.currentUser);

      // Now unenroll and try again
      const mfaUser = multiFactor(auth.currentUser!);
      await mfaUser.unenroll(resolver.hints[0].uid);

      // Sign in should happen without MFA
      ({user} = await signInWithEmailAndPassword(auth, email, password));
      expect(user).to.eq(auth.currentUser);
    });

    it('multiple factors can be enrolled', async () => {
      await verify();

      const secondaryPhone = randomPhone();
      
      await enroll(user, phone, 'Main phone');
      resetVerifier();
      await enroll(user, secondaryPhone, 'Backup phone');

      // Log out and try logging in
      await auth.signOut();
      let resolver!: MultiFactorResolver;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = getMultiFactorResolver(auth, (e as MultiFactorError));
        } else {
          throw e;
        }
      }

      // Use the primary phone
      let hint = resolver.hints.find(h => h.displayName === 'Main phone')!;
      resetVerifier();
      let verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
        multiFactorHint: hint,
        session: resolver.session
      }, verifier);
      let phoneAuthCredential = PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      let multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      let userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user).to.eq(auth.currentUser);

      // Now unenroll primary phone and try again
      const mfaUser = multiFactor(auth.currentUser!);
      await mfaUser.unenroll(hint.uid);

      // Sign in should still trigger MFA
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = getMultiFactorResolver(auth, (e as MultiFactorError));
        } else {
          throw e;
        }
      }

      // Use the secondary phone now
      hint = resolver.hints.find(h => h.displayName === 'Backup phone')!;
      resetVerifier();
      verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
        multiFactorHint: hint,
        session: resolver.session
      }, verifier);

      phoneAuthCredential = PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user).to.eq(auth.currentUser);
    });

    it('fails if the email is not verified', async () => {
      await expect(enroll(user, phone, 'nope')).to.be.rejectedWith('auth/unverified-email');
    });

    it('fails reauth if wrong code given', async () => {
      await verify();
      await enroll(user, phone, 'Display name');
      let resolver!: MultiFactorResolver;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = getMultiFactorResolver(auth, (e as MultiFactorError));
        } else {
          throw e;
        }
      }

      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, 'not-code');
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      await expect(resolver.resolveSignIn(multiFactorAssertion)).to.be.rejectedWith('auth/invalid-verification-code');
    });

    it('works in a multi-tenant context', async () => {
      const tenantId = await createNewTenant();
      auth.tenantId = tenantId;
      // Need to create a new user for this
      ({user} = await createUserWithEmailAndPassword(auth, email, password));
      await verify();
      
      await enroll(user, phone, 'Display name');

      // Log out and try logging in
      await auth.signOut();
      let resolver!: MultiFactorResolver;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = getMultiFactorResolver(auth, (e as MultiFactorError));
        } else {
          throw e;
        }
      }

      // Check the resolver hints and reverify
      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId, tenantId));
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user).to.eq(auth.currentUser);

      // Now unenroll and try again
      const mfaUser = multiFactor(auth.currentUser!);
      await mfaUser.unenroll(resolver.hints[0].uid);

      // Sign in should happen without MFA
      ({user} = await signInWithEmailAndPassword(auth, email, password));
      expect(user).to.eq(auth.currentUser);
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
      let {user} = await signInWithCredential(auth, GoogleAuthProvider.credential(oauthIdToken));
      await enroll(user, phone, 'Display name');

      // Log out and try logging in
      await auth.signOut();
      let resolver!: MultiFactorResolver;
      try {
        await signInWithCredential(auth, GoogleAuthProvider.credential(oauthIdToken));
        // Previous line should throw an error.
        assert.fail('Multi factor check not triggered');
      } catch (e) {
        if ((e as AuthError).code == 'auth/multi-factor-auth-required') {
          resolver = getMultiFactorResolver(auth, (e as MultiFactorError));
        } else {
          throw e;
        }
      }

      // Check the resolver hints and reverify
      expect(resolver.hints.length).to.eq(1);
      expect(resolver.hints[0].displayName).to.eq('Display name');
      resetVerifier();
      const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
        multiFactorUid: resolver.hints[0].uid,
        session: resolver.session
      }, verifier);

      const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, await phoneCode(verificationId));
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user).to.eq(auth.currentUser);

      // Now unenroll and try again
      const mfaUser = multiFactor(auth.currentUser!);
      await mfaUser.unenroll(resolver.hints[0].uid);

      // Sign in should happen without MFA
      ({user} = await signInWithCredential(auth, GoogleAuthProvider.credential(oauthIdToken)));
      expect(user).to.eq(auth.currentUser);
    });
  });
});