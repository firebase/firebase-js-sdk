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

import { FirebaseError } from '@firebase/util';
import { assert } from 'chai';

import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { ErrorCode } from '../src/models/errors';

import { makeFakeApp } from './testing-utils/make-fake-app';

describe('Firebase Messaging > new *Controller()', () => {
  it('should handle bad input', () => {
    const badInputs = [
      makeFakeApp({
        messagingSenderId: undefined
      } as any),
      makeFakeApp({
        messagingSenderId: {}
      } as any),
      makeFakeApp({
        messagingSenderId: []
      } as any),
      makeFakeApp({
        messagingSenderId: true
      } as any),
      makeFakeApp({
        messagingSenderId: 1234567890
      } as any)
    ];
    badInputs.forEach(badInput => {
      try {
        new WindowController(badInput);
        new SwController(badInput);

        assert.fail(
          `Bad Input should have thrown: ${JSON.stringify(badInput)}`
        );
      } catch (e) {
        assert.instanceOf(e, FirebaseError);
        assert.equal('messaging/' + ErrorCode.BAD_SENDER_ID, e.code);
      }
    });
  });

  it('should be able to handle good input', () => {
    const app = makeFakeApp();
    new WindowController(app);
    new SwController(app);
  });
});
