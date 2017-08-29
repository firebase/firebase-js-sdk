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
import makeFakeSubscription from './make-fake-subscription';
import dbHelpers from './db-helper';
import Errors from '../src/models/errors';
import TokenDetailsModel from '../src/models/token-details-model';
import arrayBufferToBase64 from '../src/helpers/array-buffer-to-base64';

describe('Firebase Messaging > TokenDetailsModel.getToken()', function() {
  const EXAMPLE_INPUT = {
    swScope: '/example-scope',
    vapidKey:
      'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
      '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I',
    subscription: makeFakeSubscription(),
    fcmSenderId: '1234567',
    fcmToken: 'qwerty',
    fcmPushSet: '7654321'
  };

  let tokenModel;

  beforeEach(function() {
    tokenModel = null;
    return dbHelpers.deleteDb(TokenDetailsModel.dbName);
  });

  afterEach(function() {
    let promiseChain = Promise.resolve();
    if (tokenModel) {
      promiseChain = promiseChain.then(() => tokenModel.closeDatabase());
    }

    return promiseChain.then(() => {
      return dbHelpers.deleteDb(TokenDetailsModel.dbName);
    });
  });

  it('should throw on bad scope input', function() {
    const badInputs = ['', [], {}, true, null, 123];
    const promises = badInputs.map(badInput => {
      tokenModel = new TokenDetailsModel();
      return tokenModel.getTokenDetailsFromSWScope(badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_SCOPE, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad FCM Token input', function() {
    const badInputs = ['', [], {}, true, null, 123];
    const promises = badInputs.map(badInput => {
      tokenModel = new TokenDetailsModel();
      return tokenModel.getTokenDetailsFromToken(badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_TOKEN, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should get from scope', function() {
    tokenModel = new TokenDetailsModel();
    return tokenModel
      .getTokenDetailsFromSWScope(EXAMPLE_INPUT.swScope)
      .then(details => {
        assert.equal(null, details);

        return tokenModel.saveTokenDetails(EXAMPLE_INPUT);
      })
      .then(() => {
        return tokenModel.getTokenDetailsFromSWScope(EXAMPLE_INPUT.swScope);
      })
      .then(details => {
        const subscriptionKeys = ['endpoint', 'auth', 'p256dh'];
        const subscriptionValues = {
          endpoint: EXAMPLE_INPUT.subscription.endpoint,
          auth: arrayBufferToBase64(EXAMPLE_INPUT.subscription.getKey('auth')),
          p256dh: arrayBufferToBase64(
            EXAMPLE_INPUT.subscription.getKey('p256dh')
          )
        };

        subscriptionKeys.forEach(keyName => {
          assert.equal(details[keyName], subscriptionValues[keyName]);
        });

        Object.keys(details).forEach(keyName => {
          if (subscriptionKeys.indexOf(keyName) !== -1) {
            return;
          }

          assert.equal(details[keyName], EXAMPLE_INPUT[keyName]);
        });
      });
  });

  it('should get from token', function() {
    tokenModel = new TokenDetailsModel();
    return tokenModel
      .getTokenDetailsFromToken(EXAMPLE_INPUT.fcmToken)
      .then(details => {
        assert.equal(null, details);

        return tokenModel.saveTokenDetails(EXAMPLE_INPUT);
      })
      .then(() => {
        return tokenModel.getTokenDetailsFromToken(EXAMPLE_INPUT.fcmToken);
      })
      .then(details => {
        const subscriptionKeys = ['endpoint', 'auth', 'p256dh'];
        const subscriptionValues = {
          endpoint: EXAMPLE_INPUT.subscription.endpoint,
          auth: arrayBufferToBase64(EXAMPLE_INPUT.subscription.getKey('auth')),
          p256dh: arrayBufferToBase64(
            EXAMPLE_INPUT.subscription.getKey('p256dh')
          )
        };

        subscriptionKeys.forEach(keyName => {
          assert.equal(details[keyName], subscriptionValues[keyName]);
        });

        Object.keys(details).forEach(keyName => {
          if (subscriptionKeys.indexOf(keyName) !== -1) {
            return;
          }

          assert.equal(details[keyName], EXAMPLE_INPUT[keyName]);
        });
      });
  });
});
