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
import { DynamicHeaderProvider } from '../types';
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
            {
              method: 'POST',
              headers: new Headers({
                foo: 'foo-value',
                bar: 'bar-value',
                'Content-Type': 'application/json'
              }),
              body: testPayload
            }
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
        dynamicHeaders: [dynamicProvider]
      });

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'success');
          sinon.assert.calledOnceWithMatch(
            fetchStub,
            testTransportParameters.url,
            {
              method: 'POST',
              headers: new Headers({
                foo: 'foo-value',
                bar: 'bar-value',
                'Content-Type': 'application/json',
                'dynamic-header': 'dynamic-value'
              }),
              body: testPayload
            }
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
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
        dynamicHeaders: [dynamicProvider]
      });

      //act
      transport.send(testPayload, requestTimeout).then(response => {
        // assert
        try {
          assert.strictEqual(response.status, 'success');
          sinon.assert.calledOnceWithMatch(
            fetchStub,
            testTransportParameters.url,
            {
              method: 'POST',
              headers: testTransportParameters.headers,
              body: testPayload
            }
          );
          done();
        } catch (e) {
          done(e);
        }
      }, done /* catch any rejections */);
    });
  });
});
