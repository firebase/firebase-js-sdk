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
import { ErrorCode } from '../src/models/errors';

import { makeFakeFirebaseInternalServices } from './testing-utils/make-fake-firebase-services';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';

const EXAMPLE_SENDER_ID = '1234567890';

const firebaseInternalServices = makeFakeFirebaseInternalServices({
  messagingSenderId: EXAMPLE_SENDER_ID
});

describe('Firebase Messaging > *Controller.getSWReg_()', () => {
  const mockWindowRegistration = (
    registration: ServiceWorkerRegistration
  ): void => {
    stub(navigator.serviceWorker, 'register').callsFake(
      async () => registration
    );
  };

  const cleanUp = (): void => {
    restore();
  };

  beforeEach(() => {
    return cleanUp();
  });

  after(() => {
    return cleanUp();
  });

  it('should get sw reg in window', () => {
    let updateCalled = false;
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });
    activatedRegistration.update = async () => {
      updateCalled = true;
    };

    mockWindowRegistration(activatedRegistration);

    const messagingService = new WindowController(firebaseInternalServices);
    return messagingService
      .getSWRegistration_()
      .then(registration => {
        assert.equal(registration, activatedRegistration);
        assert.equal(updateCalled, true);
      })
      .then(() => {
        // Check a second call returns the already registered registration
        return messagingService.getSWRegistration_();
      })
      .then(registration => {
        assert.equal(registration, activatedRegistration);
      });
  });

  it('should handle no sw reg in page', () => {
    const fakeReg = makeFakeSWReg();
    mockWindowRegistration(fakeReg);

    const messagingService = new WindowController(firebaseInternalServices);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Expected this error to throw due to no SW.');
      },
      err => {
        assert.equal('messaging/' + ErrorCode.NO_SW_IN_REG, err.code);
      }
    );
  });

  it('should get sw reg in sw', () => {
    const fakeReg = makeFakeSWReg();
    (self as any).registration = fakeReg;

    const messagingService = new SwController(firebaseInternalServices);
    return messagingService
      .getSWRegistration_()
      .then(registration => {
        assert.equal(fakeReg, registration);
      })
      .then(() => {
        // Check a second call returns the already registered registration
        return messagingService.getSWRegistration_();
      })
      .then(registration => {
        assert.equal(registration, fakeReg);
      });
  });

  it('should make registration error available to developer', () => {
    const errorMsg = 'test-reg-error-1234567890';
    const mockRegisterMethod = stub(navigator.serviceWorker, 'register');
    mockRegisterMethod.callsFake(async () => {
      throw new Error(errorMsg);
    });

    const messagingService = new WindowController(firebaseInternalServices);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Expect getSWRegistration_ to reject.');
      },
      error => {
        assert.equal(
          'messaging/' + ErrorCode.FAILED_DEFAULT_REGISTRATION,
          error.code
        );
        assert.equal(error.message.indexOf(errorMsg) !== -1, true);
      }
    );
  });

  it('should test redundant edge case', () => {
    const redundantRegistration = makeFakeSWReg('installing', {
      state: 'redundant'
    });
    mockWindowRegistration(redundantRegistration);

    const messagingService = new WindowController(firebaseInternalServices);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Should throw error due to redundant SW');
      },
      err => {
        assert.equal('messaging/' + ErrorCode.SW_REG_REDUNDANT, err.code);
      }
    );
  });

  it('should handle installed to redundant edge case', () => {
    const swValue = {
      state: 'installing',
      addEventListener: (_eventName: string, cb: () => void) => {
        swValue.state = 'redundant';
        cb();
      },
      removeEventListener: (_eventName: string, _cb: () => void) => {
        // NOOP
      }
    };

    const slowRedundantRegistration = makeFakeSWReg('installing', swValue);
    mockWindowRegistration(slowRedundantRegistration);

    const messagingService = new WindowController(firebaseInternalServices);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Should throw error due to redundant SW');
      },
      err => {
        assert.equal('messaging/' + ErrorCode.SW_REG_REDUNDANT, err.code);
      }
    );
  });

  it('should handle waiting to redundant edge case', () => {
    const swValue = {
      state: 'waiting',
      addEventListener: (_eventName: string, cb: () => void) => {
        swValue.state = 'redundant';
        cb();
      },
      removeEventListener: (_eventName: string, _cb: () => void) => {
        // NOOP
      }
    };

    const slowRedundantRegistration = makeFakeSWReg('waiting', swValue);
    mockWindowRegistration(slowRedundantRegistration);

    const messagingService = new WindowController(firebaseInternalServices);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Should throw error due to redundant SW');
      },
      err => {
        assert.equal('messaging/' + ErrorCode.SW_REG_REDUNDANT, err.code);
      }
    );
  });
});
