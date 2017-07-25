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
import dbHelpers from './db-helper';
import Errors from '../../../src/messaging/models/errors';
import VapidDetailsModel from '../../../src/messaging/models/vapid-details-model';

describe('Firebase Messaging > VapidDetailsModel.deleteToken()', function() {
  const EXAMPLE_SCOPE = '/example-scope';
  const EXAMPLE_VAPID_STRING =
    'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
    '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I';

  let vapidModel;

  beforeEach(function() {
    vapidModel = null;
    return dbHelpers.deleteDb(VapidDetailsModel.dbName);
  });

  afterEach(function() {
    let promiseChain = Promise.resolve();
    if (vapidModel) {
      promiseChain = promiseChain.then(() => vapidModel.closeDatabase());
    }

    return promiseChain.then(() => {
      return dbHelpers.deleteDb(VapidDetailsModel.dbName);
    });
  });

  it('should throw on bad scope input', function() {
    const badInputs = ['', [], {}, true, null, 123];
    badInputs.forEach(badInput => {
      vapidModel = new VapidDetailsModel();
      return vapidModel.saveVapidDetails(badInput, EXAMPLE_VAPID_STRING).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + Errors.codes.BAD_SCOPE, err.code);
        }
      );
    });
  });

  it('should delete non existant details', function() {
    vapidModel = new VapidDetailsModel();
    return vapidModel.deleteVapidDetails(EXAMPLE_SCOPE).then(
      () => {
        throw new Error('Expected promise to reject');
      },
      err => {
        assert.equal(
          'messaging/' + Errors.codes.DELETE_SCOPE_NOT_FOUND,
          err.code
        );
      }
    );
  });

  it('should save and delete details', function() {
    vapidModel = new VapidDetailsModel();
    return vapidModel
      .saveVapidDetails(EXAMPLE_SCOPE, EXAMPLE_VAPID_STRING)
      .then(() => {
        return vapidModel.deleteVapidDetails(EXAMPLE_SCOPE);
      })
      .then(vapidKey => {
        assert.equal(vapidKey, EXAMPLE_VAPID_STRING);
        return vapidModel.getVapidFromSWScope(EXAMPLE_SCOPE);
      })
      .then(vapid => {
        assert.equal(vapid, null);
      });
  });
});
