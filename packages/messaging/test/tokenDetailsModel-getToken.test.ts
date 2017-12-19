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
import makeFakeSubscription from './make-fake-subscription';
import { deleteDatabase } from './testing-utils/db-helper';
import Errors from '../src/models/errors';
import TokenDetailsModel from '../src/models/token-details-model';
import arrayBufferToBase64 from '../src/helpers/array-buffer-to-base64';
import base64ToArrayBuffer from '../src/helpers/base64-to-array-buffer';
import { compareDetails } from './testing-utils/detail-comparator';

describe('Firebase Messaging > TokenDetailsModel.getTokenDetailsFromToken()', function() {
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

  let globalTokenModel;

  const cleanUp = () => {
    let promises = [];
    if (globalTokenModel) {
      promises.push(globalTokenModel.closeDatabase());
    }

    return Promise.all(promises)
      .then(() => deleteDatabase(TokenDetailsModel.DB_NAME))
      .then(() => (globalTokenModel = null));
  };

  beforeEach(function() {
    return cleanUp();
  });

  after(function() {
    return cleanUp();
  });

  ['', [], {}, true, null, 123].forEach(badInput => {
    it(`should throw on bad scope input ${JSON.stringify(
      badInput
    )}`, function() {
      globalTokenModel = new TokenDetailsModel();
      return globalTokenModel.getTokenDetailsFromSWScope(badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_SCOPE, err.code);
        }
      );
    });
  });

  ['', [], {}, true, null, 123].forEach(badInput => {
    it('should throw on bad FCM Token input', function() {
      globalTokenModel = new TokenDetailsModel();
      return globalTokenModel.getTokenDetailsFromToken(badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_TOKEN, err.code);
        }
      );
    });
  });

  it('should get from scope', function() {
    globalTokenModel = new TokenDetailsModel();
    const now = Date.now();
    let clock = sinon.useFakeTimers(now);
    return globalTokenModel
      .getTokenDetailsFromSWScope(EXAMPLE_INPUT.swScope)
      .then(details => {
        assert.equal(null, details);
        return globalTokenModel.saveTokenDetails(EXAMPLE_INPUT);
      })
      .then(() => {
        return globalTokenModel.getTokenDetailsFromSWScope(
          EXAMPLE_INPUT.swScope
        );
      })
      .then(details => {
        compareDetails(EXAMPLE_INPUT, details, now);
        clock.restore();
      });
  });

  it('should get from token', function() {
    globalTokenModel = new TokenDetailsModel();
    const now = Date.now();
    let clock = sinon.useFakeTimers(now);
    return globalTokenModel
      .getTokenDetailsFromToken(EXAMPLE_INPUT.fcmToken)
      .then(details => {
        assert.equal(null, details);
        return globalTokenModel.saveTokenDetails(EXAMPLE_INPUT);
      })
      .then(() => {
        return globalTokenModel.getTokenDetailsFromToken(
          EXAMPLE_INPUT.fcmToken
        );
      })
      .then(details => {
        compareDetails(EXAMPLE_INPUT, details, now);
        clock.restore();
      });
  });
});
