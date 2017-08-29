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
import makeFakeApp from './make-fake-app';

import Errors from '../src/models/errors';
import WindowController from '../src/controllers/window-controller';
import SWController from '../src/controllers/sw-controller';

describe('Firebase Messaging > new *Controller()', function() {
  it('should handle bad input', function() {
    const badInputs = [
      makeFakeApp(),
      makeFakeApp({
        messagingSenderId: {}
      }),
      makeFakeApp({
        messagingSenderId: []
      }),
      makeFakeApp({
        messagingSenderId: true
      }),
      makeFakeApp({
        messagingSenderId: 1234567890
      })
    ];
    badInputs.forEach(badInput => {
      let caughtError;
      try {
        new WindowController(badInput);
        new SWController(badInput);

        console.warn(
          'Bad Input should have thrown: ',
          JSON.stringify(badInput)
        );
      } catch (err) {
        caughtError = err;
      }
      assert.equal('messaging/' + Errors.codes.BAD_SENDER_ID, caughtError.code);
    });
  });

  it('should be able to handle good input', function() {
    const app = makeFakeApp({
      messagingSenderId: '1234567890'
    });
    new WindowController(app);
    new SWController(app);
  });
});
