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
import { mockAuth } from '../../../test/mock_auth';
import { AuthCredential } from '../../model/auth_credential';
import { IdTokenResponse } from '../../model/id_token';
import { OperationType } from '../../model/user_credential';
import { ProviderId, SignInMethod } from '../providers';
import { AuthCredentialImpl } from '../providers/auth_credential_impl';
import { UserCredentialImpl } from './user_credential_impl';

use(chaiAsPromised);

describe('core/user/user_credential_impl', () => {
  describe("fromIdTokenResponse", () => {
    const idTokenResponse: IdTokenResponse = {
      idToken: 'my-id-token',
      refreshToken: 'my-refresh-token',
      expiresIn: '1234',
      localId: 'my-uid',
      kind: 'my-kind'
    };

    const credential: AuthCredential = new AuthCredentialImpl(
      ProviderId.FIREBASE,
      SignInMethod.EMAIL_PASSWORD
    );

    it('should initialize a UserCredential', async () => {
      const userCredential = await UserCredentialImpl._fromIdTokenResponse(mockAuth, credential, OperationType.SIGN_IN, idTokenResponse);
      expect(userCredential.credential).to.eq(credential);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user.uid).to.eq('my-uid');
     });
  });
});