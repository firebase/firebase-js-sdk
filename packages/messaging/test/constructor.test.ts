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

import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { ERROR_CODES } from '../src/models/errors';

import { makeFakeApp } from './testing-utils/make-fake-app';
import { describe } from './testing-utils/messaging-test-runner';

describe('Firebase Messaging > new *Controller()', () => {
  it('should handle bad input', () => {
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
        new SwController(badInput);

        console.warn(
          'Bad Input should have thrown: ',
          JSON.stringify(badInput)
        );
      } catch (err) {
        caughtError = err;
      }
      assert.equal('messaging/' + ERROR_CODES.BAD_SENDER_ID, caughtError.code);
    });
  });

  it('should be able to handle good input', () => {
    const app = makeFakeApp({
      messagingSenderId: '1234567890'
    });
    new WindowController(app);
    new SwController(app);
  });
});
