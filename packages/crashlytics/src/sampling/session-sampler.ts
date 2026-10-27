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
  SESSION_SAMPLING_HASH_BUCKETS,
  SESSION_STORAGE_SAMPLING_DECISION_KEY
} from '../constants';
import { ClientConfig, ClientConfigStore } from './client-config';
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
 *   session creation), so the most recently fetched sampling rate is used.
 * - A session is either kept completely or discarded completely. Once made, the decision (and the
 *   rate it was made with) is fixed for the rest of the session and persisted in `sessionStorage`
 *   so page reloads within the session do not flip it. Rate changes apply to new sessions only;
 *   downward changes are additionally enforced immediately by the backend.
 * - The telemetry debug override (see {@link isTelemetryDebugEnabled}) forces the session to be
 *   sampled.
 *
 * @internal
 */
export class SessionSampler {
  private _decision?: SamplingDecision;

  constructor(
    private readonly _configStore: ClientConfigStore,
    private readonly _attributesStore: AttributesStore,
    private readonly _initialWaitMs = CLIENT_CONFIG_INITIAL_WAIT_MS
  ) {}

  /**
   * Returns the decision for the current session, computing it on first use.
   *
   * On first use this waits (bounded by `initialWaitMs`) for the initial config fetch so a fresh
   * rate is used when it arrives quickly; otherwise the cached or default configuration is used.
   */
  async getDecision(): Promise<SamplingDecision> {
    const cached = this._cachedDecision();
    if (cached) {
      return cached;
    }
    await Promise.race([
      this._configStore.whenReady(),
      new Promise<void>(resolve => setTimeout(resolve, this._initialWaitMs))
    ]);
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
   * Returns the attribute to stamp on exported telemetry for the current (sampled) session.
   */
  getSamplingAttribute(decision: SamplingDecision): Record<string, number> {
    return { [ATTR_KEY_SESSION_SAMPLING_RATE]: decision.samplingRate };
  }

  private _computeDecision(
    sessionId: string | undefined,
    config: ClientConfig
  ): SamplingDecision {
    if (isTelemetryDebugEnabled()) {
      // Force collection. Stamp the configured rate (when valid) rather than 1.0: the backend
      // re-samples sessions whose stamped rate is above the configured rate, which would defeat
      // the override for most sessions.
      return {
        sessionId,
        sampled: true,
        samplingRate: config.samplingRate > 0 ? config.samplingRate : 1.0
      };
    }
    if (!config.enabled || config.samplingRate <= 0) {
      return { sessionId, sampled: false, samplingRate: config.samplingRate };
    }
    const sampled = sessionId
      ? isSessionSampled(sessionId, config.samplingRate)
      : // Without a session ID (e.g. sessionStorage unavailable) there is nothing to hash and no
        // session to keep consistent, so fall back to an independent random draw at the same rate.
        Math.random() < config.samplingRate;
    return { sessionId, sampled, samplingRate: config.samplingRate };
  }

  private _cachedDecision(): SamplingDecision | undefined {
    const sessionId = this._attributesStore.sessionId;
    if (this._decision && this._decision.sessionId === sessionId) {
      return this._decision;
    }
    // A new session (or first use after a reload): try the persisted decision.
    const persisted = this._loadPersistedDecision();
    if (persisted && persisted.sessionId === sessionId && sessionId) {
      this._decision = persisted;
      return persisted;
    }
    this._decision = undefined;
    return undefined;
  }

  private _loadPersistedDecision(): SamplingDecision | undefined {
    if (typeof sessionStorage === 'undefined') {
      return undefined;
    }
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_SAMPLING_DECISION_KEY);
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw) as Partial<SamplingDecision>;
      if (
        typeof parsed.sessionId !== 'string' ||
        typeof parsed.sampled !== 'boolean' ||
        typeof parsed.samplingRate !== 'number'
      ) {
        return undefined;
      }
      return {
        sessionId: parsed.sessionId,
        sampled: parsed.sampled,
        samplingRate: parsed.samplingRate
      };
    } catch (e) {
      return undefined;
    }
  }

  private _persistDecision(decision: SamplingDecision): void {
    if (typeof sessionStorage === 'undefined' || !decision.sessionId) {
      return;
    }
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_SAMPLING_DECISION_KEY,
        JSON.stringify(decision)
      );
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}
