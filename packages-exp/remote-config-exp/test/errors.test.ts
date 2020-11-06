/**
 * @license
 * Copyright 2019 Google LLC
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
import { hasErrorCode, ERROR_FACTORY, ErrorCode } from '../src/errors';
import './setup';

describe('hasErrorCode', () => {
  it('defaults false', () => {
    const error = new Error();
    expect(hasErrorCode(error, ErrorCode.REGISTRATION_PROJECT_ID)).to.be.false;
  });
  it('returns true for FirebaseError with given code', () => {
    const error = ERROR_FACTORY.create(ErrorCode.REGISTRATION_PROJECT_ID);
    expect(hasErrorCode(error, ErrorCode.REGISTRATION_PROJECT_ID)).to.be.true;
  });
});
