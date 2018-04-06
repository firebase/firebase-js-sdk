/**
 * Copyright 2017 Google Inc.
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
import { assert } from 'chai';
import * as sinon from 'sinon';
import { arrayBufferToBase64 } from '../src/helpers/array-buffer-to-base64';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { ERROR_CODES } from '../src/models/errors';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { makeFakeSubscription } from './make-fake-subscription';
import { deleteDatabase } from './testing-utils/db-helper';
import { compareDetails } from './testing-utils/detail-comparator';

const EXAMPLE_INPUT = {
  swScope: '/example-scope',
  vapidKey: base64ToArrayBuffer(
    'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
      '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
  ),
  subscription: makeFakeSubscription(),
  fcmSenderId: '1234567',
  fcmToken: 'qwerty',
  fcmPushSet: '7654321'
};

describe('Firebase Messaging > TokenDetailsModel.deleteToken()', () => {
  let globalTokenModel: TokenDetailsModel;

  beforeEach(() => {
    globalTokenModel = new TokenDetailsModel();
  });

  afterEach(async () => {
    await globalTokenModel.closeDatabase();
    await deleteDatabase('fcm_token_details_db');
  });

  it('should handle no input', () => {
    globalTokenModel = new TokenDetailsModel();
    return globalTokenModel.deleteToken(undefined as any).then(
      () => {
        throw new Error('Expected this to throw an error due to no token');
      },
      err => {
        assert.equal('messaging/' + ERROR_CODES.INVALID_DELETE_TOKEN, err.code);
      }
    );
  });

  it('should handle empty string', () => {
    globalTokenModel = new TokenDetailsModel();
    return globalTokenModel.deleteToken('').then(
      () => {
        throw new Error('Expected this to throw an error due to no token');
      },
      err => {
        assert.equal('messaging/' + ERROR_CODES.INVALID_DELETE_TOKEN, err.code);
      }
    );
  });

  it('should delete current token', () => {
    globalTokenModel = new TokenDetailsModel();
    const now = Date.now();
    const clock = sinon.useFakeTimers(now);
    return globalTokenModel
      .saveTokenDetails(EXAMPLE_INPUT)
      .then(() => {
        return globalTokenModel.deleteToken(EXAMPLE_INPUT.fcmToken);
      })
      .then(details => {
        compareDetails(EXAMPLE_INPUT, details, now);
        return globalTokenModel.getTokenDetailsFromToken(
          EXAMPLE_INPUT.fcmToken
        );
      })
      .then(tokenDetails => {
        assert.equal(null, tokenDetails);
        clock.restore();
      });
  });

  it('should handle deleting a non-existant token', () => {
    globalTokenModel = new TokenDetailsModel();
    return globalTokenModel.deleteToken('bad-token').then(
      () => {
        throw new Error('Expected this delete to throw and error.');
      },
      err => {
        assert.equal(
          'messaging/' + ERROR_CODES.DELETE_TOKEN_NOT_FOUND,
          err.code
        );
      }
    );
  });
});
