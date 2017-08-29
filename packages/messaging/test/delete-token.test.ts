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
import makeFakeApp from './make-fake-app';
import makeFakeSWReg from './make-fake-sw-reg';
import dbTMHelper from './db-token-manager';
import Errors from '../src/models/errors';
import WindowController from '../src/controllers/window-controller';
import SWController from '../src/controllers/sw-controller';

describe('Firebase Messaging > *Controller.deleteToken()', function() {
  let stubs = [];
  let globalMessagingService;

  const EXAMPLE_TOKEN_SAVE = {
    fcmToken: 'ExampleFCMToken1337',
    fcmSenderId: '1234567890',
    endpoint: 'https://example.google.com/1234',
    swScope: 'firebase-messaging-sw-scope',
    auth: '12345',
    p256dh: '123456789098765642421'
  };

  const servicesToTest = [WindowController, SWController];

  const app = makeFakeApp({
    messagingSenderId: EXAMPLE_TOKEN_SAVE.fcmSenderId
  });

  const configureRegistrationMocks = fakeReg => {
    servicesToTest.forEach(serviceClass => {
      const controllerStub = sinon.stub(
        serviceClass.prototype,
        'getSWRegistration_'
      );
      controllerStub.callsFake(() => {
        return fakeReg;
      });
      stubs.push(controllerStub);
    });
  };

  const generateFakeReg = getSubResult => {
    const registration = makeFakeSWReg();
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: () => getSubResult
      }
    });
    return Promise.resolve(registration);
  };

  beforeEach(function() {
    globalMessagingService = null;

    return dbTMHelper.deleteDB();
  });

  afterEach(function() {
    stubs.forEach(stub => {
      stub.restore();
    });
    stubs = [];

    const deletePromises = [dbTMHelper.closeDatabase()];
    if (globalMessagingService) {
      deletePromises.push(globalMessagingService.delete());
    }
    return Promise.all(deletePromises);
  });

  it('should handle no token to delete', function() {
    globalMessagingService = new WindowController(app);
    return globalMessagingService.deleteToken().then(
      () => {
        throw new Error('Invalid subscription.');
      },
      err => {
        assert.equal(
          'messaging/' + Errors.codes.INVALID_DELETE_TOKEN,
          err.code
        );
      }
    );
  });

  it('should handle no registration', function() {
    configureRegistrationMocks(Promise.resolve(null));

    return dbTMHelper.addObjectToIndexDB(EXAMPLE_TOKEN_SAVE).then(() => {
      globalMessagingService = new WindowController(app);
      return globalMessagingService.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
    });
  });

  it('should handle get subscription error', function() {
    configureRegistrationMocks(
      generateFakeReg(Promise.reject(new Error('Unknown error')))
    );

    dbTMHelper.addObjectToIndexDB(EXAMPLE_TOKEN_SAVE);

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

  it('should handle null getSubscription()', function() {
    configureRegistrationMocks(generateFakeReg(Promise.resolve(null)));

    let serviceInstance;

    return servicesToTest.reduce((chain, serviceClass) => {
      return chain
        .then(() => {
          return dbTMHelper.addObjectToIndexDB(EXAMPLE_TOKEN_SAVE);
        })
        .then(() => {
          serviceInstance = new serviceClass(app);
          return serviceInstance.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
        })
        .then(() => {
          return serviceInstance.delete();
        });
    }, Promise.resolve());
  });

  it('should handle error on unsubscribe', function() {
    const errorMsg = 'unsubscribe-error-1234567890';
    const fakeSubscription = {
      endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
      unsubscribe: () => Promise.reject(new Error(errorMsg))
    };

    configureRegistrationMocks(
      generateFakeReg(Promise.resolve(fakeSubscription))
    );

    let serviceInstance;

    return servicesToTest.reduce((chain, serviceClass) => {
      return chain
        .then(() => {
          return dbTMHelper.addObjectToIndexDB(EXAMPLE_TOKEN_SAVE);
        })
        .then(() => {
          serviceInstance = new serviceClass(app);
          return serviceInstance.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken).then(
            () => {
              throw new Error('Expected this to reject');
            },
            err => {
              assert.equal(errorMsg, err.message);
            }
          );
        })
        .then(() => {
          return serviceInstance.delete();
        });
    }, Promise.resolve());
  });

  it('should delete with valid unsubscribe', function() {
    const fakeSubscription = {
      endpoint: EXAMPLE_TOKEN_SAVE.endpoint,
      unsubscribe: () => Promise.resolve()
    };

    configureRegistrationMocks(
      generateFakeReg(Promise.resolve(fakeSubscription))
    );

    let serviceInstance;

    return servicesToTest.reduce((chain, serviceClass) => {
      return chain
        .then(() => {
          return dbTMHelper.addObjectToIndexDB(EXAMPLE_TOKEN_SAVE);
        })
        .then(() => {
          serviceInstance = new serviceClass(app);
          return serviceInstance.deleteToken(EXAMPLE_TOKEN_SAVE.fcmToken);
        })
        .then(() => {
          return serviceInstance.delete();
        });
    }, Promise.resolve());
  });
});
