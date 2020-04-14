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
import * as chaiAsPromised from 'chai-as-promised';
import { UserImpl } from './user_impl';
import { StsTokenManager } from './token_manager';
import { IdTokenResponse } from '../../model/id_token';
import { mockAuth } from '../../../test/mock_auth';

use(chaiAsPromised);

describe('core/user/user_impl', () => {
  const auth = mockAuth;
  let stsTokenManager: StsTokenManager;

  beforeEach(() => {
    stsTokenManager = new StsTokenManager();
  });

  describe('constructor', () => {
    it('attaches required fields', () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      expect(user.auth).to.eq(auth);
      expect(user.uid).to.eq('uid');
    });

    it('attaches optional fields if provided', () => {
      const user = new UserImpl({
        uid: 'uid',
        auth,
        stsTokenManager,
        displayName: 'displayName',
        email: 'email',
        phoneNumber: 'phoneNumber',
        photoURL: 'photoURL'
      });

      expect(user.displayName).to.eq('displayName');
      expect(user.email).to.eq('email');
      expect(user.phoneNumber).to.eq('phoneNumber');
      expect(user.photoURL).to.eq('photoURL');
    });

    it('sets optional fields to null if not provided', () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      expect(user.displayName).to.eq(null);
      expect(user.email).to.eq(null);
      expect(user.phoneNumber).to.eq(null);
      expect(user.photoURL).to.eq(null);
    });
  });

  describe('#getIdToken', () => {
    it('returns the raw token if refresh tokens are in order', async () => {
      stsTokenManager.updateFromServerResponse({
        idToken: 'id-token-string',
        refreshToken: 'refresh-token-string',
        expiresIn: '100000'
      } as IdTokenResponse);

      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      const token = await user.getIdToken();
      expect(token).to.eq('id-token-string');
      expect(user.refreshToken).to.eq('refresh-token-string');
    });

    it('throws if refresh is required', async () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      await expect(user.getIdToken()).to.be.rejectedWith(Error);
    });
  });

  describe('#getIdTokenResult', () => {
    it('throws', async () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      await expect(user.getIdTokenResult()).to.be.rejectedWith(Error);
    });
  });

  describe('#reload', () => {
    it('throws', () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      expect(() => user.reload()).to.throw();
    });
  });

  describe('#delete', () => {
    it('throws', () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      expect(() => user.delete()).to.throw();
    });
  });
});
