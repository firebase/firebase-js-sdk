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
import { makeFakeApp } from './make-fake-app';
import { makeFakeSWReg } from './make-fake-sw-reg';
import { deleteDatabase } from './testing-utils/db-helper';
import { ERROR_CODES } from '../src/models/errors';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { IIDModel } from '../src/models/iid-model';
import { WindowController } from '../src/controllers/window-controller';
import { SWController } from '../src/controllers/sw-controller';

const EXAMPLE_TOKEN_SAVE = {
  fcmToken: 'ExampleFCMToken1337',
  fcmSenderId: '1234567890',
  endpoint: 'https://example.google.com/1234',
  swScope: 'firebase-messaging-sw-scope',
  auth: '12345',
  p256dh: '123456789098765642421'
};

describe('Firebase Messaging > *Controller.deleteToken()', function() {
  const sandbox = sinon.sandbox.create();

  const app = makeFakeApp({
    messagingSenderId: EXAMPLE_TOKEN_SAVE.fcmSenderId
  });

  const configureRegistrationMocks = (ServiceClass, fakeReg) => {
    sandbox.stub(ServiceClass.prototype, 'getSWRegistration_').callsFake(() => {
      return fakeReg;
    });
  };

  const generateFakeReg = getSubResult => {
    const registration = makeFakeSWReg();
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: () => {
          if (typeof getSubResult === 'function') {
            return getSubResult();
          }

          return getSubResult;
        }
      }
    });
    return Promise.resolve(registration);
  };

  let globalMessagingService;
  const cleanUp = () => {
    sandbox.restore();

    const deletePromises = [];
    if (globalMessagingService) {
      deletePromises.push(globalMessagingService.delete());
    }
    return Promise.all(deletePromises)
      .then(() => deleteDatabase('fcm_token_details_db'))
      .then(() => (globalMessagingService = null));
  };

  beforeEach(function() {
    return cleanUp();
  });

  after(function() {
    return cleanUp();
  });

  it('should handle no token to delete', function() {
    globalMessagingService = new WindowController(app);
    return globalMessagingService.deleteToken().then(
      () => {
        throw new Error('Expected error to be thrown.');
      },
      err => {
        assert.equal('messaging/' + ERROR_CODES.INVALID_DELETE_TOKEN, err.code);
      }
    );
  });

  it('should handle no registration', function() {
    configureRegistrationMocks(WindowController, Promise.resolve(null));

    sandbox
      .stub(TokenDetailsModel.prototype, 'deleteToken')
      .callsFake(token => {
        assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
        return Promise.resolve(EXAMPLE_TOKEN_SAVE);
      });

    sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

    globalMessagingService = new WindowController(app);
    return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
  });

  it('should handle get subscription error', function() {
    configureRegistrationMocks(
      WindowController,
      generateFakeReg(() => Promise.reject(new Error('Unknown error')))
    );

    sandbox
      .stub(TokenDetailsModel.prototype, 'deleteToken')
      .callsFake(token => {
        assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
        return Promise.resolve(EXAMPLE_TOKEN_SAVE);
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
    it(`should handle null getSubscription() ${ServiceClass.name}`, function() {
      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(Promise.resolve(null))
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return Promise.resolve(EXAMPLE_TOKEN_SAVE);
        });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      globalMessagingService = new ServiceClass(app);
      return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });

    it(`should handle error on unsubscribe ${ServiceClass.name}`, function() {
      const errorMsg = 'unsubscribe-error-1234567890';
      const fakeSubscription = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: () => Promise.reject(new Error(errorMsg))
      };

      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(Promise.resolve(fakeSubscription))
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return Promise.resolve(EXAMPLE_TOKEN_SAVE);
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

    it(`should handle error on deleteToken ${ServiceClass.name}`, function() {
      const fakeSubscription = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {}
      };

      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(Promise.resolve(fakeSubscription))
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return Promise.resolve(EXAMPLE_TOKEN_SAVE);
        });

      const errorMsg = 'messaging/' + ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED;
      sandbox
        .stub(IIDModel.prototype, 'deleteToken')
        .callsFake(() => Promise.reject(new Error(errorMsg)));

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

    it(`should delete with valid unsubscribe ${ServiceClass.name}`, function() {
      const fakeSubscription = {
        endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
        unsubscribe: async () => {}
      };

      configureRegistrationMocks(
        ServiceClass,
        generateFakeReg(Promise.resolve(fakeSubscription))
      );

      sandbox
        .stub(TokenDetailsModel.prototype, 'deleteToken')
        .callsFake(token => {
          assert.equal(token, EXAMPLE_TOKEN_SAVE.fcmToken);
          return Promise.resolve(EXAMPLE_TOKEN_SAVE);
        });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      globalMessagingService = new ServiceClass(app);
      return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });
  });
});
