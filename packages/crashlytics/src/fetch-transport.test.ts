/*
 * @license
 * Copyright The OpenTelemetry Authors
 * Copyright 2025 Google LLC
 *
 * This file has been modified by Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as sinon from 'sinon';
import * as assert from 'assert';
import { DynamicHeaderProvider } from './types';
import { FetchTransport } from './fetch-transport';
import {
  ExportResponseRetryable,
  ExportResponseFailure,
  ExportResponseSuccess
} from '@opentelemetry/otlp-exporter-base';

const testTransportParameters = {
  url: 'http://example.test',
  headers: new Headers({
    foo: 'foo-value',
    bar: 'bar-value',
    'Content-Type': 'application/json'
  })
};

const requestTimeout = 1000;
const testPayload = Uint8Array.from([1, 2, 3]);

describe('FetchTransport', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('send', () => {
    it('returns success when request succeeds', done => {
      // arrange
      const fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('test response', { status: 200 }));
      const transport = new FetchTransport(testTransportParameters);

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'success');
          // currently we don't do anything with the response yet, so it's dropped by the transport.
          assert.strictEqual(
            (response as ExportResponseSuccess).data,
            undefined
          );
          sinon.assert.calledOnceWithMatch(
            fetchStub,
            testTransportParameters.url,
            sinon.match({
              method: 'POST',
              body: testPayload
            }) as unknown as RequestInit
          );
          const actualHeaders = fetchStub.firstCall.args[1]?.headers as Headers;
          assert.strictEqual(actualHeaders?.get('foo'), 'foo-value');
          assert.strictEqual(actualHeaders?.get('bar'), 'bar-value');
          assert.strictEqual(
            actualHeaders?.get('Content-Type'),
            'application/json'
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
    });

    it('returns failure when request fails', done => {
      // arrange
      sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('', { status: 404 }));
      const transport = new FetchTransport(testTransportParameters);

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'failure');
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
    });

    it('returns retryable when request is retryable', done => {
      // arrange
      sinon
        .stub(globalThis, 'fetch')
        .resolves(
          new Response('', { status: 503, headers: { 'Retry-After': '5' } })
        );
      const transport = new FetchTransport(testTransportParameters);

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'retryable');
          assert.strictEqual(
            (response as ExportResponseRetryable).retryInMillis,
            5000
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
    });

    it('returns failure when request times out', done => {
      // arrange
      const abortError = new Error('aborted request');
      abortError.name = 'AbortError';
      sinon.stub(globalThis, 'fetch').rejects(abortError);
      const clock = sinon.useFakeTimers();
      const transport = new FetchTransport(testTransportParameters);

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'failure');
          assert.strictEqual(
            (response as ExportResponseFailure).error.message,
            'aborted request'
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
      clock.tick(requestTimeout + 100);
    });

    it('returns failure when no server exists', done => {
      // arrange
      sinon.stub(globalThis, 'fetch').throws(new Error('fetch failed'));
      const clock = sinon.useFakeTimers();
      const transport = new FetchTransport(testTransportParameters);

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'failure');
          assert.strictEqual(
            (response as ExportResponseFailure).error.message,
            'fetch failed'
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
      clock.tick(requestTimeout + 100);
    });

    it('attaches static and dynamic headers to the request', done => {
      // arrange
      const fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('test response', { status: 200 }));

      const dynamicProvider: DynamicHeaderProvider = {
        getHeader: sinon.stub().resolves(['dynamic-header', 'dynamic-value'])
      };

      const transport = new FetchTransport({
        ...testTransportParameters,
        dynamicHeaderProviders: [dynamicProvider]
      });

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'success');
          sinon.assert.calledOnceWithMatch(
            fetchStub,
            testTransportParameters.url,
            sinon.match({
              method: 'POST',
              body: testPayload
            }) as unknown as RequestInit
          );
          const actualHeaders = fetchStub.firstCall.args[1]?.headers as Headers;
          assert.strictEqual(actualHeaders?.get('foo'), 'foo-value');
          assert.strictEqual(actualHeaders?.get('bar'), 'bar-value');
          assert.strictEqual(
            actualHeaders?.get('Content-Type'),
            'application/json'
          );
          assert.strictEqual(
            actualHeaders?.get('dynamic-header'),
            'dynamic-value'
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
    });

    it('does not accumulate dynamic headers across multiple send calls', async () => {
      // arrange
      const fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('test response', { status: 200 }));

      let counter = 1;
      const dynamicProvider: DynamicHeaderProvider = {
        getHeader: sinon
          .stub()
          .callsFake(() =>
            Promise.resolve(['dynamic-header', `value-${counter++}`])
          )
      };

      const transport = new FetchTransport({
        ...testTransportParameters,
        dynamicHeaderProviders: [dynamicProvider]
      });

      // act
      await transport.send(testPayload, requestTimeout);
      await transport.send(testPayload, requestTimeout);

      // assert
      sinon.assert.calledTwice(fetchStub);

      const firstHeaders = fetchStub.firstCall.args[1]?.headers as Headers;
      assert.strictEqual(firstHeaders?.get('dynamic-header'), 'value-1');

      const secondHeaders = fetchStub.secondCall.args[1]?.headers as Headers;
      assert.strictEqual(secondHeaders?.get('dynamic-header'), 'value-2');
    });

    it('handles dynamic header providers that return null', done => {
      // arrange
      const fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('test response', { status: 200 }));

      const dynamicProvider: DynamicHeaderProvider = {
        getHeader: sinon.stub().resolves(null)
      };

      const transport = new FetchTransport({
        ...testTransportParameters,
        dynamicHeaderProviders: [dynamicProvider]
      });

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'success');
          sinon.assert.calledOnceWithMatch(
            fetchStub,
            testTransportParameters.url,
            sinon.match({
              method: 'POST',
              body: testPayload
            }) as unknown as RequestInit
          );
          const actualHeaders = fetchStub.firstCall.args[1]?.headers as Headers;
          assert.strictEqual(actualHeaders?.get('foo'), 'foo-value');
          assert.strictEqual(actualHeaders?.get('bar'), 'bar-value');
          assert.strictEqual(
            actualHeaders?.get('Content-Type'),
            'application/json'
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
    });
  });
});
