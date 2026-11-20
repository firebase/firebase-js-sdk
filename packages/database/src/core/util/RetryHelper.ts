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

/** Minimum base delay (ms) on the first retry after a failure or disconnect. */
export const RECONNECT_MIN_DELAY = 1000;

/** Default maximum base delay (ms) between reconnect attempts (5 minutes). */
export const RECONNECT_MAX_DELAY_DEFAULT = 300000;

/** Maximum base delay (ms) for normal disconnects with admin credentials. */
export const RECONNECT_MAX_DELAY_FOR_ADMINS = 30000;

/** Exponential backoff multiplier applied after each retry attempt. */
export const RECONNECT_DELAY_MULTIPLIER = 1.5;

/** Centered uniform jitter factor (+/- 50%) applied to the base delay. */
export const RECONNECT_JITTER_FACTOR = 0.5;

/** Sustained connection duration (ms) after which retry delay resets to min. */
export const RECONNECT_DELAY_RESET_TIMEOUT = 30000;

/** Configuration options for {@link RetryHelper}. */
export interface RetryHelperOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  escalatedMaxDelayMs?: number;
  multiplier?: number;
  jitterFactor?: number;
  randomFn?: () => number;
}

/**
 * Manages exponential backoff state and centered uniform jitter for reconnect
 * attempts.
 */
export class RetryHelper {
  private readonly minDelayMs_: number;
  private maxDelay_: number;
  private readonly escalatedMaxDelay_: number;
  private readonly multiplier_: number;
  private readonly jitterFactor_: number;
  private readonly randomFn_: () => number;
  private currentDelay_: number;

  constructor(options: RetryHelperOptions = {}) {
    this.minDelayMs_ = Math.max(0, options.minDelayMs ?? RECONNECT_MIN_DELAY);
    this.maxDelay_ = Math.max(
      this.minDelayMs_,
      options.maxDelayMs ?? RECONNECT_MAX_DELAY_DEFAULT
    );
    this.escalatedMaxDelay_ = Math.max(
      this.minDelayMs_,
      options.escalatedMaxDelayMs ?? RECONNECT_MAX_DELAY_DEFAULT
    );
    this.multiplier_ = options.multiplier ?? RECONNECT_DELAY_MULTIPLIER;
    this.jitterFactor_ = Math.max(
      0,
      options.jitterFactor ?? RECONNECT_JITTER_FACTOR
    );
    this.randomFn_ = options.randomFn ?? Math.random;
    this.currentDelay_ = this.minDelayMs_;
  }

  /** Current unjittered base delay (ms) for the next retry attempt. */
  get currentDelayMs(): number {
    return this.currentDelay_;
  }

  /** Current maximum unjittered base delay (ms) for normal retries. */
  get maxDelayMs(): number {
    return this.maxDelay_;
  }

  /**
   * Computes the jittered delay for the current retry attempt and advances the
   * base delay for the next attempt, capped at {@link maxDelayMs}.
   */
  nextRetryDelay(): number {
    const delay = this.applyJitter_(this.currentDelay_);
    this.currentDelay_ = Math.min(
      this.maxDelay_,
      this.currentDelay_ * this.multiplier_
    );
    return delay;
  }

  /**
   * Returns a jittered delay around {@link maxDelayMs} without mutating the
   * underlying backoff progression (e.g. while the tab/app is hidden).
   */
  getMaxRetryDelay(): number {
    return this.applyJitter_(this.maxDelay_);
  }

  /**
   * Escalates the current base delay to the escalated maximum (e.g. on HTTP
   * 402 or 429), overriding any lower admin cap for the next attempt.
   */
  escalateToMax(): void {
    this.currentDelay_ = Math.max(this.maxDelay_, this.escalatedMaxDelay_);
  }

  /**
   * Escalates the base delay to the escalated maximum and returns a jittered
   * delay around it while keeping the base delay escalated.
   */
  getEscalateDelay(): number {
    this.escalateToMax();
    return this.applyJitter_(this.currentDelay_);
  }

  /** Resets the current base delay back to the minimum delay. */
  reset(): void {
    this.currentDelay_ = this.minDelayMs_;
  }

  /** Updates the maximum base delay for normal retry progression. */
  setMaxDelay(maxDelayMs: number): void {
    this.maxDelay_ = Math.max(this.minDelayMs_, maxDelayMs);
  }

  /**
   * Ensures the current base delay is at least `minDelayMs` (e.g. on auth
   * revocation) without lowering an already larger delay.
   */
  clampCurrentDelayAtLeast(minDelayMs: number): void {
    const effectiveCeiling = Math.max(this.maxDelay_, this.escalatedMaxDelay_);
    this.currentDelay_ = Math.min(
      effectiveCeiling,
      Math.max(this.currentDelay_, minDelayMs)
    );
  }

  private applyJitter_(baseDelayMs: number): number {
    const jitterOffset =
      (this.randomFn_() - 0.5) * baseDelayMs * 2 * this.jitterFactor_;
    return Math.max(0, baseDelayMs + jitterOffset);
  }
}
