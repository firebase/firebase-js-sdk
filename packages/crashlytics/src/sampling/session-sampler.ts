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

import { AttributesStore } from '../attributes-store';
import {
  ATTR_KEY_SESSION_SAMPLING_RATE,
  CLIENT_CONFIG_INITIAL_WAIT_MS,
  SESSION_SAMPLING_HASH_BUCKETS
} from '../constants';
import { isPageHidden } from '../helpers';
import type { ClientConfig, ClientConfigStore } from './client-config';
import { isTelemetryDebugEnabled } from './debug-override';
import { murmurHash3 } from './murmurhash3';

/**
 * The sampling decision for one session.
 *
 * @internal
 */
export interface SamplingDecision {
  /** The session the decision was made for, or `undefined` if no session ID was available. */
  sessionId: string | undefined;
  /** Whether telemetry for this session is exported. */
  sampled: boolean;
  /**
   * The sampling rate the decision was made with, stamped on every exported log record and span
   * as `session.sampling.rate`. Always in `(0.0, 1.0]` for sampled sessions.
   */
  samplingRate: number;
}

/**
 * Deterministic session sampling decision shared with the backend:
 * `((MurmurHash3_32(session.id) % 10000) / 10000.0) < rate`.
 *
 * The backend re-evaluates exactly this expression when the configured rate is lowered after a
 * session was sampled, so sessions kept on the device are kept consistently on the server.
 *
 * @internal
 */
export function isSessionSampled(sessionId: string, rate: number): boolean {
  const bucket = murmurHash3(sessionId) % SESSION_SAMPLING_HASH_BUCKETS;
  return bucket / SESSION_SAMPLING_HASH_BUCKETS < rate;
}

/**
 * Makes and remembers the session sampling decision for a Crashlytics instance.
 *
 * - The decision is made lazily, at the first telemetry export attempt of the session (not at
 *   session creation), right after refreshing the configuration, so the most recent sampling rate
 *   is used.
 * - A session is either kept completely or discarded completely. Once made, the decision (and the
 *   rate it was made with) is fixed for the rest of the session and persisted in `sessionStorage`
 *   so page reloads within the session do not flip it. Rate changes apply to new sessions only;
 *   downward changes are additionally enforced immediately by the backend.
 * - The telemetry debug override (see {@link isTelemetryDebugEnabled}) forces the session to be
 *   sampled on the device with a stamped rate of `1.0`.
 *
 * @internal
 */
export class SessionSampler {
  private _decision?: SamplingDecision;

  /**
   * @param _storageKey - `sessionStorage` key under which the decision is persisted. It must be
   *   specific to the app and region: the session ID is shared by every app on the page, but each
   *   app makes its own decision from its own configuration.
   * @param _initialWaitMs - Maximum time the first decision waits for the config refresh. Exposed
   *   for tests.
   */
  constructor(
    private readonly _configStore: ClientConfigStore,
    private readonly _attributesStore: AttributesStore,
    private readonly _storageKey: string,
    private readonly _initialWaitMs = CLIENT_CONFIG_INITIAL_WAIT_MS
  ) {}

  /**
   * Returns the decision for the current session, computing it on first use.
   *
   * Before the first decision this refreshes the configuration (reusing a refresh started within
   * the last minute, see {@link ClientConfigStore.refreshIfStale}) and waits for it, bounded by
   * `initialWaitMs`, so the decision uses the most recent sampling rate the server's caches allow.
   * If the refresh is slow or fails, the configuration already in memory (cached or default) is
   * used. It does not refresh or wait when:
   * - the telemetry debug override is active
   * - the page is hidden. Exports issued while the page is hidden are typically the unload flush
   *   (`visibilitychange`/`pagehide`), whose `keepalive` request must be started before the
   *   document is frozen or discarded, so it cannot be held back behind a timer. An export that is
   *   already waiting when the page becomes hidden is released immediately for the same reason.
   */
  async getDecision(): Promise<SamplingDecision> {
    const cached = this._cachedDecision();
    if (cached) {
      return cached;
    }
    if (!isTelemetryDebugEnabled() && !isPageHidden()) {
      await this._waitForConfigRefresh();
    }
    return this.decide();
  }

