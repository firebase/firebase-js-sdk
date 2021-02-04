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
import { DEFAULT_PROJECT_ID } from '../util/settings';

/* eslint-disable no-restricted-globals */

const ADD_TARGET = {
  database: 'projects/' + DEFAULT_PROJECT_ID + '/databases/(default)',
  addTarget: {
    query: {
      parent: 'projects/' + DEFAULT_PROJECT_ID + '/databases/(default)',
      structuredQuery: {
        from: [{ collectionId: 'foo' }]
      }
    }
  }
};

// We need to check both `window` and `window.navigator` to make sure we are
// not running in Node with IndexedDBShim.
const describeFn =
  typeof window === 'object' && typeof window.navigator === 'object'
    ? describe
    : // eslint-disable-next-line no-restricted-globals,
      xdescribe;

describeFn('WebChannel', () => {
  it('can auto detect the connection type', done => {
    const conn = new WebChannelConnection({
      ...getDefaultDatabaseInfo(),
      autoDetectLongPolling: true
    });
    const stream = conn.openStream<api.ListenRequest, api.ListenResponse>(
      'Listen',
      null
    );

    // Once the stream is open, send an "add_target" request.
    stream.onOpen(() => stream.send(ADD_TARGET));

    stream.onMessage(() => {});

    // Ensure Time to first byte was raised
    let timeToFirstByteData: {
      isLongPollingConnection: boolean;
      timeToFirstByteMs: number;
    } | null = null;

    stream.onTimeToFirstByte((isLongPollingConnection, timeToFirstByteMs) => {
      timeToFirstByteData = { isLongPollingConnection, timeToFirstByteMs };
      stream.close();
    });

    stream.onClose(() => {
      expect(timeToFirstByteData).to.be.ok;
      expect(timeToFirstByteData!.isLongPollingConnection).to.not.equal(0);
      expect(timeToFirstByteData!.timeToFirstByteMs).to.be.greaterThan(0);
      done();
    });
  });

  it('receives error messages', done => {
    const conn = new WebChannelConnection(getDefaultDatabaseInfo());
    const stream = conn.openStream<api.ListenRequest, api.ListenResponse>(
      'Listen',
      null
    );

    // Test data
    let didSendBadPayload = false;

    // Once the stream is open, send an "add_target" request
    stream.onOpen(() => {
      stream.send(ADD_TARGET);
    });

    // Wait until we receive data, then send a bad "addTarget" request, causing
    // the stream to be closed with an error. In this case, bad means having a
    // different database ID.
    stream.onMessage(msg => {
      if (msg.targetChange) {
        didSendBadPayload = true;
        const payload = { ...ADD_TARGET };
        payload.database = 'projects/some-other-project-id/databases/(default)';
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
