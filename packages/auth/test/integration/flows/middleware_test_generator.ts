import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

// eslint-disable-next-line import/no-extraneous-dependencies
import {Auth, createUserWithEmailAndPassword, User} from '@firebase/auth';
import { randomEmail } from '../../helpers/integration/helpers';

use(chaiAsPromised);
use(sinonChai);

export function generateMiddlewareTests(authGetter: () => Auth, signIn: () => Promise<unknown>): void {
  context('middleware', () => {
    let auth: Auth;
    let unsubscribes: Array<() => void>;

    beforeEach(() => {
      auth = authGetter();
      unsubscribes = [];
    });

    afterEach(() => {
      for (const u of unsubscribes) {
        u();
      }
    });

    /**
     * Helper function for adding beforeAuthStateChanged that will
     * automatically unsubscribe after every test (since some tests may
     * perform cleanup after that would be affected by the middleware)
     */
    function beforeAuthStateChanged(callback: (user: User | null) => void | Promise<void>): void {
      unsubscribes.push(auth.beforeAuthStateChanged(callback));
    }

    it('can prevent user sign in', async () => {
      beforeAuthStateChanged(() => {
        throw new Error('stop sign in');
      });

      await expect(signIn()).to.be.rejectedWith('auth/login-blocked');
      expect(auth.currentUser).to.be.null;
    });

    it('keeps previously-logged in user if blocked', async () => {
      // Use a random email/password sign in for the base user
      const {user: baseUser} = await createUserWithEmailAndPassword(auth, randomEmail(), 'password');

      beforeAuthStateChanged(() => {
        throw new Error('stop sign in');
      });

      await expect(signIn()).to.be.rejectedWith('auth/login-blocked');
      expect(auth.currentUser).to.eq(baseUser);
    });

    it('can allow sign in', async () => {
      beforeAuthStateChanged(() => {
        // Pass
      });

      await expect(signIn()).not.to.be.rejected;
      expect(auth.currentUser).not.to.be.null;
    });

    it('overrides previous user if allowed', async () => {
      // Use a random email/password sign in for the base user
      const {user: baseUser} = await createUserWithEmailAndPassword(auth, randomEmail(), 'password');

      beforeAuthStateChanged(() => {
        // Pass
      });

      await expect(signIn()).not.to.be.rejected;
      expect(auth.currentUser).not.to.eq(baseUser);
    });

    it('will reject if one callback fails', async () => {
      // Also check that the function is called multiple
      // times
      const spy = sinon.spy();

      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(() => {
        throw new Error('stop sign in');
      });

      await expect(signIn()).to.be.rejectedWith('auth/login-blocked');
      expect(auth.currentUser).to.be.null;
      expect(spy).to.have.been.calledThrice;
    });

    it('keeps previously-logged in user if one rejects', async () => {
      // Use a random email/password sign in for the base user
      const {user: baseUser} = await createUserWithEmailAndPassword(auth, randomEmail(), 'password');

      // Also check that the function is called multiple
      // times
      const spy = sinon.spy();

      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(() => {
        throw new Error('stop sign in');
      });

      await expect(signIn()).to.be.rejectedWith('auth/login-blocked');
      expect(auth.currentUser).to.eq(baseUser);
      expect(spy).to.have.been.calledThrice;
    });

    it('allows sign in with multiple callbacks all pass', async () => {
      // Use a random email/password sign in for the base user
      const {user: baseUser} = await createUserWithEmailAndPassword(auth, randomEmail(), 'password');

      // Also check that the function is called multiple
      // times
      const spy = sinon.spy();

      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(spy);
      beforeAuthStateChanged(spy);

      await expect(signIn()).not.to.be.rejected;
      expect(auth.currentUser).not.to.eq(baseUser);
      expect(spy).to.have.been.calledThrice;
    });

    it('does not call subsequent callbacks after rejection', async () => {
      const firstSpy = sinon.spy();
      const secondSpy = sinon.spy();

      beforeAuthStateChanged(firstSpy);
      beforeAuthStateChanged(() => {
        throw new Error('stop sign in');
      });
      beforeAuthStateChanged(secondSpy);

      await expect(signIn()).to.be.rejectedWith('auth/login-blocked');
      expect(firstSpy).to.have.been.calledOnce;
      expect(secondSpy).not.to.have.been.called;
    });

    it('can prevent sign-out', async () => {
      await signIn();
      const user = auth.currentUser;
      
      beforeAuthStateChanged(() => {
        throw new Error('block sign out');
      });

      await expect(auth.signOut()).to.be.rejectedWith('auth/login-blocked');
      expect(auth.currentUser).to.eq(user);
    });
  });
}