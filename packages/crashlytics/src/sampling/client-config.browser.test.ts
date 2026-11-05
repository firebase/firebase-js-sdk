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
  CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS,
  CLIENT_CONFIG_MAX_REFRESH_INTERVAL_MS,
  CLIENT_CONFIG_MIN_REFRESH_INTERVAL_MS,
  CLIENT_CONFIG_REUSE_WINDOW_MS
} from '../constants';
import {
  ClientConfigStore,
  DEFAULT_CLIENT_CONFIG,
  getRefreshIntervalMs,
  normalizeSamplingRate,
  parseClientConfigResponse
} from './client-config';

const URL =
  'https://firebasetelemetry.googleapis.com/v1alpha/projects/123/locations/global/apps/1:123:web:abc/clientConfig';
const STORAGE_KEY = 'firebasecrashlytics.clientconfig:test';

/** The `Cache-Control` header the server sends by default. */
const DEFAULT_CACHE_CONTROL = 'public, max-age=900, stale-while-revalidate=60';
/** `max-age` + `stale-while-revalidate` of {@link DEFAULT_CACHE_CONTROL}. */
const DEFAULT_REFRESH_INTERVAL_MS = 960 * 1000;

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl?: string
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (cacheControl) {
    headers['Cache-Control'] = cacheControl;
  }
  return new Response(JSON.stringify(body), { status, headers });
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
    expect(
      parseClientConfigResponse({
        enablementState: 'TELEMETRY_ENABLEMENT_STATE_ENABLED',
        samplingRate: 0.25
      })
    ).toEqual({ enabled: true, samplingRate: 0.25 });
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

describe('getRefreshIntervalMs', () => {
  it('waits for max-age plus stale-while-revalidate', () => {
    expect(getRefreshIntervalMs(DEFAULT_CACHE_CONTROL)).toBe(
      DEFAULT_REFRESH_INTERVAL_MS
    );
    expect(getRefreshIntervalMs('max-age=300')).toBe(300 * 1000);
    expect(
      getRefreshIntervalMs(
        ' Public , MAX-AGE="120", Stale-While-Revalidate=30 '
      )
    ).toBe(150 * 1000);
  });

  it('falls back to the default interval when the response may not be cached', () => {
    for (const cacheControl of [
      null,
      '',
      'no-store',
      'public, max-age=0',
      'max-age=900, no-cache',
      's-maxage=900',
      'max-age=abc'
    ]) {
      expect(getRefreshIntervalMs(cacheControl)).toBe(
        CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS
      );
    }
  });

  it('clamps the interval', () => {
    expect(getRefreshIntervalMs('max-age=1')).toBe(
      CLIENT_CONFIG_MIN_REFRESH_INTERVAL_MS
    );
    expect(getRefreshIntervalMs('max-age=31536000')).toBe(
      CLIENT_CONFIG_MAX_REFRESH_INTERVAL_MS
    );
  });
});

