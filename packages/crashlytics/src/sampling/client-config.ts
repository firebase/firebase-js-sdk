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

import { context, diag } from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import {
  CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS,
  CLIENT_CONFIG_FETCH_TIMEOUT_MS,
  CLIENT_CONFIG_MAX_REFRESH_INTERVAL_MS,
  CLIENT_CONFIG_MIN_REFRESH_INTERVAL_MS,
  CLIENT_CONFIG_REUSE_WINDOW_MS
} from '../constants';
import { isPageHidden } from './session-sampler';

/**
 * Operational telemetry configuration for a Firebase app, as served by the Firebase Telemetry
 * API's `GetClientConfig` RPC.
 *
 * @internal
 */
export interface ClientConfig {
  /** Whether telemetry collection is enabled for the app. */
  enabled: boolean;
  /**
   * Session sampling rate in `[0.0, 1.0]`. `0.0` pauses collection (nothing is exported). The
   * device applies it as served.
   */
  samplingRate: number;
}

/**
 * Configuration used when nothing has been fetched or cached yet: collect everything.
 *
 * @internal
 */
export const DEFAULT_CLIENT_CONFIG: ClientConfig = Object.freeze({
  enabled: true,
  samplingRate: 1.0
});

/** Enablement state enum values as serialized by the `ClientConfig` proto. */
const ENABLEMENT_STATE_DISABLED = 'TELEMETRY_ENABLEMENT_STATE_DISABLED';

/**
 * Returns `rate` if it is a valid session sampling rate in `[0.0, 1.0]`, otherwise `1.0`
 * (keep all sessions), matching what the backend does with an unset or out-of-range value.
 *
 * @internal
 */
export function normalizeSamplingRate(rate: unknown): number {
  const value = typeof rate === 'string' ? Number(rate) : rate;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return DEFAULT_CLIENT_CONFIG.samplingRate;
  }
  return value;
}

/**
 * Parses a `GetClientConfig` JSON response body into a {@link ClientConfig}.
 *
 * The response only contains `enablementState` and `samplingRate`. Unknown enablement states are
 * treated as enabled, and a missing or invalid sampling rate as `1.0`, mirroring the backend.
 *
 * @internal
 */
export function parseClientConfigResponse(body: unknown): ClientConfig {
  const response = (body ?? {}) as Record<string, unknown>;
  return {
    enabled: response['enablementState'] !== ENABLEMENT_STATE_DISABLED,
    samplingRate: normalizeSamplingRate(response['samplingRate'])
  };
}

/**
 * Returns how long a long-running page waits before re-fetching the configuration, given the
 * `Cache-Control` header of the last `GetClientConfig` response: its `max-age` plus
 * `stale-while-revalidate`.
 * @internal
 */
export function getRefreshIntervalMs(cacheControl: string | null): number {
  const directives = new Map<string, string>();
  for (const directive of (cacheControl ?? '').split(',')) {
    const [name, value = ''] = directive.trim().toLowerCase().split('=', 2);
    if (name) {
      directives.set(name, value.replace(/^"|"$/g, ''));
    }
  }
  const maxAgeSeconds = Number(directives.get('max-age'));
  if (
    directives.has('no-store') ||
    directives.has('no-cache') ||
    !(maxAgeSeconds > 0)
  ) {
    return CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS;
  }
  const staleSeconds = Number(directives.get('stale-while-revalidate'));
  const intervalMs =
    (maxAgeSeconds + (staleSeconds > 0 ? staleSeconds : 0)) * 1000;
  return Math.min(
    Math.max(intervalMs, CLIENT_CONFIG_MIN_REFRESH_INTERVAL_MS),
    CLIENT_CONFIG_MAX_REFRESH_INTERVAL_MS
  );
}

function isValidStoredConfig(value: unknown): value is ClientConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Record<string, unknown>;
  return (
    typeof config['enabled'] === 'boolean' &&
    typeof config['samplingRate'] === 'number'
  );
}

/**
 * Holds the client telemetry configuration for one Crashlytics instance.
 *
 * Lifecycle:
 * - **Cold start**: the last known configuration is loaded synchronously from `localStorage`. If
 *   there is none, {@link DEFAULT_CLIENT_CONFIG} is used so application startup is never delayed.
 * - **Background refresh**: {@link ClientConfigStore.start} issues a non-blocking fetch of
 *   `GetClientConfig`; when it returns, the in-memory configuration and the local cache are
 *   updated.
 * - **Refresh before the sampling decision**: a session's sampling decision, made at its first
 *   export, calls {@link ClientConfigStore.refreshIfStale} and waits briefly for it, so it uses the
 *   most recent configuration the server's caches allow.
 * - **Periodic refresh**: long-running pages re-fetch once the last response's cache lifetime has
 *   passed (`max-age` + `stale-while-revalidate`), but only while
 *   the page is visible. A page that is hidden when the refresh falls due re-fetches when it
 *   becomes visible again.
 *
 * Fetches go through the browser's HTTP cache (the default `fetch` cache mode), which honors the
 * server's `Cache-Control` and `Age` headers, so a fetch never returns a configuration older than
 * one cache lifetime (16 minutes by default) and repeated fetches are cheap.
 *
 * Fetch failures are swallowed: the
 * previous configuration stays in effect and telemetry continues to flow. They are not retried
 * early, because error responses are never cached and every retry would reach the backend.
 *
 * @internal
 */
