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
import { expect } from 'chai';
import { DBInterface } from '../src/models/db-interface';
import { deleteDatabase } from './testing-utils/db-helper';

describe(`Firebase Messaging > db-interface.onDBUpgrade()`, () => {
  const TEST_DB_NAME = 'test-db';

  const cleanup = () => {
    return deleteDatabase(TEST_DB_NAME);
  };

  beforeEach(() => {
    return cleanup();
  });

  after(() => {
    return cleanup();
  });

  it(`should throw error when not inherited`, () => {
    return new DBInterface(TEST_DB_NAME, 1).openDatabase().then(
      () => {
        throw new Error(`An error was expected but method was successful.`);
      },
      err => {
        expect(err.code).to.equal('messaging/should-be-overriden');
      }
    );
  });
});