describe('ClientConfigStore', () => {
  let fetchStub: ReturnType<typeof vi.fn>;
  const stores: ClientConfigStore[] = [];

  /** Creates a store for {@link URL} that is stopped after the test. */
  function createStore(): ClientConfigStore {
    const store = new ClientConfigStore(URL, STORAGE_KEY);
    stores.push(store);
    return store;
  }

  /** Answers every fetch with a fresh copy of the given response. */
  function respondWith(
    body: unknown,
    cacheControl: string = DEFAULT_CACHE_CONTROL
  ): void {
    fetchStub.mockImplementation(() =>
      Promise.resolve(jsonResponse(body, 200, cacheControl))
    );
  }

  beforeEach(() => {
    localStorage.clear();
    fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
  });

  afterEach(() => {
    stores.splice(0).forEach(store => store.stop());
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('starts with the default config when nothing is cached', () => {
    expect(createStore().config).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  it('loads a cached config from localStorage synchronously', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: false, samplingRate: 0.3 })
    );
    expect(createStore().config).toEqual({ enabled: false, samplingRate: 0.3 });
  });

  it('ignores corrupt or out-of-range cached configs', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(createStore().config).toEqual(DEFAULT_CLIENT_CONFIG);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ samplingRate: 0.5 }));
    expect(createStore().config).toEqual(DEFAULT_CLIENT_CONFIG);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: true, samplingRate: 5 })
    );
    expect(createStore().config.samplingRate).toBe(1);
  });

  it('fetches the config with an unauthenticated GET through the HTTP cache and caches the result', async () => {
    respondWith({
      enablementState: 'TELEMETRY_ENABLEMENT_STATE_ENABLED',
      samplingRate: 0.2
    });
    const store = createStore();
    store.start();
    await store.refreshIfStale();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub.mock.calls[0][0]).toBe(URL);
    const init = fetchStub.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('omit');
    expect(init.mode).toBe('cors');
    // The default cache mode lets the browser's HTTP cache honor the server's Cache-Control.
    expect(init.cache).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>)['Accept']).toBe(
      'application/json'
    );
    expect(init.body).toBeUndefined();

    expect(store.config).toEqual({ enabled: true, samplingRate: 0.2 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      enabled: true,
      samplingRate: 0.2
    });
  });

  it('keeps the previous config when the fetch fails', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: true, samplingRate: 0.4 })
    );
    fetchStub.mockRejectedValue(new TypeError('network down'));
    const store = createStore();
    store.start();
    await expect(store.refreshIfStale()).resolves.toBeUndefined();
    expect(store.config.samplingRate).toBe(0.4);
  });

  it('keeps the previous config on a non-2xx response', async () => {
    fetchStub.mockResolvedValue(jsonResponse({ error: {} }, 404));
    const store = createStore();
    store.start();
    await store.refreshIfStale();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the previous config on a malformed body', async () => {
    fetchStub.mockResolvedValue(new Response('not json', { status: 200 }));
    const store = createStore();
    store.start();
    await store.refreshIfStale();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  it('does not fetch when no URL is configured', async () => {
    const store = new ClientConfigStore(undefined, STORAGE_KEY);
    stores.push(store);
    store.start();
    await store.refreshIfStale();
    expect(fetchStub).not.toHaveBeenCalled();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
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
    const store = createStore();
    store.start();
    const refresh = store.refreshIfStale();
    await vi.advanceTimersByTimeAsync(5000);
    await expect(refresh).resolves.toBeUndefined();
    expect(store.config).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  describe('refreshIfStale', () => {
    it('reuses a refresh started within the reuse window, then fetches again', async () => {
      vi.useFakeTimers();
      respondWith({ samplingRate: 0.5 });
      const store = createStore();
      store.start();
      const startupRefresh = store.refreshIfStale();
      await startupRefresh;
      expect(store.refreshIfStale()).toBe(startupRefresh);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(CLIENT_CONFIG_REUSE_WINDOW_MS);
      await store.refreshIfStale();
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('reuses a failed refresh instead of retrying it', async () => {
      fetchStub.mockRejectedValue(new TypeError('network down'));
      const store = createStore();
      store.start();
      await store.refreshIfStale();
      await store.refreshIfStale();
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('fetches even if the store was not started', async () => {
      respondWith({ samplingRate: 0.3 });
      const store = createStore();
      await store.refreshIfStale();
      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(store.config.samplingRate).toBe(0.3);
    });
  });

  describe('periodic refresh', () => {
    it("is idempotent on start() and refreshes after each response's cache lifetime", async () => {
      vi.useFakeTimers();
      respondWith({ samplingRate: 0.5 });
      const store = createStore();
      store.start();
      store.start();
      await store.refreshIfStale();
      expect(fetchStub).toHaveBeenCalledTimes(1);

      // Later responses ask for a shorter cache lifetime; each refresh follows the latest one.
      respondWith({ samplingRate: 0.5 }, 'public, max-age=120');
      await vi.advanceTimersByTimeAsync(DEFAULT_REFRESH_INTERVAL_MS - 1);
      expect(fetchStub).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchStub).toHaveBeenCalledTimes(2);

      await store.refreshIfStale();
      await vi.advanceTimersByTimeAsync(120 * 1000 - 1);
      expect(fetchStub).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchStub).toHaveBeenCalledTimes(3);

      store.stop();
      await vi.advanceTimersByTimeAsync(CLIENT_CONFIG_MAX_REFRESH_INTERVAL_MS);
      expect(fetchStub).toHaveBeenCalledTimes(3);
    });

    it('falls back to the default interval when the response may not be cached', async () => {
      vi.useFakeTimers();
      respondWith({ samplingRate: 0.5 }, 'no-store');
      const store = createStore();
      store.start();
      await store.refreshIfStale();

      await vi.advanceTimersByTimeAsync(
        CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS - 1
      );
      expect(fetchStub).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('does not retry a failed fetch before the default interval', async () => {
      vi.useFakeTimers();
      fetchStub.mockRejectedValue(new TypeError('network down'));
      const store = createStore();
      store.start();
      await store.refreshIfStale();

      await vi.advanceTimersByTimeAsync(
        CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS - 1
      );
      expect(fetchStub).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('defers a refresh that falls due while the page is hidden until it is visible again', async () => {
      vi.useFakeTimers();
      respondWith({ samplingRate: 0.5 });
      const store = createStore();
      store.start();
      await store.refreshIfStale();

      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      await vi.advanceTimersByTimeAsync(DEFAULT_REFRESH_INTERVAL_MS);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      visibility.mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('does not refresh when the page becomes visible before the refresh is due', async () => {
      vi.useFakeTimers();
      respondWith({ samplingRate: 0.5 });
      const store = createStore();
      store.start();
      await store.refreshIfStale();

      await vi.advanceTimersByTimeAsync(CLIENT_CONFIG_REUSE_WINDOW_MS);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('stops listening for visibility changes when stopped', async () => {
      vi.useFakeTimers();
      respondWith({ samplingRate: 0.5 });
      const store = createStore();
      store.start();
      await store.refreshIfStale();
      store.stop();

      await vi.advanceTimersByTimeAsync(DEFAULT_REFRESH_INTERVAL_MS);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
  });
});
