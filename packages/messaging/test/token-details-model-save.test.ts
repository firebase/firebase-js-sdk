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

describe('Firebase Messaging > TokenDetailsModel.saveToken()', function() {
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

  it('should throw on bad input', function() {
    const badInputs = ['', [], {}, true, null, 123];

    const promises = badInputs.map((badInput: any) => {
      tokenModel = new TokenDetailsModel();
      const validInput = Object.assign({}, EXAMPLE_INPUT);
      validInput.swScope = badInput;
      return tokenModel.saveTokenDetails(validInput).then(
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

  it('should throw on bad vapid key input', function() {
    const badInputs = ['', [], {}, true, null, 123];

    const promises = badInputs.map((badInput: any) => {
      tokenModel = new TokenDetailsModel();
      const validInput = Object.assign({}, EXAMPLE_INPUT);
      validInput.vapidKey = badInput;
      return tokenModel.saveTokenDetails(validInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_VAPID_KEY, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad subscription input', function() {
    const badInputs = ['', [], {}, true, null, 123];

    const promises = badInputs.map((badInput: any) => {
      tokenModel = new TokenDetailsModel();
      const validInput = Object.assign({}, EXAMPLE_INPUT);
      validInput.subscription = badInput;
      return tokenModel.saveTokenDetails(validInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_SUBSCRIPTION, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad send id input', function() {
    const badInputs = ['', [], {}, true, null, 123];

    const promises = badInputs.map((badInput: any) => {
      tokenModel = new TokenDetailsModel();
      const validInput = Object.assign({}, EXAMPLE_INPUT);
      validInput.fcmSenderId = badInput;
      return tokenModel.saveTokenDetails(validInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_SENDER_ID, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad token input', function() {
    const badInputs = ['', [], {}, true, null, 123];

    const promises = badInputs.map((badInput: any) => {
      tokenModel = new TokenDetailsModel();
      const validInput = Object.assign({}, EXAMPLE_INPUT);
      validInput.fcmToken = badInput;
      return tokenModel.saveTokenDetails(validInput).then(
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

  it('should throw on bad pushset input', function() {
    const badInputs = ['', [], {}, true, null, 123];

    const promises = badInputs.map((badInput: any) => {
      tokenModel = new TokenDetailsModel();
      const validInput = Object.assign({}, EXAMPLE_INPUT);
      validInput.fcmPushSet = badInput;
      return tokenModel.saveTokenDetails(validInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_PUSH_SET, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should save valid details', function() {
    tokenModel = new TokenDetailsModel();
    return tokenModel.saveTokenDetails(EXAMPLE_INPUT);
  });
});
