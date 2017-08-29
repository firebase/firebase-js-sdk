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
import dbTMHelper from './db-token-manager';
import TokenManager from '../src/models/token-manager';
import Errors from '../src/models/errors';

describe('Firebase Messaging > tokenManager.deleteToken()', function() {
  let globalTokenManager = null;
  let stubs = [];

  beforeEach(function() {
    globalTokenManager = null;
    return dbTMHelper.deleteDB();
  });

  afterEach(function() {
    stubs.forEach(stub => {
      stub.restore();
    });
    stubs = [];

    return Promise.all([
      globalTokenManager.closeDatabase(),
      dbTMHelper.closeDatabase()
    ]);
  });

  it('should handle nothing', function() {
    globalTokenManager = new TokenManager();
    return globalTokenManager.deleteToken().then(
      () => {
        throw new Error('Expected this to throw an error due to no token');
      },
      err => {
        assert.equal(
          'messaging/' + Errors.codes.INVALID_DELETE_TOKEN,
          err.code
        );
      }
    );
  });

  it('should handle empty string', function() {
    globalTokenManager = new TokenManager();
    return globalTokenManager.deleteToken('').then(
      () => {
        throw new Error('Expected this to throw an error due to no token');
      },
      err => {
        assert.equal(
          'messaging/' + Errors.codes.INVALID_DELETE_TOKEN,
          err.code
        );
      }
    );
  });

  it('should delete current token', function() {
    const exampleDetails = {
      swScope: 'example-scope',
      fcmToken: 'example-token',
      fcmSenderId: '1234567890'
    };
    dbTMHelper.addObjectToIndexDB(exampleDetails);

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .deleteToken(exampleDetails.fcmToken)
      .then(deletedDetails => {
        assert.equal(exampleDetails.swScope, deletedDetails.swScope);
        assert.equal(exampleDetails.fcmToken, deletedDetails.fcmToken);
        assert.equal(exampleDetails.fcmSenderId, deletedDetails.fcmSenderId);

        return dbTMHelper.getTokenDetailsFromDB();
      })
      .then(tokenDetails => {
        assert.equal(0, tokenDetails.length);
      });
  });

  it('should delete non existant token', function() {
    const exampleDetails = {
      swScope: 'example-scope',
      fcmToken: 'example-token',
      fcmSenderId: '1234567890'
    };
    dbTMHelper.addObjectToIndexDB(exampleDetails);

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .deleteToken('bad-token')
      .then(
        () => {
          throw new Error('Expected this delete to throw and error.');
        },
        err => {
          assert.equal(
            'messaging/' + Errors.codes.DELETE_TOKEN_NOT_FOUND,
            err.code
          );
        }
      )
      .then(() => {
        return dbTMHelper.getTokenDetailsFromDB();
      })
      .then(tokenDetails => {
        assert.equal(1, tokenDetails.length);
        assert.equal(exampleDetails.swScope, tokenDetails[0].swScope);
        assert.equal(exampleDetails.fcmToken, tokenDetails[0].fcmToken);
        assert.equal(exampleDetails.fcmSenderId, tokenDetails[0].fcmSenderId);
      });
  });
});
