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
  CLIENT_CONFIG_FETCH_TIMEOUT_MS,
  CLIENT_CONFIG_REFRESH_INTERVAL_MS
} from '../constants';

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
   * Session sampling rate in `[0.0, 1.0]`. `0.0` pauses collection (nothing is exported). This is
   * the effective rate to apply on the device; the backend already folds in any system-level
   * surge protection before serving it.
   */
  samplingRate: number;
  /** Epoch milliseconds at which this configuration was fetched, if it came from the network. */
  fetchTime?: number;
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
export function parseClientConfigResponse(
  body: unknown,
  fetchTime: number = Date.now()
): ClientConfig {
  const response = (body ?? {}) as Record<string, unknown>;
  return {
    enabled: response['enablementState'] !== ENABLEMENT_STATE_DISABLED,
    samplingRate: normalizeSamplingRate(response['samplingRate']),
    fetchTime
  };
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
 * Lifecycle (see go/firebase-telemetry-sampling-proposal):
 * - **Cold start**: the last known configuration is loaded synchronously from `localStorage`. If
 *   there is none, {@link DEFAULT_CLIENT_CONFIG} is used so application startup is never delayed.
 * - **Background refresh**: {@link ClientConfigStore.start} issues a non-blocking fetch of
 *   `GetClientConfig`; when it returns, the in-memory configuration and the local cache are
 *   updated.
 * - **Periodic polling**: long-running pages re-fetch every 15 minutes to pick up developer rate
 *   changes. The response is edge-cached by GFE with the same TTL, so the request is cheap.
 *
 * Fetch failures (network errors, timeouts, non-2xx responses, malformed bodies) are swallowed:
 * the previous configuration stays in effect and telemetry continues to flow.
 *
 * @internal
 */
export class ClientConfigStore {
  private _config: ClientConfig;
  private _initialFetch?: Promise<void>;
  private _refreshTimer?: ReturnType<typeof setInterval>;
  private _started = false;

  /**
   * @param _url - Fully-qualified `GetClientConfig` URL, or `undefined` when the configuration
   *   cannot be fetched (e.g. missing project or app ID). In that case the store only ever serves
   *   the cached or default configuration.
   * @param _storageKey - `localStorage` key under which the configuration is cached.
   * @param _refreshIntervalMs - Polling interval. Exposed for tests.
   */
  constructor(
    private readonly _url: string | undefined,
    private readonly _storageKey: string,
    private readonly _refreshIntervalMs = CLIENT_CONFIG_REFRESH_INTERVAL_MS
  ) {
    this._config = this._loadFromStorage() ?? DEFAULT_CLIENT_CONFIG;
  }

  /** The configuration currently in effect. */
  get config(): ClientConfig {
    return this._config;
  }

  /** The `GetClientConfig` URL this store fetches from, if any. */
  get url(): string | undefined {
    return this._url;
  }

  /**
   * Kicks off the initial background fetch and schedules periodic refreshes. Safe to call more
   * than once; subsequent calls are no-ops. Does nothing outside of a browser or when no URL is
   * configured.
   */
  start(): void {
    if (this._started || !this._url || typeof window === 'undefined') {
      return;
    }
    this._started = true;
    this._initialFetch = this.refresh();
    this._refreshTimer = setInterval(() => {
      void this.refresh();
    }, this._refreshIntervalMs);
  }

  /** Stops periodic refreshes. */
  stop(): void {
    if (this._refreshTimer !== undefined) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = undefined;
    }
    this._started = false;
  }

  /**
   * Resolves once the initial fetch started by {@link start} has settled (successfully or not).
   * Resolves immediately if no fetch was started.
   */
  whenReady(): Promise<void> {
    return this._initialFetch ?? Promise.resolve();
  }

  /**
   * Fetches the latest configuration and, on success, updates the in-memory value and the local
   * cache. Never rejects.
   */
  async refresh(): Promise<void> {
    if (!this._url || typeof fetch !== 'function') {
      return;
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
            headers: { Accept: 'application/json' },
            signal: abortController.signal
          })
      );
      if (!response.ok) {
        diag.debug(
          `Firebase Crashlytics: client config fetch failed with status ${response.status}`
        );
        return;
      }
      const body: unknown = await response.json();
      this._config = parseClientConfigResponse(body);
      this._saveToStorage(this._config);
    } catch (error) {
      diag.debug('Firebase Crashlytics: client config fetch failed', error);
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
        samplingRate: normalizeSamplingRate(parsed.samplingRate),
        fetchTime:
          typeof parsed.fetchTime === 'number' ? parsed.fetchTime : undefined
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
