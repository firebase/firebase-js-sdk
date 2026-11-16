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
  ATTR_KEY_SESSION_SAMPLING_FORCED,
  ATTR_KEY_SESSION_SAMPLING_RATE,
  SESSION_SAMPLING_HASH_BUCKETS
} from '../constants';
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
   * as `session.sampling.rate`. Always in `0.0, 1.0]` for sampled sessions.
   */
  samplingRate: number;
  /**
   * Whether the telemetry debug override forced the session to be sampled (at `1.0`). Stamped on
   * every exported log record and span as `session.sampling.forced = true`.
   */
  forced?: boolean;
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
 * - The decision is made lazily, at the first telemetry export of the session: it uses the configuration in memory, which is the latest one fetched, else the cached
 *   one, else the default.
 * - A session is either kept completely or discarded completely. Once made, the decision is fixed for the rest of the session and persisted in `sessionStorage`
 *   so page reloads within the session do not flip it. Rate increases apply to new sessions only;
 *   rate decreases are enforced immediately by the backend.
 * - The telemetry debug override (see {@link isTelemetryDebugEnabled}) is the one exception: from
 *   the next export after it is turned on, even mid-session, the session is sampled with a stamped
 *   rate of `1.0` and `session.sampling.forced = true`, so the server does not re-sample it.
 *   The session keeps this debug decision even if the override is turned off later. The override
 *   applies at any sampling rate, including `0.0`, but not when telemetry collection is disabled.
 * - Once the decision is made or restored, the configuration isn't read again for the session, so
 *   its periodic refresh is stopped (see {@link ClientConfigStore.stop}).
 *
 * @internal
 */
export class SessionSampler {
  private _decision?: SamplingDecision;

  /**
   * @param _storageKey - `sessionStorage` key under which the decision is persisted. It must be
   *   specific to the app and region.
   */
  constructor(
    private readonly _configStore: ClientConfigStore,
    private readonly _attributesStore: AttributesStore,
    private readonly _storageKey: string
  ) {}

  /**
   * Returns the decision for the current session, making it from the configuration in memory if
   * none has been made yet.
   *
   * A debug session that isn't forced because telemetry is disabled stays unforced until the page
   * reloads, even if telemetry is re-enabled: the configuration isn't re-fetched for the decision.
   */
  getDecision(): SamplingDecision {
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
    this._configStore.stop();
    return decision;
  }

  /**
   * Applies the session's sampling decision to a batch of log records or spans about to be
   * exported.
   */
  applySampling(
    records: ReadonlyArray<{ readonly attributes: object }>
  ): boolean {
    const decision = this.getDecision();
    if (!decision.sampled) {
      return false;
    }
    const samplingAttributes: Record<string, number | boolean> = {
      [ATTR_KEY_SESSION_SAMPLING_RATE]: decision.samplingRate
    };
    if (decision.forced) {
      samplingAttributes[ATTR_KEY_SESSION_SAMPLING_FORCED] = true;
    }
    for (const record of records) {
      Object.assign(record.attributes, samplingAttributes);
    }
    return true;
  }

  private _computeDecision(
    sessionId: string | undefined,
    config: ClientConfig
  ): SamplingDecision {
    // The debug override forces sampling at any rate, including a paused 0.0, but not when
    // telemetry is disabled for the app.
    if (config.enabled && isTelemetryDebugEnabled()) {
      return { sessionId, sampled: true, samplingRate: 1.0, forced: true };
    }

    const sampled =
      !!sessionId && isSessionSampled(sessionId, config.samplingRate);
    return { sessionId, sampled, samplingRate: config.samplingRate };
  }

  /**
   * Returns the session's saved decision, if any. While the debug override is on, a non-forced
   * decision is ignored, so the session gets a forced one (unless telemetry is disabled) and
   * keeps it.
   */
  private _cachedDecision(): SamplingDecision | undefined {
    const sessionId = this._attributesStore.sessionId;
    if (this._decision && this._decision.sessionId === sessionId) {
      if (this._decision.forced || !isTelemetryDebugEnabled()) {
        return this._decision;
      }
    }
    // Not in memory yet (e.g. the page was reloaded): use the decision saved for this session.
    const persisted = this._loadPersistedDecision();
    if (persisted && persisted.sessionId === sessionId && sessionId) {
      if (persisted.forced || !isTelemetryDebugEnabled()) {
        this._decision = persisted;
        this._configStore.stop();
        return persisted;
      }
    }
    this._decision = undefined;
    return undefined;
  }

  private _loadPersistedDecision(): SamplingDecision | undefined {
    try {
      const raw = sessionStorage.getItem(this._storageKey);
      return raw ? (JSON.parse(raw) as SamplingDecision) : undefined;
    } catch (e) {
      // sessionStorage is unavailable.
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
