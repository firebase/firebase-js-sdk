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
import { TokenDetails } from '../src/interfaces/token-details';
import { ERROR_CODES } from '../src/models/errors';
import { TokenDetailsModel } from '../src/models/token-details-model';

import { deleteDatabase } from './testing-utils/db-helper';
import { compareDetails } from './testing-utils/detail-comparator';
import { makeFakeSubscription } from './testing-utils/make-fake-subscription';

import { describe } from './testing-utils/messaging-test-runner';

const BAD_INPUTS: any[] = ['', [], {}, true, null, 123];

describe('Firebase Messaging > TokenDetailsModel', () => {
  let clock: sinon.SinonFakeTimers;
  let globalTokenModel: TokenDetailsModel;
  let exampleInput: TokenDetails;
  let fakeSubscription: PushSubscription;

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    globalTokenModel = new TokenDetailsModel();

    fakeSubscription = makeFakeSubscription();
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

  describe('Database update v2 -> v3', () => {
    it('converts database contents', async () => {
      class OldDBTokenDetailsModel extends TokenDetailsModel {
        protected readonly dbVersion: number = 2;
      }

      const oldDBTokenDetailsModel = new OldDBTokenDetailsModel();

      // Old (v2) version of exampleInput
      // vapidKey, auth and p256dh are strings, createTime does not exist
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

      // Get the same token using DB v3
      const tokenDetails = await globalTokenModel.get<TokenDetails>(
        exampleInput.swScope
      );

      assert.exists(tokenDetails);
      compareDetails(tokenDetails!, exampleInput);
    });
  });

  describe('saveToken', () => {
    it('should throw on bad input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.swScope = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_SCOPE, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad vapid key input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.vapidKey = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_VAPID_KEY, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad endpoint input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.endpoint = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_SUBSCRIPTION, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad auth input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.auth = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_SUBSCRIPTION, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad p256dh input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.p256dh = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_SUBSCRIPTION, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad send id input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.fcmSenderId = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_SENDER_ID, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad token input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.fcmToken = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_TOKEN, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should throw on bad pushSet input', () => {
      const promises = BAD_INPUTS.map(badInput => {
        globalTokenModel = new TokenDetailsModel();
        exampleInput.fcmPushSet = badInput;
        return globalTokenModel.saveTokenDetails(exampleInput).then(
          () => {
            throw new Error('Expected promise to reject');
          },
          err => {
            assert.equal('messaging/' + ERROR_CODES.BAD_PUSH_SET, err.code);
          }
        );
      });

      return Promise.all(promises);
    });

    it('should save valid details', () => {
      globalTokenModel = new TokenDetailsModel();
      return globalTokenModel.saveTokenDetails(exampleInput);
    });
  });

  describe('getTokenDetailsFromToken', () => {
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
          return globalTokenModel.getTokenDetailsFromToken(
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
      globalTokenModel = new TokenDetailsModel();
      return globalTokenModel.deleteToken(undefined as any).then(
        () => {
          throw new Error('Expected this to throw an error due to no token');
        },
        err => {
          assert.equal(
            'messaging/' + ERROR_CODES.INVALID_DELETE_TOKEN,
            err.code
          );
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
          assert.equal(
            'messaging/' + ERROR_CODES.INVALID_DELETE_TOKEN,
            err.code
          );
        }
      );
    });

    it('should delete current token', () => {
      globalTokenModel = new TokenDetailsModel();
      return globalTokenModel
        .saveTokenDetails(exampleInput)
        .then(() => {
          return globalTokenModel.deleteToken(exampleInput.fcmToken);
        })
        .then(details => {
          compareDetails(exampleInput, details);
          return globalTokenModel.getTokenDetailsFromToken(
            exampleInput.fcmToken
          );
        })
        .then(tokenDetails => {
          assert.equal(null, tokenDetails);
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
});
