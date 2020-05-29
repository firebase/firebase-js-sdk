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

import { ProviderId, SignInMethod } from '@firebase/auth-types-exp';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { AnonymousCredential, AnonymousProvider } from './anonymous';
import { mockAuth } from '../../../test/mock_auth';

use(chaiAsPromised);

describe('core/providers/anonymous', () => {
  describe('AnonymousCredential', () => {
    const credential = new AnonymousCredential();

    it('should have an anonymous provider', () => {
      expect(credential.providerId).to.eq(ProviderId.ANONYMOUS);
    });

    it('should have an anonymous sign in method', () => {
      expect(credential.signInMethod).to.eq(SignInMethod.ANONYMOUS);
    });

    describe('#toJSON', () => {
      it('throws', () => {
        expect(credential.toJSON).to.throw(Error);
      });
    });

    describe('#_getIdTokenResponse', () => {
      it('throws', async () => {
        await expect(
          credential._getIdTokenResponse(mockAuth)
        ).to.be.rejectedWith(Error);
      });
    });

    describe('#_linkToIdToken', () => {
      it('throws', async () => {
        await expect(
          credential._linkToIdToken(mockAuth, 'id-token')
        ).to.be.rejectedWith(Error);
      });
    });

    describe('#_matchIdTokenWithUid', () => {
      it('throws', () => {
        expect(() =>
          credential._matchIdTokenWithUid(mockAuth, 'other-uid')
        ).to.throw(Error);
      });
    });
  });

  describe('AnonymousProvider', () => {
    describe('.credential', () => {
      it('should return an anonymous credential', () => {
        const credential = AnonymousProvider.credential();
        expect(credential.providerId).to.eq(ProviderId.ANONYMOUS);
        expect(credential.signInMethod).to.eq(SignInMethod.ANONYMOUS);
      });
    });
  });
});
