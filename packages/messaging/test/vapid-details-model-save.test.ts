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
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { ERROR_CODES } from '../src/models/errors';
import { VapidDetailsModel } from '../src/models/vapid-details-model';
import { deleteDatabase } from './testing-utils/db-helper';

describe('Firebase Messaging > VapidDetailsModel.saveVapidDetails()', () => {
  const EXAMPLE_SCOPE = '/example-scope';
  const EXAMPLE_VAPID_STRING =
    'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
    '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I';
  const EXAMPLE_VAPID_KEY = base64ToArrayBuffer(EXAMPLE_VAPID_STRING);

  let vapidModel;

  const cleanUp = () => {
    let promiseChain = Promise.resolve();
    if (vapidModel) {
      promiseChain = promiseChain.then(() => vapidModel.closeDatabase());
    }

    return promiseChain
      .then(() => deleteDatabase('fcm_vapid_details_db'))
      .then(() => (vapidModel = null));
  };

  beforeEach(() => {
    return cleanUp();
  });

  after(() => {
    return cleanUp();
  });

  it('should throw on bad scope input', () => {
    const badInputs = ['', [], {}, true, null, 123];
    badInputs.forEach(badInput => {
      vapidModel = new VapidDetailsModel();
      return vapidModel.saveVapidDetails(badInput, EXAMPLE_VAPID_KEY).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SCOPE, err.code);
        }
      );
    });
  });

  it('should throw on bad vapid input', () => {
    const badInputs = ['', [], {}, true, null, 123];
    badInputs.forEach(badInput => {
      vapidModel = new VapidDetailsModel();
      return vapidModel.saveVapidDetails(EXAMPLE_SCOPE, badInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_VAPID_KEY, err.code);
        }
      );
    });
  });

  it('should save valid details', () => {
    vapidModel = new VapidDetailsModel();
    return vapidModel.saveVapidDetails(EXAMPLE_SCOPE, EXAMPLE_VAPID_KEY);
  });
});
