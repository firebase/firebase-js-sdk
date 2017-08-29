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
import DefaultSW from '../src/models/default-sw';
import Errors from '../src/models/errors';
import WindowController from '../src/controllers/window-controller';
import SWController from '../src/controllers/sw-controller';

let stubs = [];
const EXAMPLE_SENDER_ID = '1234567890';

const app = makeFakeApp({
  messagingSenderId: EXAMPLE_SENDER_ID
});

const mockWindowRegistration = registration => {
  const regStub = sinon.stub(navigator.serviceWorker, 'register');
  regStub.callsFake(() => Promise.resolve(registration));
  stubs.push(regStub);
};

describe('Firebase Messaging > *Controller.getSWReg_()', function() {
  afterEach(function() {
    stubs.forEach(stub => {
      stub.restore();
    });
  });

  it('should get sw reg in window', function() {
    let updateCalled = false;
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });
    activatedRegistration.update = () => {
      updateCalled = true;
    };

    mockWindowRegistration(activatedRegistration);

    const messagingService = new WindowController(app);
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

  it('should handle no sw reg in page', function() {
    const fakeReg = {};
    mockWindowRegistration(fakeReg);

    const messagingService = new WindowController(app);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Expected this error to throw due to no SW.');
      },
      err => {
        assert.equal('messaging/' + Errors.codes.NO_SW_IN_REG, err.code);
      }
    );
  });

  it('should get sw reg in sw', function() {
    const fakeReg = {};
    (self as any).registration = fakeReg;

    const messagingService = new SWController(app);
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

  it('should make registration error available to developer', function() {
    const errorMsg = 'test-reg-error-1234567890';
    const mockRegisterMethod = sinon.stub(navigator.serviceWorker, 'register');
    mockRegisterMethod.callsFake(() => Promise.reject(new Error(errorMsg)));

    const messagingService = new WindowController(app);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Expect getSWRegistration_ to reject.');
      },
      error => {
        assert.equal(
          'messaging/' + Errors.codes.FAILED_DEFAULT_REGISTRATION,
          error.code
        );
        assert.equal(error.message.indexOf(errorMsg) !== -1, true);
      }
    );
  });

  it('should test redundant edge case', function() {
    const redundantRegistration = makeFakeSWReg('installing', {
      state: 'redundant'
    });
    mockWindowRegistration(redundantRegistration);

    const messagingService = new WindowController(app);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Should throw error due to redundant SW');
      },
      err => {
        assert.equal('messaging/' + Errors.codes.SW_REG_REDUNDANT, err.code);
      }
    );
  });

  it('should handle installed to redundant edge case', function() {
    const swValue = {
      state: 'installing',
      addEventListener: (eventName, cb) => {
        swValue.state = 'redundant';
        cb();
      },
      removeEventListener: (eventName, cb) => {
        // NOOP
      }
    };

    const slowRedundantRegistration = makeFakeSWReg('installing', swValue);
    mockWindowRegistration(slowRedundantRegistration);

    const messagingService = new WindowController(app);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Should throw error due to redundant SW');
      },
      err => {
        assert.equal('messaging/' + Errors.codes.SW_REG_REDUNDANT, err.code);
      }
    );
  });

  it('should handle waiting to redundant edge case', function() {
    const swValue = {
      state: 'waiting',
      addEventListener: (eventName, cb) => {
        swValue.state = 'redundant';
        cb();
      },
      removeEventListener: (eventName, cb) => {
        // NOOP
      }
    };

    const slowRedundantRegistration = makeFakeSWReg('waiting', swValue);
    mockWindowRegistration(slowRedundantRegistration);

    const messagingService = new WindowController(app);
    return messagingService.getSWRegistration_().then(
      () => {
        throw new Error('Should throw error due to redundant SW');
      },
      err => {
        assert.equal('messaging/' + Errors.codes.SW_REG_REDUNDANT, err.code);
      }
    );
  });
});
