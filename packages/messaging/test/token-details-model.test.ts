/**
 * @license
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
import { useFakeTimers } from 'sinon';
import { arrayBufferToBase64 } from '../src/helpers/array-buffer-to-base64';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { TokenDetails } from '../src/interfaces/token-details';
import { ErrorCode } from '../src/models/errors';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { deleteDatabase } from './testing-utils/db-helper';
import { compareDetails } from './testing-utils/detail-comparator';
import { makeFakeSubscription } from './testing-utils/make-fake-subscription';
import { makeFakeFirebaseInternalServices } from './testing-utils/make-fake-firebase-services';
import { FirebaseInternalServices } from '../src/interfaces/internal-services';

const BAD_INPUTS: any[] = ['', [], {}, true, null, 123];

describe('Firebase Messaging > TokenDetailsModel', () => {
  let clock: sinon.SinonFakeTimers;
  let firebaseInternalServices: FirebaseInternalServices;
  let tokenDetailsModel: TokenDetailsModel;
  let exampleInput: TokenDetails;
  let fakeSubscription: PushSubscription;

  beforeEach(() => {
    clock = useFakeTimers();

    firebaseInternalServices = makeFakeFirebaseInternalServices();
    tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);

    fakeSubscription = makeFakeSubscription();
    exampleInput = {
      swScope: '/example-scope',
      vapidKey: base64ToArrayBuffer(
        'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
          '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
      ),
      fcmSenderId: '1234567',
      fcmToken: 'qwerty',
      endpoint: fakeSubscription.endpoint,
      auth: fakeSubscription.getKey('auth')!,
      p256dh: fakeSubscription.getKey('p256dh')!,
      createTime: Date.now()
    };
  });

  afterEach(async () => {
    await tokenDetailsModel.closeDatabase();
    await deleteDatabase('fcm_token_details_db');

    clock.restore();
  });

  describe('Database update v2 -> v4', () => {
    it('converts database contents', async () => {
      class OldDBTokenDetailsModel extends TokenDetailsModel {
        protected readonly dbVersion = 2;
      }

      const oldDBTokenDetailsModel = new OldDBTokenDetailsModel(
        firebaseInternalServices
      );

      // Old (v2) version of exampleInput
      // vapidKey, auth and p256dh are strings,
      // createTime does not exist, pushSet exists.
      await oldDBTokenDetailsModel.put({
        swScope: '/example-scope',
        vapidKey:
          'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
          '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I',
        fcmSenderId: '1234567',
        fcmToken: 'qwerty',
        fcmPushSet: '7654321',
        endpoint: fakeSubscription.endpoint,
        auth: arrayBufferToBase64(fakeSubscription.getKey('auth')!),
        p256dh: arrayBufferToBase64(fakeSubscription.getKey('p256dh')!)
      });
      await oldDBTokenDetailsModel.closeDatabase();

      // Get the same token using DB v4
      const tokenDetails = await tokenDetailsModel.get<TokenDetails>(
        exampleInput.swScope
      );

      assert.exists(tokenDetails);
      compareDetails(tokenDetails!, exampleInput);
    });
  });

  describe('Database update v3 -> v4', () => {
    it('converts database contents', async () => {
      class OldDBTokenDetailsModel extends TokenDetailsModel {
        protected readonly dbVersion = 3;
      }

      const oldDBTokenDetailsModel = new OldDBTokenDetailsModel(
        firebaseInternalServices
      );

      // Old (v3) version of exampleInput
      // fcmPushSet exists
      await oldDBTokenDetailsModel.put({
        swScope: '/example-scope',
        vapidKey: base64ToArrayBuffer(
          'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
            '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
        ),
        fcmSenderId: '1234567',
        fcmToken: 'qwerty',
        fcmPushSet: 'pushSet',
        endpoint: fakeSubscription.endpoint,
        auth: fakeSubscription.getKey('auth')!,
        p256dh: fakeSubscription.getKey('p256dh')!,
        createTime: Date.now()
      });
      await oldDBTokenDetailsModel.closeDatabase();

      // Get the same token using DB v4
      const tokenDetails = await tokenDetailsModel.get<TokenDetails>(
        exampleInput.swScope
      );

      assert.exists(tokenDetails);
      compareDetails(tokenDetails!, exampleInput);
    });
  });

  describe('saveToken', () => {
    it('should throw on bad input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.swScope = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_SCOPE, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad vapid key input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.vapidKey = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_VAPID_KEY, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad endpoint input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.endpoint = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_SUBSCRIPTION, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad auth input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.auth = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_SUBSCRIPTION, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad p256dh input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.p256dh = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_SUBSCRIPTION, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad send id input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.fcmSenderId = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_SENDER_ID, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad token input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
        exampleInput.fcmToken = badInput;
        return tokenDetailsModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_TOKEN, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should save valid details', () => {
      tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
      return tokenDetailsModel.saveTokenDetails(exampleInput);
    });
  });

  describe('getTokenDetailsFromToken', () => {
    for (const badInput of BAD_INPUTS) {
      it(`should throw on bad scope input ${JSON.stringify(badInput)}`, () => {
        return tokenDetailsModel.getTokenDetailsFromSWScope(badInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_SCOPE, err.code);
          }
        );
      });
    }

    for (const badInput of BAD_INPUTS) {
      it(`should throw on bad FCM Token input: '${badInput}'`, () => {
        return tokenDetailsModel.getTokenDetailsFromToken(badInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ErrorCode.BAD_TOKEN, err.code);
          }
        );
      });
    }

    it('should get from scope', () => {
      return tokenDetailsModel
        .getTokenDetailsFromSWScope(exampleInput.swScope)
        .then(details => {
          assert.notExists(details);
          return tokenDetailsModel.saveTokenDetails(exampleInput);
        })
        .then(() => {
          return tokenDetailsModel.getTokenDetailsFromSWScope(
            exampleInput.swScope
          );
        })
        .then(details => {
          assert.exists(details);
          compareDetails(exampleInput, details!);
        });
    });

    it('should get from token', () => {
      return tokenDetailsModel
        .getTokenDetailsFromToken(exampleInput.fcmToken)
        .then(details => {
          assert.notExists(details);
          return tokenDetailsModel.saveTokenDetails(exampleInput);
        })
        .then(() => {
          return tokenDetailsModel.getTokenDetailsFromToken(
            exampleInput.fcmToken
          );
        })
        .then(details => {
          assert.exists(details);
          compareDetails(exampleInput, details!);
        });
    });
  });

  describe('deleteToken', () => {
    it('should handle no input', () => {
      tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
      return tokenDetailsModel.deleteToken(undefined as any).then(
        () => {
          throw new Error('Expected this to throw an error due to no token');
        },
        err => {
          assert.equal('messaging/' + ErrorCode.INVALID_DELETE_TOKEN, err.code);
        }
      );
    });

    it('should handle empty string', () => {
      tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
      return tokenDetailsModel.deleteToken('').then(
        () => {
          throw new Error('Expected this to throw an error due to no token');
        },
        err => {
          assert.equal('messaging/' + ErrorCode.INVALID_DELETE_TOKEN, err.code);
        }
      );
    });

    it('should delete current token', () => {
      tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
      return tokenDetailsModel
        .saveTokenDetails(exampleInput)
        .then(() => {
          return tokenDetailsModel.deleteToken(exampleInput.fcmToken);
        })
        .then(details => {
          compareDetails(exampleInput, details);
          return tokenDetailsModel.getTokenDetailsFromToken(
            exampleInput.fcmToken
          );
        })
        .then(tokenDetails => {
          assert.equal(null, tokenDetails);
        });
    });

    it('should handle deleting a non-existant token', () => {
      tokenDetailsModel = new TokenDetailsModel(firebaseInternalServices);
      return tokenDetailsModel.deleteToken('bad-token').then(
        () => {
          throw new Error('Expected this delete to throw and error.');
        },
        err => {
          assert.equal(
            'messaging/' + ErrorCode.DELETE_TOKEN_NOT_FOUND,
            err.code
          );
        }
      );
    });
  });
});
