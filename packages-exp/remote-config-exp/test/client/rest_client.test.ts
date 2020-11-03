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

import '../setup';
import { expect } from 'chai';
import { RestClient } from '../../src/client/rest_client';
import { FirebaseInstallations } from '@firebase/installations-types';
import * as sinon from 'sinon';
import { ERROR_FACTORY, ErrorCode } from '../../src/errors';
import { FirebaseError } from '@firebase/util';
import {
  FetchRequest,
  RemoteConfigAbortSignal
} from '../../src/client/remote_config_fetch_client';

const DEFAULT_REQUEST: FetchRequest = {
  cacheMaxAgeMillis: 1,
  signal: new RemoteConfigAbortSignal()
};

describe('RestClient', () => {
  const firebaseInstallations = {} as FirebaseInstallations;
  let client: RestClient;

  beforeEach(() => {
    client = new RestClient(
      firebaseInstallations,
      'sdk-version',
      'namespace',
      'project-id',
      'api-key',
      'app-id'
    );
    firebaseInstallations.getId = sinon
      .stub()
      .returns(Promise.resolve('fis-id'));
    firebaseInstallations.getToken = sinon
      .stub()
      .returns(Promise.resolve('fis-token'));
  });

  describe('fetch', () => {
    let fetchStub: sinon.SinonStub<
      [RequestInfo, RequestInit?],
      Promise<Response>
    >;

    beforeEach(() => {
      fetchStub = sinon
        .stub(window, 'fetch')
        .returns(Promise.resolve(new Response('{}')));
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('handles 200/UPDATE responses', async () => {
      const expectedResponse = {
        status: 200,
        eTag: 'etag',
        state: 'UPDATE',
        entries: { color: 'sparkling' }
      };

      fetchStub.returns(
        Promise.resolve({
          ok: true,
          status: expectedResponse.status,
          headers: new Headers({ ETag: expectedResponse.eTag }),
          json: () =>
            Promise.resolve({
              entries: expectedResponse.entries,
              state: expectedResponse.state
            })
        } as Response)
      );

      const response = await client.fetch(DEFAULT_REQUEST);

      expect(response).to.deep.eq({
        status: expectedResponse.status,
        eTag: expectedResponse.eTag,
        config: expectedResponse.entries
      });
    });

    it('calls the correct endpoint', async () => {
      await client.fetch(DEFAULT_REQUEST);

      expect(fetchStub).to.be.calledWith(
        'https://firebaseremoteconfig.googleapis.com/v1/projects/project-id/namespaces/namespace:fetch?key=api-key',
        sinon.match.object
      );
    });

    it('passes injected params', async () => {
      await client.fetch(DEFAULT_REQUEST);

      expect(fetchStub).to.be.calledWith(
        sinon.match.string,
        sinon.match({
          body:
            '{"sdk_version":"sdk-version","app_instance_id":"fis-id","app_instance_id_token":"fis-token","app_id":"app-id","language_code":"en-US"}'
        })
      );
    });

    it('throws on network failure', async () => {
      // The Fetch API throws a TypeError on network falure:
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Exceptions
      const originalError = new TypeError('Network request failed');
      fetchStub.returns(Promise.reject(originalError));

      const fetchPromise = client.fetch(DEFAULT_REQUEST);

      const firebaseError = ERROR_FACTORY.create(ErrorCode.FETCH_NETWORK, {
        originalErrorMessage: originalError.message
      });

      await expect(fetchPromise)
        .to.eventually.be.rejectedWith(FirebaseError, firebaseError.message)
        .with.nested.property(
          'customData.originalErrorMessage',
          'Network request failed'
        );
    });

    it('throws on JSON parse failure', async () => {
      // JSON parsing throws a SyntaxError on failure:
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#Exceptions
      const res = new Response(/* empty body */);
      sinon
        .stub(res, 'json')
        .throws(new SyntaxError('Unexpected end of input'));
      fetchStub.returns(Promise.resolve(res));

      const fetchPromise = client.fetch(DEFAULT_REQUEST);

      const firebaseError = ERROR_FACTORY.create(ErrorCode.FETCH_PARSE, {
        originalErrorMessage: 'Unexpected end of input'
      });

      await expect(fetchPromise)
        .to.eventually.be.rejectedWith(FirebaseError, firebaseError.message)
        .with.nested.property(
          'customData.originalErrorMessage',
          'Unexpected end of input'
        );
    });

    it('handles 304 status code and empty body', async () => {
      fetchStub.returns(
        Promise.resolve({
          status: 304,
          headers: new Headers({ ETag: 'response-etag' })
        } as Response)
      );

      const response = await client.fetch(
        Object.assign({}, DEFAULT_REQUEST, {
          eTag: 'request-etag'
        })
      );

      expect(fetchStub).to.be.calledWith(
        sinon.match.string,
        sinon.match({ headers: { 'If-None-Match': 'request-etag' } })
      );

      expect(response).to.deep.eq({
        status: 304,
        eTag: 'response-etag',
        config: undefined
      });
    });

    it('normalizes INSTANCE_STATE_UNSPECIFIED state to server error', async () => {
      fetchStub.returns(
        Promise.resolve({
          status: 200,
          headers: new Headers({ ETag: 'etag' }),
          json: async () => ({ state: 'INSTANCE_STATE_UNSPECIFIED' })
        } as Response)
      );

      const fetchPromise = client.fetch(DEFAULT_REQUEST);

      const error = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
        httpStatus: 500
      });

      await expect(fetchPromise)
        .to.eventually.be.rejectedWith(FirebaseError, error.message)
        .with.nested.property('customData.httpStatus', 500);
    });

    it('normalizes NO_CHANGE state to 304 status', async () => {
      fetchStub.returns(
        Promise.resolve({
          status: 200,
          headers: new Headers({ ETag: 'etag' }),
          json: async () => ({ state: 'NO_CHANGE' })
        } as Response)
      );

      const response = await client.fetch(DEFAULT_REQUEST);

      expect(response).to.deep.eq({
        status: 304,
        eTag: 'etag',
        config: undefined
      });
    });

    it('normalizes empty change states', async () => {
      for (const state of ['NO_TEMPLATE', 'EMPTY_CONFIG']) {
        fetchStub.returns(
          Promise.resolve({
            status: 200,
            headers: new Headers({ ETag: 'etag' }),
            json: async () => ({ state })
          } as Response)
        );

        await expect(client.fetch(DEFAULT_REQUEST)).to.eventually.be.deep.eq({
          status: 200,
          eTag: 'etag',
          config: {}
        });
      }
    });

    it('throws error on HTTP error status', async () => {
      // Error codes from logs plus an arbitrary unexpected code (300)
      for (const status of [300, 400, 403, 404, 415, 429, 500, 503, 504]) {
        fetchStub.returns(
          Promise.resolve({
            status,
            headers: new Headers()
          } as Response)
        );

        const fetchPromise = client.fetch(DEFAULT_REQUEST);

        const error = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
          httpStatus: status
        });

        await expect(fetchPromise)
          .to.eventually.be.rejectedWith(FirebaseError, error.message)
          .with.nested.property('customData.httpStatus', status);
      }
    });
  });
});
