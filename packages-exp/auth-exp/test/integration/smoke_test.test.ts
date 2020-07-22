/**
 * @license
 * Copyright 2020 Google LLC
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

import { expect } from 'chai';

import { signInAnonymously } from '@firebase/auth-exp/index.browser';
import { OperationType } from '@firebase/auth-types-exp';

import { withTestInstance } from '../helpers/integration/with_test_instance';

describe('integration smoke test', () => {
  it('signs in anonymously', () => {
    return withTestInstance(async auth => {
      const userCred = await signInAnonymously(auth);
      expect(auth.currentUser).to.eq(userCred.user);
      expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
    });
  });
});
