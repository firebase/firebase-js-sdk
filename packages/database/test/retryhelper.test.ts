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
  RECONNECT_DELAY_MULTIPLIER,
  RECONNECT_DELAY_RESET_TIMEOUT,
  RECONNECT_JITTER_FACTOR,
  RECONNECT_MAX_DELAY_DEFAULT,
  RECONNECT_MAX_DELAY_FOR_ADMINS,
  RECONNECT_MIN_DELAY,
  RetryHelper
} from '../src/core/util/RetryHelper';

describe('RetryHelper', () => {
  it('exports expected default constants', () => {
    expect(RECONNECT_MIN_DELAY).toBe(1000);
    expect(RECONNECT_MAX_DELAY_DEFAULT).toBe(300000);
    expect(RECONNECT_MAX_DELAY_FOR_ADMINS).toBe(30000);
    expect(RECONNECT_DELAY_MULTIPLIER).toBe(1.5);
    expect(RECONNECT_JITTER_FACTOR).toBe(0.5);
    expect(RECONNECT_DELAY_RESET_TIMEOUT).toBe(30000);
  });

  it('starts at minDelayMs and progresses exponentially by 1.5x up to 300000ms', () => {
    const helper = new RetryHelper({ randomFn: () => 0.5 });

    expect(helper.currentDelayMs).toBe(1000);
    expect(helper.maxDelayMs).toBe(300000);

    expect(helper.nextRetryDelay()).toBe(1000);
    expect(helper.currentDelayMs).toBe(1500);

    expect(helper.nextRetryDelay()).toBe(1500);
    expect(helper.currentDelayMs).toBe(2250);

    expect(helper.nextRetryDelay()).toBe(2250);
    expect(helper.currentDelayMs).toBe(3375);

    expect(helper.nextRetryDelay()).toBe(3375);
    expect(helper.currentDelayMs).toBe(5062.5);

    // Advance until capped at 300,000 ms.
    let lastDelay = 0;
    for (let i = 0; i < 20; i++) {
      lastDelay = helper.nextRetryDelay();
      expect(lastDelay).toBeGreaterThan(0);
    }
    expect(helper.currentDelayMs).toBe(300000);
    expect(helper.nextRetryDelay()).toBe(300000);
    expect(helper.currentDelayMs).toBe(300000);
  });

  describe('jitter bounds', () => {
    it('applies centered +/-50% jitter deterministically at boundaries', () => {
      let mockRandom = 0;
      const helper = new RetryHelper({ randomFn: () => mockRandom });

      // randomFn = 0 -> 0.5 * base
      mockRandom = 0;
      expect(helper.nextRetryDelay()).toBe(500);

      // randomFn = 0.5 -> 1.0 * base (current base is 1500)
      mockRandom = 0.5;
      expect(helper.nextRetryDelay()).toBe(1500);

      // randomFn = 0.9999 -> ~1.5 * base (current base is 2250)
      mockRandom = 0.9999;
      const highDelay = helper.nextRetryDelay();
      expect(highDelay).toBeCloseTo(2250 * 1.4999, 6);
      expect(highDelay).toBeLessThan(2250 * 1.5);
    });

    it('applies jitter after clamping base delay at 300s ([150s, 450s))', () => {
      let mockRandom = 0.5;
      const helper = new RetryHelper({ randomFn: () => mockRandom });

      helper.escalateToMax();
      expect(helper.currentDelayMs).toBe(300000);

      mockRandom = 0;
      expect(helper.nextRetryDelay()).toBe(150000);

      mockRandom = 0.5;
      expect(helper.nextRetryDelay()).toBe(300000);

      mockRandom = 0.9999;
      const upper = helper.nextRetryDelay();
      expect(upper).toBeCloseTo(300000 * 1.4999, 6);
      expect(upper).toBeLessThan(450000);
    });

    it('clamps negative jittered delays to 0 when jitterFactor > 0.5', () => {
      const helper = new RetryHelper({
        jitterFactor: 1.0,
        randomFn: () => 0
      });
      // 1000 + (0 - 0.5) * 1000 * 2 * 1.0 = 0
      expect(helper.nextRetryDelay()).toBe(0);

      const overJitterHelper = new RetryHelper({
        jitterFactor: 1.5,
        randomFn: () => 0
      });
      // Unclamped would be -500; clamped >= 0.
      expect(overJitterHelper.nextRetryDelay()).toBe(0);
    });

    it('keeps statistical samples within [0.5 * base, 1.5 * base)', () => {
      const minHelper = new RetryHelper();
      let sawBelow = false;
      let sawAbove = false;
      for (let i = 0; i < 500; i++) {
        minHelper.reset();
        const delay = minHelper.nextRetryDelay();
        expect(delay).toBeGreaterThanOrEqual(500);
        expect(delay).toBeLessThan(1500);
        if (delay < 1000) {
          sawBelow = true;
        }
        if (delay > 1000) {
          sawAbove = true;
        }
      }
      expect(sawBelow).toBe(true);
      expect(sawAbove).toBe(true);

      const maxHelper = new RetryHelper();
      maxHelper.escalateToMax();
      for (let i = 0; i < 500; i++) {
        const delay = maxHelper.nextRetryDelay();
        expect(delay).toBeGreaterThanOrEqual(150000);
        expect(delay).toBeLessThan(450000);
      }
    });
  });

  it('reset() restores base delay back to minDelayMs', () => {
    const helper = new RetryHelper({ randomFn: () => 0.5 });

    helper.nextRetryDelay(); // 1000 -> 1500
    helper.nextRetryDelay(); // 1500 -> 2250
    helper.nextRetryDelay(); // 2250 -> 3375
    expect(helper.currentDelayMs).toBe(3375);

    helper.reset();
    expect(helper.currentDelayMs).toBe(1000);
    expect(helper.nextRetryDelay()).toBe(1000);
    expect(helper.currentDelayMs).toBe(1500);
  });

  it('getMaxRetryDelay() returns jittered maxDelayMs without mutating currentDelayMs', () => {
    let mockRandom = 0;
    const helper = new RetryHelper({ randomFn: () => mockRandom });

    helper.nextRetryDelay(); // 1000 -> 1500
    expect(helper.currentDelayMs).toBe(1500);

    mockRandom = 0;
    expect(helper.getMaxRetryDelay()).toBe(150000);
    mockRandom = 0.5;
    expect(helper.getMaxRetryDelay()).toBe(300000);
    mockRandom = 0.9999;
    expect(helper.getMaxRetryDelay()).toBeCloseTo(300000 * 1.4999, 6);

    // Underlying ladder is untouched.
    expect(helper.currentDelayMs).toBe(1500);

    // Respects reduced admin maxDelayMs as well.
    helper.setMaxDelay(RECONNECT_MAX_DELAY_FOR_ADMINS);
    mockRandom = 0;
    expect(helper.getMaxRetryDelay()).toBe(15000);
    mockRandom = 0.5;
    expect(helper.getMaxRetryDelay()).toBe(30000);
    expect(helper.currentDelayMs).toBe(1500);
  });

  it('handles admin maxDelay cap and escalation override behavior', () => {
    let mockRandom = 0.5;
    const helper = new RetryHelper({ randomFn: () => mockRandom });
    helper.setMaxDelay(RECONNECT_MAX_DELAY_FOR_ADMINS);
    expect(helper.maxDelayMs).toBe(30000);

    // Normal progression caps at 30,000 ms.
    for (let i = 0; i < 15; i++) {
      helper.nextRetryDelay();
    }
    expect(helper.currentDelayMs).toBe(30000);
    mockRandom = 0;
    expect(helper.nextRetryDelay()).toBe(15000);
    mockRandom = 0.9999;
    expect(helper.nextRetryDelay()).toBeLessThan(45000);
    expect(helper.currentDelayMs).toBe(30000);

    // Escalation overrides admin cap to 300,000 ms for the escalated attempt.
    helper.escalateToMax();
    expect(helper.currentDelayMs).toBe(300000);

    mockRandom = 0;
    expect(helper.nextRetryDelay()).toBe(150000);
    // Subsequent normal attempt drops back to admin cap (30,000 ms).
    expect(helper.currentDelayMs).toBe(30000);
    mockRandom = 0.5;
    expect(helper.nextRetryDelay()).toBe(30000);

    // Another escalation raises it back to 300,000 ms.
    helper.escalateToMax();
    expect(helper.currentDelayMs).toBe(300000);
    mockRandom = 0.9999;
    const escalatedHigh = helper.nextRetryDelay();
    expect(escalatedHigh).toBeCloseTo(300000 * 1.4999, 6);
    expect(escalatedHigh).toBeLessThan(450000);
    expect(helper.currentDelayMs).toBe(30000);
  });

  it('getEscalateDelay() escalates and returns jittered escalated delay while keeping currentDelayMs escalated', () => {
    let mockRandom = 0;
    const helper = new RetryHelper({ randomFn: () => mockRandom });
    helper.setMaxDelay(RECONNECT_MAX_DELAY_FOR_ADMINS);

    // While hidden, 402/429 calls getEscalateDelay().
    const hiddenDelay = helper.getEscalateDelay();
    expect(hiddenDelay).toBe(150000);
    expect(helper.currentDelayMs).toBe(300000);

    // When visibility returns before reset, nextRetryDelay() uses the escalated 300s
    // and then drops back to admin cap (30s).
    mockRandom = 0.5;
    expect(helper.nextRetryDelay()).toBe(300000);
    expect(helper.currentDelayMs).toBe(30000);
  });

  it('clampCurrentDelayAtLeast() raises low delays and preserves higher delays', () => {
    const helper = new RetryHelper({ randomFn: () => 0.5 });

    expect(helper.currentDelayMs).toBe(1000);
    helper.clampCurrentDelayAtLeast(30000);
    expect(helper.currentDelayMs).toBe(30000);

    // Advance above 100,000 ms and ensure clamping to 30,000 does not lower it.
    while (helper.currentDelayMs < 120000) {
      helper.nextRetryDelay();
    }
    const highDelay = helper.currentDelayMs;
    expect(highDelay).toBeGreaterThanOrEqual(120000);

    helper.clampCurrentDelayAtLeast(30000);
    expect(helper.currentDelayMs).toBe(highDelay);

    // Escalated 300,000 ms is also preserved.
    helper.escalateToMax();
    helper.clampCurrentDelayAtLeast(30000);
    expect(helper.currentDelayMs).toBe(300000);

    // Respects ceiling when escalatedMaxDelayMs is capped.
    const cappedHelper = new RetryHelper({
      maxDelayMs: 30000,
      escalatedMaxDelayMs: 60000
    });
    cappedHelper.clampCurrentDelayAtLeast(100000);
    expect(cappedHelper.currentDelayMs).toBe(60000);
  });

  it('supports custom RetryHelperOptions and enforces minDelayMs floor on setMaxDelay', () => {
    const helper = new RetryHelper({
      minDelayMs: 500,
      maxDelayMs: 4000,
      escalatedMaxDelayMs: 10000,
      multiplier: 2,
      jitterFactor: 0,
      randomFn: () => 0.1
    });

    expect(helper.currentDelayMs).toBe(500);
    expect(helper.nextRetryDelay()).toBe(500);
    expect(helper.nextRetryDelay()).toBe(1000);
    expect(helper.nextRetryDelay()).toBe(2000);
    expect(helper.nextRetryDelay()).toBe(4000);
    expect(helper.nextRetryDelay()).toBe(4000);

    helper.escalateToMax();
    expect(helper.currentDelayMs).toBe(10000);
    expect(helper.nextRetryDelay()).toBe(10000);
    expect(helper.currentDelayMs).toBe(4000);

    helper.setMaxDelay(100);
    expect(helper.maxDelayMs).toBe(500);
  });
});
