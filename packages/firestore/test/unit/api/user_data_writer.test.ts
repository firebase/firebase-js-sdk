/**
 * @license
 * Copyright 2026 Google LLC
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

import { setUserLogHandler } from '@firebase/logger';
import { expect } from 'chai';

import { ExpUserDataWriter } from '../../../src/api/user_data_writer';
import { DocumentReference } from '../../../src/lite-api/reference';
import { setLogLevel } from '../../../src/util/log';
import { firestore } from '../../util/api_helpers';

describe('UserDataWriter', () => {
  it('logs error when deserializing reference from a different database', () => {
    const db = firestore();
    const writer = new ExpUserDataWriter(db);

    let loggedMessage = '';
    setUserLogHandler(callbackParams => {
      loggedMessage = callbackParams.message;
    });
    setLogLevel('error');

    const foreignRef = {
      referenceValue:
        'projects/other-project/databases/other-db/documents/coll/doc1'
    };

    const result = writer.convertValue(foreignRef) as DocumentReference;

    expect(result.path).to.equal('coll/doc1');
    expect(loggedMessage).to.include(
      'Document reference to coll/doc1 is for a different database (other-project/other-db) which is not supported. It will be treated as a reference in the current database (test-project/(default)) instead.'
    );

    // Reset log handler and level
    setUserLogHandler(null);
    setLogLevel('silent');
  });
});
