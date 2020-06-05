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

import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { WebChannelConnection } from '../../../src/platform_browser/webchannel_connection';
import * as api from '../../../src/protos/firestore_proto_api';
import { getDefaultDatabaseInfo } from '../util/internal_helpers';
import { DEFAULT_PROJECT_ID } from '../util/settings';

/* eslint-disable no-restricted-globals */

// We need to check both `window` and `window.navigator` to make sure we are
// not running in Node with IndexedDBShim.
const describeFn =
  typeof window === 'object' && typeof window.navigator === 'object'
    ? describe
    : // eslint-disable-next-line no-restricted-globals,
      xdescribe;

describeFn('WebChannel', () => {
  describe('makeUrl', () => {
    const info = new DatabaseInfo(
      new DatabaseId('testproject'),
      'persistenceKey',
      'example.com',
      /*ssl=*/ false,
      /*forceLongPolling=*/ false
    );
    const conn = new WebChannelConnection(info);
    const makeUrl = conn.makeUrl.bind(conn);

    it('includes project ID and database ID', () => {
      const url = makeUrl('Commit');
      expect(url).to.equal(
        'http://example.com/v1/projects/testproject/' +
          'databases/(default)/documents:commit'
      );
    });
  });

  it('receives error messages', done => {
    const projectId = DEFAULT_PROJECT_ID;
    const info = getDefaultDatabaseInfo();
    const conn = new WebChannelConnection(info);
    const stream = conn.openStream<api.ListenRequest, api.ListenResponse>(
      'Listen',
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

    // Once the stream is open, send an "add_target" request
    stream.onOpen(() => {
      stream.send(payload);
    });

    // Wait until we receive data, then send a bad "addTarget" request, causing
    // the stream to be closed with an error. In this case, bad means having a
    // different database ID.
    stream.onMessage(msg => {
      if (msg.targetChange) {
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
