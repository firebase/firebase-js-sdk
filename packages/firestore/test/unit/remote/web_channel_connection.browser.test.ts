/**
 * @license
 * Copyright 2025 Google LLC
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

import {
  WebChannelOptions,
  WebChannelTransport
} from '@firebase/webchannel-wrapper';
import { expect } from 'chai';

import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { WebChannelConnection } from '../../../src/platform/browser/webchannel_connection';

export class TestWebChannelConnection extends WebChannelConnection {
  transport: { lastOptions?: WebChannelOptions } & WebChannelTransport =
    {
      lastOptions: undefined,
      createWebChannel(url: string, options: WebChannelOptions): never {
        this.lastOptions = options;

        // Throw here so we don't have to mock out any more of Web Channel
        throw new Error('Not implemented for test');
      }
    };
  protected createWebChannelTransport(): WebChannelTransport {
    return this.transport;
  }
}

describe('WebChannelConnection', () => {
  const testDatabaseInfo = new DatabaseInfo(
    new DatabaseId('testproject'),
    'test-app-id',
    'persistenceKey',
    'example.com',
    /*ssl=*/ false,
    /*forceLongPolling=*/ false,
    /*autoDetectLongPolling=*/ false,
    /*longPollingOptions=*/ {},
    /*useFetchStreams=*/ false,
    /*isUsingEmulator=*/ false,
    'wc-connection-test-api-key'
  );

  it('Passes the API Key from DatabaseInfo to makeHeaders for openStream', async () => {
    const connection = new TestWebChannelConnection(testDatabaseInfo);

    expect(() => connection.openStream('mockRpc', null, null)).to.throw(
      'Not implemented for test'
    );

    const headers = connection.transport.lastOptions
      ?.initMessageHeaders as unknown as { [key: string]: string };
    expect(headers['x-goog-api-key']).to.deep.equal(
      'wc-connection-test-api-key'
    );
  });
});
