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
import { FirebaseApp } from '@firebase/app-types';
import { assert } from 'chai';
import * as sinon from 'sinon';

import { SWController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { ERROR_CODES } from '../src/models/errors';
import { IIDModel } from '../src/models/iid-model';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { makeFakeApp } from './make-fake-app';
import { makeFakeSubscription } from './make-fake-subscription';
import { makeFakeSWReg } from './make-fake-sw-reg';
import { deleteDatabase } from './testing-utils/db-helper';

const FAKE_SUBSCRIPTION = makeFakeSubscription();
const EXAMPLE_TOKEN_SAVE = {
  swScope: '/example-scope',
  vapidKey: base64ToArrayBuffer(
    'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
      '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
  ),
  fcmSenderId: '1234567',
  fcmToken: 'qwerty',
  fcmPushSet: '7654321',
  endpoint: FAKE_SUBSCRIPTION.endpoint,
  auth: FAKE_SUBSCRIPTION.getKey('auth')!,
  p256dh: FAKE_SUBSCRIPTION.getKey('p256dh')!,
  createTime: Date.now()
};

describe('Firebase Messaging > *Controller.deleteToken()', () => {
  let sandbox: sinon.SinonSandbox;
  let app: FirebaseApp;
  let globalMessagingService: WindowController | SWController;

  function configureRegistrationMocks(
    ServiceClass: typeof WindowController | typeof SWController,
    fakeReg: ServiceWorkerRegistration | null
  ): void {
    sandbox.stub(ServiceClass.prototype, 'getSWRegistration_').callsFake(() => {
      return fakeReg;
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

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    app = makeFakeApp({
      messagingSenderId: EXAMPLE_TOKEN_SAVE.fcmSenderId
    });
  });

  afterEach(async () => {
    sandbox.restore();

    if (globalMessagingService) {
      await globalMessagingService.delete();
    }

    await deleteDatabase('fcm_token_details_db');
  });

  it('should handle no token to delete', () => {
    globalMessagingService = new WindowController(app);
    return globalMessagingService.deleteToken(undefined as any).then(
      () => {
        throw new Error('Expected error to be thrown.');
      },
      err => {
        assert.equal('messaging/' + ERROR_CODES.INVALID_DELETE_TOKEN, err.code);
      }
    );
  });

  it('should handle no registration', () => {
    configureRegistrationMocks(WindowController, null);

    sandbox
      .stub(TokenDetailsModel.prototype, 'deleteToken')
      .callsFake(async token => {
        assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
        return EXAMPLE_TOKEN_SAVE;
      });

    sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

    globalMessagingService = new WindowController(app);
    return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
  });

  it('should handle get subscription error', () => {
    configureRegistrationMocks(
      WindowController,
      generateFakeReg(async () => {
        throw new Error('Unknown error');
      })
    );

    sandbox
      .stub(TokenDetailsModel.prototype, 'deleteToken')
      .callsFake(async token => {
        assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
        return EXAMPLE_TOKEN_SAVE;
      });

    sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

    globalMessagingService = new WindowController(app);
    return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken).then(
      () => {
        throw new Error('Expected this to reject');
      },
      err => {
        assert.equal('Unknown error', err.message);
      }
    );
  });

  [WindowController, SWController].forEach(ServiceClass => {
    it(`should handle null getSubscription() ${ServiceClass.name}`, () => {
      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(async () => null)
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      globalMessagingService = new ServiceClass(app);
      return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });

    it(`should handle error on unsubscribe ${ServiceClass.name}`, () => {
      const errorMsg = 'unsubscribe-error-1234567890';
      const fakeSubscription: any = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {
          throw new Error(errorMsg);
        }
      };

      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(async () => fakeSubscription)
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      globalMessagingService = new ServiceClass(app);
      return globalMessagingService
        .deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken)
        .then(
          () => {
            throw new Error('Expected this to reject');
          },
          err => {
            assert.equal(errorMsg, err.message);
          }
        );
    });

    it(`should handle error on deleteToken ${ServiceClass.name}`, () => {
      const fakeSubscription: any = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {}
      };

      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(async () => fakeSubscription)
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        });

      const errorMsg = 'messaging/' + ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED;
      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {
        throw new Error(errorMsg);
      });

      globalMessagingService = new ServiceClass(app);
      return globalMessagingService
        .deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken)
        .then(
          () => {
            throw new Error('Expected this to reject');
          },
          err => {
            assert.equal(errorMsg, err.message);
          }
        );
    });

    it(`should delete with valid unsubscribe ${ServiceClass.name}`, () => {
      const fakeSubscription: any = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {}
      };

      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(async () => fakeSubscription)
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(async token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return EXAMPLE_TOKEN_SAVE;
        });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      globalMessagingService = new ServiceClass(app);
      return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });
  });
});