  /**
   * Synchronously returns the decision for the current session, computing it from the
   * configuration currently in effect if none has been made yet.
   */
  decide(): SamplingDecision {
    const cached = this._cachedDecision();
    if (cached) {
      return cached;
    }
    const decision = this._computeDecision(
      this._attributesStore.sessionId,
      this._configStore.config
    );
    this._decision = decision;
    this._persistDecision(decision);
    return decision;
  }

  /**
   * Applies the session's sampling decision to a batch of log records or spans about to be
   * exported. Waits for the decision (see {@link SessionSampler.getDecision}); if the session is
   * sampled, stamps `session.sampling.rate` on every record and resolves to `true`. Otherwise
   * resolves to `false`, and the caller must drop the batch without sending it.
   *
   * Shared by the log and trace exporters, so both apply the decision at export time the same way.
   */
  async applySampling(
    records: ReadonlyArray<{ readonly attributes: object }>
  ): Promise<boolean> {
    const decision = await this.getDecision();
    if (!decision.sampled) {
      return false;
    }
    for (const record of records) {
      Object.assign(record.attributes, {
        [ATTR_KEY_SESSION_SAMPLING_RATE]: decision.samplingRate
      });
    }
    return true;
  }

  /**
   * Refreshes the configuration if needed and resolves when the refresh settles, `initialWaitMs`
   * elapses, or the page becomes hidden / is being unloaded, whichever happens first.
   */
  private async _waitForConfigRefresh(): Promise<void> {
    let release!: () => void;
    const released = new Promise<void>(resolve => {
      release = resolve;
    });
    const onVisibilityChange = (): void => {
      if (isPageHidden()) {
        release();
      }
    };
    const hasDom =
      typeof window !== 'undefined' && typeof document !== 'undefined';
    const timer = setTimeout(release, this._initialWaitMs);
    if (hasDom) {
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', release);
    }
    try {
      await Promise.race([this._configStore.refreshIfStale(), released]);
    } finally {
      clearTimeout(timer);
      if (hasDom) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', release);
      }
    }
  }

  private _computeDecision(
    sessionId: string | undefined,
    config: ClientConfig
  ): SamplingDecision {
    if (isTelemetryDebugEnabled()) {
      return { sessionId, sampled: true, samplingRate: 1.0 };
    }

    const sampled =
      !!sessionId && isSessionSampled(sessionId, config.samplingRate);
    return { sessionId, sampled, samplingRate: config.samplingRate };
  }

  /**
   * Returns the current session's decision from memory or `sessionStorage`, if one was made. An
   * unsampled decision is skipped while the debug override is on, so the session becomes sampled
   * and stays that way.
   */
  private _cachedDecision(): SamplingDecision | undefined {
    const sessionId = this._attributesStore.sessionId;
    if (this._decision && this._decision.sessionId === sessionId) {
      if (this._decision.sampled || !isTelemetryDebugEnabled()) {
        return this._decision;
      }
    }
    // Not in memory yet (e.g. the page was reloaded): use the decision saved for this session.
    const persisted = this._loadPersistedDecision();
    if (persisted && persisted.sessionId === sessionId && sessionId) {
      if (persisted.sampled || !isTelemetryDebugEnabled()) {
        this._decision = persisted;
        return persisted;
      }
    }
    this._decision = undefined;
    return undefined;
  }

  private _loadPersistedDecision(): SamplingDecision | undefined {
    try {
      const raw = sessionStorage.getItem(this._storageKey);
      // Only the SDK writes this entry, so the stored decision is used as-is.
      return raw ? (JSON.parse(raw) as SamplingDecision) : undefined;
    } catch (e) {
      // sessionStorage is unavailable (e.g. outside a browser or blocked) or the entry is corrupt.
      return undefined;
    }
  }

  private _persistDecision(decision: SamplingDecision): void {
    if (!decision.sessionId) {
      return;
    }
    try {
      sessionStorage.setItem(this._storageKey, JSON.stringify(decision));
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}