export class ClientConfigStore {
  private _config: ClientConfig;
  private _started = false;
  private _latestRefresh?: Promise<void>;
  private _latestRefreshStartedAt = 0;
  private _refreshTimer?: ReturnType<typeof setTimeout>;
  private _nextRefreshAt = 0;

  /**
   * @param _url - Fully-qualified `GetClientConfig` URL, or `undefined` when the configuration
   *   cannot be fetched (e.g. missing app ID). In that case the store only ever serves the cached
   *   or default configuration.
   * @param _storageKey - `localStorage` key.
   */
  constructor(
    private readonly _url: string | undefined,
    private readonly _storageKey: string
  ) {
    this._config = this._loadFromStorage() ?? DEFAULT_CLIENT_CONFIG;
  }

  get config(): ClientConfig {
    return this._config;
  }

  get url(): string | undefined {
    return this._url;
  }

  /**
   * Kicks off the background fetch and periodic refreshes. Safe to call more than once; subsequent
   * calls are no-ops. Does nothing outside of a browser or when no URL is configured.
   */
  start(): void {
    if (this._started || !this._url || typeof window === 'undefined') {
      return;
    }
    this._started = true;
    if (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
    void this.refresh();
  }

  /** Stops periodic refreshes. */
  stop(): void {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    if (typeof document !== 'undefined') {
      document.removeEventListener(
        'visibilitychange',
        this._onVisibilityChange
      );
    }
    this._started = false;
  }

  /**
   * Returns the refresh started less than `reuseWindowMs` ago, whether it is still in flight,
   * succeeded or failed, or starts a new one. Never rejects.
   *
   * @param reuseWindowMs - Exposed for tests.
   */
  refreshIfStale(
    reuseWindowMs: number = CLIENT_CONFIG_REUSE_WINDOW_MS
  ): Promise<void> {
    if (
      this._latestRefresh &&
      Date.now() - this._latestRefreshStartedAt < reuseWindowMs
    ) {
      return this._latestRefresh;
    }
    return this.refresh();
  }

  /**
   * Fetches the latest configuration. Once the store is started, also schedules the next periodic refresh. Never rejects.
   */
  refresh(): Promise<void> {
    this._latestRefreshStartedAt = Date.now();
    const refresh = this._fetchAndStore().then(refreshIntervalMs => {
      if (this._started && this._latestRefresh === refresh) {
        this._scheduleRefresh(refreshIntervalMs);
      }
    });
    this._latestRefresh = refresh;
    return refresh;
  }

  /**
   * Schedules the next periodic refresh. If it falls due while the page is hidden, it is deferred
   * until the page becomes visible again (see `_onVisibilityChange`).
   */
  private _scheduleRefresh(delayMs: number): void {
    clearTimeout(this._refreshTimer);
    this._nextRefreshAt = Date.now() + delayMs;
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = undefined;
      if (!isPageHidden()) {
        void this.refreshIfStale();
      }
    }, delayMs);
  }

  /** Runs a periodic refresh that fell due while the page was hidden. */
  private readonly _onVisibilityChange = (): void => {
    if (!isPageHidden() && Date.now() >= this._nextRefreshAt) {
      void this.refreshIfStale();
    }
  };

  /**
   * Fetches `GetClientConfig` and, on success, updates the in-memory configuration and the local
   * cache. Resolves with the delay until the next periodic refresh. Never rejects.
   */
  private async _fetchAndStore(): Promise<number> {
    if (
      !this._url ||
      typeof window === 'undefined' ||
      typeof fetch !== 'function'
    ) {
      return CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS;
    }
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      CLIENT_CONFIG_FETCH_TIMEOUT_MS
    );
    try {
      const url = this._url;
      // Suppress tracing so the Fetch instrumentation does not record a span for this request.
      const response = await context.with(
        suppressTracing(context.active()),
        () =>
          fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            // No `cache` option: the browser's HTTP cache serves the response for as long as the
            // server's `Cache-Control` allows.
            headers: { Accept: 'application/json' },
            signal: abortController.signal
          })
      );
      if (!response.ok) {
        diag.debug(
          `Firebase Crashlytics: client config fetch failed with status ${response.status}`
        );
        return CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS;
      }
      const body: unknown = await response.json();
      this._config = parseClientConfigResponse(body);
      this._saveToStorage(this._config);
      return getRefreshIntervalMs(response.headers.get('Cache-Control'));
    } catch (error) {
      diag.debug('Firebase Crashlytics: client config fetch failed', error);
      return CLIENT_CONFIG_FALLBACK_REFRESH_INTERVAL_MS;
    } finally {
      clearTimeout(timeout);
    }
  }

  private _loadFromStorage(): ClientConfig | undefined {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) {
        return undefined;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isValidStoredConfig(parsed)) {
        return undefined;
      }
      return {
        enabled: parsed.enabled,
        samplingRate: normalizeSamplingRate(parsed.samplingRate)
      };
    } catch (e) {
      // Ignore errors accessing localStorage (e.g. security restrictions) or corrupt entries.
      return undefined;
    }
  }

  private _saveToStorage(config: ClientConfig): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(config));
    } catch (e) {
      // Ignore errors accessing localStorage (e.g. quota exceeded or security restrictions)
    }
  }
}
