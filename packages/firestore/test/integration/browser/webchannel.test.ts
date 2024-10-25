/**
 * @license
 * Copyright 2017 Google LLC
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

import { WebChannelConnection } from '../../../src/platform/browser/webchannel_connection';
import * as api from '../../../src/protos/firestore_proto_api';
import { getDefaultDatabaseInfo } from '../util/internal_helpers';
import { DEFAULT_PROJECT_ID, USE_EMULATOR } from '../util/settings';

/* eslint-disable no-restricted-globals */

// We need to check both `window` and `window.navigator` to make sure we are
// not running in Node with IndexedDBShim.
const describeFn =
  typeof window === 'object' && typeof window.navigator === 'object'
    ? describe
    : // eslint-disable-next-line no-restricted-globals,
      xdescribe;

describeFn('WebChannel', () => {
  // Test does not run on Emulator because emulator does not impose restriction
  // on project id. This is likely because emulator does not require creation
  // of project or database before using it. However, it might wrong for
  // emulator to allow sharing the same stream across different projects and
  // databases.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)('receives error messages', done => {
    const projectId = DEFAULT_PROJECT_ID;
    const info = getDefaultDatabaseInfo();
    const conn = new WebChannelConnection(info);
    const stream = conn.openStream<api.ListenRequest, api.ListenResponse>(
      'Listen',
      null,
      null
    );

    // Test data
    let didSendBadPayload = false;
    const payload = {
      database: 'projects/' + projectId + '/databases/(default)',
      addTarget: {
        query: {
          parent: 'projects/' + projectId + '/databases/(default)',
          structuredQuery: {
            from: [{ collectionId: 'foo' }]
          }
        }
      }
    };

    // Register an "onConnected" callback since it's required, even though we
    // don't care about this event.
    stream.onConnected(() => {});

    // Once the stream is open, send an "add_target" request
    stream.onOpen(() => {
      stream.send(payload);
    });

    // Wait until we receive data, then send a bad "addTarget" request, causing
    // the stream to be closed with an error. In this case, bad means having a
    // different project id.
    stream.onMessage(msg => {
      if (msg.targetChange) {
        // Assertion will fail when additional targets are added. This works so
        // long as backend target id counts up from 1. We expect the second
        // target to be a bad payload. If this does not fail stream, then we
        // might receive message that it was successfully added. The following
        // assertion will catch failure to validate data on backend.
        expect(msg.targetChange?.targetIds).to.not.include(2);

        payload.database = 'projects/some-other-project-id/databases/(default)';
        didSendBadPayload = true;
        stream.send(payload);
      }
    });

    // Expect to receive an error after the second request is sent
    stream.onClose(err => {
      expect(didSendBadPayload).to.equal(true);
      expect(err).to.exist;
      expect(err!.code).to.equal('invalid-argument');
      expect(err!.message).to.be.ok;
      done();
    });
  });
});
