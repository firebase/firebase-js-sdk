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
import { stub, restore } from 'sinon';

import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { ErrorCode } from '../src/models/errors';
import { SubscriptionManager } from '../src/models/subscription-manager';
import { TokenDetailsModel } from '../src/models/token-details-model';

import { deleteDatabase } from './testing-utils/db-helper';
import { makeFakeFirebaseInternalServices } from './testing-utils/make-fake-firebase-services';
import { makeFakeSubscription } from './testing-utils/make-fake-subscription';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';
import { TokenDetails } from '../src/interfaces/token-details';
import { FirebaseInternalServices } from '../src/interfaces/internal-services';

let FAKE_SUBSCRIPTION: PushSubscription;
let EXAMPLE_TOKEN_SAVE: TokenDetails;

describe('Firebase Messaging > *Controller.deleteToken()', () => {
  let firebaseInternalServices: FirebaseInternalServices;
  let messagingService: WindowController | SwController;

  function configureRegistrationMocks(
    serviceClass: typeof WindowController | typeof SwController,
    fakeReg: ServiceWorkerRegistration | null
  ): void {
    stub(serviceClass.prototype, 'getSWRegistration_').callsFake(() => {
      return Promise.resolve(fakeReg as any);
    });
  }

  function generateFakeReg(
    getSubscription: () => Promise<PushSubscription | null>
  ): ServiceWorkerRegistration {
    const registration = makeFakeSWReg();

    Object.defineProperty(registration, 'pushManager', {
      value: { getSubscription }
    });

    return registration;
  }

  before(() => {
    FAKE_SUBSCRIPTION = makeFakeSubscription();
    EXAMPLE_TOKEN_SAVE = {
      swScope: '/example-scope',
      vapidKey: base64ToArrayBuffer(
        'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
          '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
      ),
      fcmSenderId: '1234567',
      fcmToken: 'qwerty',
      endpoint: FAKE_SUBSCRIPTION.endpoint,
      auth: FAKE_SUBSCRIPTION.getKey('auth')!,
      p256dh: FAKE_SUBSCRIPTION.getKey('p256dh')!,
      createTime: Date.now()
    };
  });

  beforeEach(() => {
    firebaseInternalServices = makeFakeFirebaseInternalServices({
      messagingSenderId: EXAMPLE_TOKEN_SAVE.fcmSenderId
    });
  });

  afterEach(async () => {
    restore();

    if (messagingService) {
      await messagingService.delete();
    }

    await deleteDatabase('fcm_token_details_db');
  });

  it('should handle no token to delete', () => {
    messagingService = new WindowController(firebaseInternalServices);
    return messagingService.deleteToken(undefined as any).then(
      () => {
        throw new Error('Expected error to be thrown.');
      },
      err => {
        assert.equal('messaging/' + ErrorCode.INVALID_DELETE_TOKEN, err.code);
      }
    );
  });

  it('should handle no registration', () => {
    configureRegistrationMocks(WindowController, null);

    stub(TokenDetailsModel.prototype, 'deleteToken').callsFake(async token => {
      assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
      return EXAMPLE_TOKEN_SAVE;
    });

    stub(
      SubscriptionManager.prototype,
      'deleteToken'
    ).callsFake(async () => {});

    messagingService = new WindowController(firebaseInternalServices);
    return messagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
  });

  it('should handle get subscription error', () => {
    configureRegistrationMocks(
      WindowController,
      generateFakeReg(async () => {
        throw new Error('Unknown error');
      })
    );

    stub(TokenDetailsModel.prototype, 'deleteToken').callsFake(async token => {
      assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
      return EXAMPLE_TOKEN_SAVE;
    });

    stub(
      SubscriptionManager.prototype,
      'deleteToken'
    ).callsFake(async () => {});

    messagingService = new WindowController(firebaseInternalServices);
    return messagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken).then(
      () => {
        throw new Error('Expected this to reject');
      },
      err => {
        assert.equal('Unknown error', err.message);
      }
    );
  });

  [WindowController, SwController].forEach(serviceClass => {
    it(`should handle null getSubscription() ${serviceClass.name}`, () => {
      configureRegistrationMocks(
        serviceClass,
        generateFakeReg(async () => null)
      );

      stub(TokenDetailsModel.prototype, 'deleteToken').callsFake(
        async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        }
      );

      stub(
        SubscriptionManager.prototype,
        'deleteToken'
      ).callsFake(async () => {});

      messagingService = new serviceClass(firebaseInternalServices);
      return messagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });

    it(`should handle error on unsubscribe ${serviceClass.name}`, () => {
      const errorMsg = 'unsubscribe-error-1234567890';
      const fakeSubscription: any = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {
          throw new Error(errorMsg);
        }
      };

      configureRegistrationMocks(
        serviceClass,
        generateFakeReg(async () => fakeSubscription)
      );

      stub(TokenDetailsModel.prototype, 'deleteToken').callsFake(
        async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        }
      );

      stub(
        SubscriptionManager.prototype,
        'deleteToken'
      ).callsFake(async () => {});

      messagingService = new serviceClass(firebaseInternalServices);
      return messagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken).then(
        () => {
          throw new Error('Expected this to reject');
        },
        err => {
          assert.equal(errorMsg, err.message);
        }
      );
    });

    it(`should handle error on deleteToken ${serviceClass.name}`, async () => {
      const fakeSubscription: any = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {}
      };

      configureRegistrationMocks(
        serviceClass,
        generateFakeReg(async () => fakeSubscription)
      );

      stub(TokenDetailsModel.prototype, 'deleteToken').callsFake(
        async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        }
      );

      const errorMsg = 'messaging/' + ErrorCode.TOKEN_UNSUBSCRIBE_FAILED;
      stub(SubscriptionManager.prototype, 'deleteToken').callsFake(async () => {
        throw new Error(errorMsg);
      });

      const consoleStub = stub(console, 'error');

      messagingService = new serviceClass(firebaseInternalServices);
      await messagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
      assert.equal(consoleStub.callCount, 1);
    });

    it(`should delete with valid unsubscribe ${serviceClass.name}`, () => {
      const fakeSubscription: any = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {}
      };

      configureRegistrationMocks(
        serviceClass,
        generateFakeReg(async () => fakeSubscription)
      );

      stub(TokenDetailsModel.prototype, 'deleteToken').callsFake(
        async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        }
      );

      stub(
        SubscriptionManager.prototype,
        'deleteToken'
      ).callsFake(async () => {});

      messagingService = new serviceClass(firebaseInternalServices);
      return messagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });
  });
});
