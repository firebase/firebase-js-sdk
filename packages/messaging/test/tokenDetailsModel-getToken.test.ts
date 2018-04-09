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
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { TokenDetails } from '../src/interfaces/token-details';
import { ERROR_CODES } from '../src/models/errors';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { makeFakeSubscription } from './make-fake-subscription';
import { deleteDatabase } from './testing-utils/db-helper';
import { compareDetails } from './testing-utils/detail-comparator';

const BAD_INPUTS: any[] = ['', [], {}, true, null, 123];

describe('Firebase Messaging > TokenDetailsModel.getTokenDetailsFromToken()', () => {
  let clock: sinon.SinonFakeTimers;
  let globalTokenModel: TokenDetailsModel;
  let exampleInput: TokenDetails;

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    globalTokenModel = new TokenDetailsModel();

    const fakeSubscription = makeFakeSubscription();
    exampleInput = {
      swScope: '/example-scope',
      vapidKey: base64ToArrayBuffer(
        'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
          '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
      ),
      fcmSenderId: '1234567',
      fcmToken: 'qwerty',
      fcmPushSet: '7654321',
      endpoint: fakeSubscription.endpoint,
      auth: fakeSubscription.getKey('auth')!,
      p256dh: fakeSubscription.getKey('p256dh')!,
      createTime: Date.now()
    };
  });

  afterEach(async () => {
    await globalTokenModel.closeDatabase();
    await deleteDatabase('fcm_token_details_db');

    clock.restore();
  });

  for (const badInput of BAD_INPUTS) {
    it(`should throw on bad scope input ${JSON.stringify(badInput)}`, () => {
      return globalTokenModel.getTokenDetailsFromSWScope(badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SCOPE, err.code);
        }
      );
    });
  }

  for (const badInput of BAD_INPUTS) {
    it(`should throw on bad FCM Token input: '${badInput}'`, () => {
      return globalTokenModel.getTokenDetailsFromToken(badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_TOKEN, err.code);
        }
      );
    });
  }

  it('should get from scope', () => {
    return globalTokenModel
      .getTokenDetailsFromSWScope(exampleInput.swScope)
      .then(details => {
        assert.notExists(details);
        return globalTokenModel.saveTokenDetails(exampleInput);
      })
      .then(() => {
        return globalTokenModel.getTokenDetailsFromSWScope(
          exampleInput.swScope
        );
      })
      .then(details => {
        assert.exists(details);
        compareDetails(exampleInput, details!);
      });
  });

  it('should get from token', () => {
    return globalTokenModel
      .getTokenDetailsFromToken(exampleInput.fcmToken)
      .then(details => {
        assert.notExists(details);
        return globalTokenModel.saveTokenDetails(exampleInput);
      })
      .then(() => {
        return globalTokenModel.getTokenDetailsFromToken(exampleInput.fcmToken);
      })
      .then(details => {
        assert.exists(details);
        compareDetails(exampleInput, details!);
      });
  });
});
