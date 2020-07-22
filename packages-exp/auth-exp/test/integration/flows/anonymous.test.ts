import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
    createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, signInAnonymously,
    signInWithEmailAndPassword, updateEmail, updatePassword
} from '@firebase/auth-exp/index.browser';
import { OperationType } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { describeIntegration, randomEmail } from '../../helpers/integration/with_test_instance';

use(chaiAsPromised);

describeIntegration('anonymous auth', auth => {
  it('signs in anonymously', async () => {
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);

    const user = userCred.user;
    expect(user.isAnonymous).to.be.true;
    expect(typeof user.uid).to.eq('string');
  });

  it('second sign in on the same device yields same user', async () => {
    const {user: userA} = await signInAnonymously(auth);
    const {user: userB} = await signInAnonymously(auth);

    expect(userA.uid).to.eq(userB.uid);
  });

  context('email/password interaction', () => {
    let email: string;

    beforeEach(() => {
      email = randomEmail();
    });

    it('anonymous / email-password accounts remain independent', async () => {
      let anonCred = await signInAnonymously(auth);
      const emailCred = await createUserWithEmailAndPassword(auth, email, 'password');
      expect(emailCred.user.uid).not.to.eql(anonCred.user.uid);
  
      await auth.signOut();
      anonCred = await signInAnonymously(auth); 
      const emailSignIn = await signInWithEmailAndPassword(auth, email, 'password');
      expect(emailCred.user.uid).to.eql(emailSignIn.user.uid);
      expect(emailSignIn.user.uid).not.to.eql(anonCred.user.uid);
    });
  
    it('account can be upgraded by setting email and password', async () => {
      const {user} = await signInAnonymously(auth);
      await updateEmail(user, email);
      await updatePassword(user, 'password');
  
      const anonId = user.uid;
      await auth.signOut();
      expect((await signInWithEmailAndPassword(auth, email, 'password')).user.uid).to.eq(anonId);
    });
  
    it('account can be linked using email and password', async () => {
      const {user} = await signInAnonymously(auth);
      const cred = EmailAuthProvider.credential(email, 'password');
      const id = user.uid;
      await linkWithCredential(user, cred);
      await auth.signOut();

      expect((await signInWithEmailAndPassword(auth, email, 'password')).user.uid).to.eq(id);
    });

    it('account cannot be linked with existing email/password', async () => {
      await createUserWithEmailAndPassword(auth, email, 'password');
      const {user: anonUser} = await signInAnonymously(auth);
      const cred = EmailAuthProvider.credential(email, 'password');
      await expect(linkWithCredential(anonUser, cred)).to.be.rejectedWith(FirebaseError, 'auth/email-already-in-use');
    });
  });
});