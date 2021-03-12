import { expect } from 'chai';

import {
  OperationType,
} from '../../model/public_types';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _createError } from '../util/assert';
import { SAMLAuthProvider } from './saml';

describe('core/providers/saml', () => {
  it('credentialFromResult creates the cred from a tagged result', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: 'firebase',
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        pendingToken: 'pending-token',
        providerId: 'saml.provider',
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = SAMLAuthProvider.credentialFromResult(userCred)!;
    expect(cred.providerId).to.eq('saml.provider');
    expect(cred.signInMethod).to.eq('saml.provider');
  });

  it('credentialFromResult returns null if provider ID not specified', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: 'firebase',
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        pendingToken: 'pending-token',
      },
      operationType: OperationType.SIGN_IN
    });
    expect(SAMLAuthProvider.credentialFromResult(userCred)).to.be.null;
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      pendingToken: 'pending-token',
      providerId: 'saml.provider'
    };

    const cred = SAMLAuthProvider.credentialFromError(error)!;
    expect(cred.providerId).to.eq('saml.provider');
    expect(cred.signInMethod).to.eq('saml.provider');
  });
});
