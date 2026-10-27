/**
 * @license
 * Copyright 2026 Google LLC
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
  ClientConfigStore,
  DEFAULT_CLIENT_CONFIG,
  normalizeSamplingRate,
  parseClientConfigResponse
} from './client-config';

const URL =
  'https://firebasetelemetry.googleapis.com/v1alpha/projects/p/locations/global/apps/a/clientConfig';
const STORAGE_KEY = 'firebasecrashlytics.clientconfig:test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('normalizeSamplingRate', () => {
  it('returns valid rates unchanged', () => {
    expect(normalizeSamplingRate(0)).toBe(0);
    expect(normalizeSamplingRate(0.25)).toBe(0.25);
    expect(normalizeSamplingRate(1)).toBe(1);
  });

  it('accepts numeric strings', () => {
    expect(normalizeSamplingRate('0.5')).toBe(0.5);
  });

  it('falls back to 1.0 for missing or invalid values', () => {
    expect(normalizeSamplingRate(undefined)).toBe(1);
    expect(normalizeSamplingRate(null)).toBe(1);
    expect(normalizeSamplingRate(-0.1)).toBe(1);
    expect(normalizeSamplingRate(1.5)).toBe(1);
    expect(normalizeSamplingRate(NaN)).toBe(1);
    expect(normalizeSamplingRate(Infinity)).toBe(1);
    expect(normalizeSamplingRate('abc')).toBe(1);
    expect(normalizeSamplingRate({})).toBe(1);
  });
});

describe('parseClientConfigResponse', () => {
  it('parses an enabled config with a sampling rate', () => {
    const config = parseClientConfigResponse(
      {
        enablementState: 'TELEMETRY_ENABLEMENT_STATE_ENABLED',
        samplingRate: 0.25
      },
      123
    );
    expect(config).toEqual({ enabled: true, samplingRate: 0.25, fetchTime: 123 });
  });

  it('parses a disabled config', () => {
    const config = parseClientConfigResponse({
      enablementState: 'TELEMETRY_ENABLEMENT_STATE_DISABLED',
      samplingRate: 1
    });
    expect(config.enabled).toBe(false);
  });

  it('keeps an explicit 0.0 (paused) sampling rate', () => {
    expect(
      parseClientConfigResponse({
        enablementState: 'TELEMETRY_ENABLEMENT_STATE_ENABLED',
        samplingRate: 0
      }).samplingRate
    ).toBe(0);
  });

  it('treats unknown enablement states and missing rates as enabled / 1.0', () => {
    expect(parseClientConfigResponse({})).toMatchObject({
      enabled: true,
      samplingRate: 1
    });
    expect(parseClientConfigResponse(null)).toMatchObject({
      enabled: true,
      samplingRate: 1
    });
    expect(
      parseClientConfigResponse({
        enablementState: 'TELEMETRY_ENABLEMENT_STATE_UNSPECIFIED',
        samplingRate: 7
      })
    ).toMatchObject({ enabled: true, samplingRate: 1 });
  });
});

describe('ClientConfigStore', () => {
  let fetchStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('starts with the default config when nothing is cached', () => {
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  it('loads a cached config from localStorage synchronously', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: false, samplingRate: 0.3, fetchTime: 42 })
    );
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    expect(store.config).toEqual({
      enabled: false,
      samplingRate: 0.3,
      fetchTime: 42
    });
  });

  it('ignores corrupt or out-of-range cached configs', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(new ClientConfigStore(URL, STORAGE_KEY).config).toEqual(
      DEFAULT_CLIENT_CONFIG
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ samplingRate: 0.5 }));
    expect(new ClientConfigStore(URL, STORAGE_KEY).config).toEqual(
      DEFAULT_CLIENT_CONFIG
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: true, samplingRate: 5 })
    );
    expect(new ClientConfigStore(URL, STORAGE_KEY).config.samplingRate).toBe(1);
  });

  it('fetches the config with an unauthenticated GET and caches the result', async () => {
    fetchStub.mockResolvedValue(
      jsonResponse({
        enablementState: 'TELEMETRY_ENABLEMENT_STATE_ENABLED',
        samplingRate: 0.2
      })
    );
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    store.start();
    await store.whenReady();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub.mock.calls[0][0]).toBe(URL);
    const init = fetchStub.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('omit');
    expect(init.mode).toBe('cors');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>)['Accept']).toBe(
      'application/json'
    );
    expect(init.body).toBeUndefined();

    expect(store.config.enabled).toBe(true);
    expect(store.config.samplingRate).toBe(0.2);
    expect(store.config.fetchTime).toEqual(expect.any(Number));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      enabled: true,
      samplingRate: 0.2
    });
    store.stop();
  });

  it('keeps the previous config when the fetch fails', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: true, samplingRate: 0.4 })
    );
    fetchStub.mockRejectedValue(new TypeError('network down'));
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    store.start();
    await expect(store.whenReady()).resolves.toBeUndefined();
    expect(store.config.samplingRate).toBe(0.4);
    store.stop();
  });

  it('keeps the previous config on a non-2xx response', async () => {
    fetchStub.mockResolvedValue(jsonResponse({ error: {} }, 404));
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    store.start();
    await store.whenReady();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    store.stop();
  });

  it('keeps the previous config on a malformed body', async () => {
    fetchStub.mockResolvedValue(new Response('not json', { status: 200 }));
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    store.start();
    await store.whenReady();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
    store.stop();
  });

  it('does not fetch when no URL is configured', async () => {
    const store = new ClientConfigStore(undefined, STORAGE_KEY);
    store.start();
    await store.whenReady();
    expect(fetchStub).not.toHaveBeenCalled();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  it('is idempotent on start() and refreshes periodically until stopped', async () => {
    vi.useFakeTimers();
    fetchStub.mockResolvedValue(
      jsonResponse({
        enablementState: 'TELEMETRY_ENABLEMENT_STATE_ENABLED',
        samplingRate: 0.5
      })
    );
    const store = new ClientConfigStore(URL, STORAGE_KEY, 1000);
    store.start();
    store.start();
    expect(fetchStub).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchStub).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchStub).toHaveBeenCalledTimes(3);

    store.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchStub).toHaveBeenCalledTimes(3);
  });

  it('aborts a fetch that exceeds the timeout', async () => {
    vi.useFakeTimers();
    fetchStub.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    store.start();
    await vi.advanceTimersByTimeAsync(5000);
    await expect(store.whenReady()).resolves.toBeUndefined();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
    store.stop();
  });
});
