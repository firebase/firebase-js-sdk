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
import { DynamicHeaderProvider } from './types';
import { FetchTransport } from './fetch-transport';
import { KEEPALIVE_MAX_PAYLOAD_SIZE } from './constants';
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
    vi.restoreAllMocks();
  });

  describe('send', () => {
    it('returns success when request succeeds', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));
      const transport = new FetchTransport(testTransportParameters);

      // act
      const response = await transport.send(testPayload, requestTimeout);

      // assert
      expect(response.status).toBe('success');
      // currently we don't do anything with the response yet, so it's dropped by the transport.
      expect((response as ExportResponseSuccess).data).toBeUndefined();
      expect(fetchStub).toHaveBeenCalledOnce();
      expect(fetchStub).toHaveBeenCalledWith(
        testTransportParameters.url,
        expect.objectContaining({
          method: 'POST',
          body: testPayload
        })
      );
      const sentHeaders = fetchStub.mock.calls[0][1]?.headers as Headers;
      expect(sentHeaders?.get('foo')).toBe('foo-value');
      expect(sentHeaders?.get('bar')).toBe('bar-value');
      expect(sentHeaders?.get('content-type')).toBe('application/json');
    });

    it('returns failure when request fails', async () => {
      // arrange
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('', { status: 404 })
      );
      const transport = new FetchTransport(testTransportParameters);

      // act
      const response = await transport.send(testPayload, requestTimeout);

      // assert
      expect(response.status).toBe('failure');
    });

    it('returns retryable when request is retryable', async () => {
      // arrange
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('', { status: 503, headers: { 'Retry-After': '5' } })
      );
      const transport = new FetchTransport(testTransportParameters);

      // act
      const response = await transport.send(testPayload, requestTimeout);

      // assert
      expect(response.status).toBe('retryable');
      expect((response as ExportResponseRetryable).retryInMillis).toBe(5000);
    });

    it('returns failure when request times out', async () => {
      // arrange
      const abortError = new Error('aborted request');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);
      vi.useFakeTimers();
      const transport = new FetchTransport(testTransportParameters);

      // act
      const sendPromise = transport.send(testPayload, requestTimeout);
      vi.advanceTimersByTime(requestTimeout + 100);
      const response = await sendPromise;

      // assert
      expect(response.status).toBe('failure');
      expect((response as ExportResponseFailure).error.message).toBe(
        'aborted request'
      );
    });

    it('returns failure when no server exists', async () => {
      // arrange
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw new Error('fetch failed');
      });
      vi.useFakeTimers();
      const transport = new FetchTransport(testTransportParameters);

      // act
      const sendPromise = transport.send(testPayload, requestTimeout);
      vi.advanceTimersByTime(requestTimeout + 100);
      const response = await sendPromise;

      // assert
      expect(response.status).toBe('failure');
      expect((response as ExportResponseFailure).error.message).toBe(
        'fetch failed'
      );
    });

    it('attaches static and dynamic headers to the request', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));

      const dynamicProvider: DynamicHeaderProvider = {
        getHeader: vi
          .fn()
          .mockResolvedValue(['dynamic-header', 'dynamic-value'])
      };

      const transport = new FetchTransport({
        ...testTransportParameters,
        dynamicHeaderProviders: [dynamicProvider]
      });

      // act
      const response = await transport.send(testPayload, requestTimeout);

      // assert
      expect(response.status).toBe('success');
      expect(fetchStub).toHaveBeenCalledOnce();
      expect(fetchStub).toHaveBeenCalledWith(
        testTransportParameters.url,
        expect.objectContaining({
          method: 'POST',
          body: testPayload
        })
      );
      const sentHeaders = fetchStub.mock.calls[0][1]?.headers as Headers;
      expect(sentHeaders?.get('foo')).toBe('foo-value');
      expect(sentHeaders?.get('bar')).toBe('bar-value');
      expect(sentHeaders?.get('content-type')).toBe('application/json');
      expect(sentHeaders?.get('dynamic-header')).toBe('dynamic-value');
    });

    it('does not accumulate dynamic headers across multiple send calls', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));

      let counter = 1;
      const dynamicProvider: DynamicHeaderProvider = {
        getHeader: vi
          .fn()
          .mockImplementation(() =>
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
      expect(fetchStub).toHaveBeenCalledTimes(2);

      const firstHeaders = fetchStub.mock.calls[0][1]?.headers as Headers;
      expect(firstHeaders?.get('dynamic-header')).toBe('value-1');

      const secondHeaders = fetchStub.mock.calls[1][1]?.headers as Headers;
      expect(secondHeaders?.get('dynamic-header')).toBe('value-2');
    });

    it('handles dynamic header providers that return null', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));

      const dynamicProvider: DynamicHeaderProvider = {
        getHeader: vi.fn().mockResolvedValue(null)
      };

      const transport = new FetchTransport({
        ...testTransportParameters,
        dynamicHeaderProviders: [dynamicProvider]
      });

      // act
      const response = await transport.send(testPayload, requestTimeout);

      // assert
      expect(response.status).toBe('success');
      expect(fetchStub).toHaveBeenCalledOnce();
      expect(fetchStub).toHaveBeenCalledWith(
        testTransportParameters.url,
        expect.objectContaining({
          method: 'POST',
          body: testPayload
        })
      );
      const sentHeaders = fetchStub.mock.calls[0][1]?.headers as Headers;
      expect(sentHeaders?.get('foo')).toBe('foo-value');
      expect(sentHeaders?.get('bar')).toBe('bar-value');
      expect(sentHeaders?.get('content-type')).toBe('application/json');
    });

    it('continues sending telemetry when a dynamic header provider rejects or throws', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));

      const rejectingProvider: DynamicHeaderProvider = {
        getHeader: vi.fn().mockRejectedValue(new Error('App Check token error'))
      };
      const throwingProvider: DynamicHeaderProvider = {
        getHeader: vi.fn().mockImplementation(() => {
          throw new Error('Sync provider error');
        })
      };
      const succeedingProvider: DynamicHeaderProvider = {
        getHeader: vi
          .fn()
          .mockResolvedValue(['dynamic-header', 'dynamic-value'])
      };

      const transport = new FetchTransport({
        ...testTransportParameters,
        dynamicHeaderProviders: [
          rejectingProvider,
          throwingProvider,
          succeedingProvider
        ]
      });

      // act
      const response = await transport.send(testPayload, requestTimeout);

      // assert
      expect(response.status).toBe('success');
      expect(fetchStub).toHaveBeenCalledOnce();
      const sentHeaders = fetchStub.mock.calls[0][1]?.headers as Headers;
      expect(sentHeaders?.get('foo')).toBe('foo-value');
      expect(sentHeaders?.get('dynamic-header')).toBe('dynamic-value');
    });

    it('sets keepalive: true when payload is within the safe limit', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));
      const transport = new FetchTransport(testTransportParameters);
      const smallPayload = new Uint8Array(KEEPALIVE_MAX_PAYLOAD_SIZE - 100);

      // act
      await transport.send(smallPayload, requestTimeout);

      // assert
      expect(fetchStub).toHaveBeenCalledOnce();
      expect(fetchStub).toHaveBeenCalledWith(
        testTransportParameters.url,
        expect.objectContaining({
          keepalive: true
        })
      );
    });

    it('sets keepalive: false when payload is over the safe limit', async () => {
      // arrange
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));
      const transport = new FetchTransport(testTransportParameters);
      const largePayload = new Uint8Array(KEEPALIVE_MAX_PAYLOAD_SIZE + 100);

      // act
      await transport.send(largePayload, requestTimeout);

      // assert
      expect(fetchStub).toHaveBeenCalledOnce();
      expect(fetchStub).toHaveBeenCalledWith(
        testTransportParameters.url,
        expect.objectContaining({
          keepalive: false
        })
      );
    });
  });
});
