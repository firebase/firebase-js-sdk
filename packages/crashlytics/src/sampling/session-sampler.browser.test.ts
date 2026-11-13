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
  SESSION_STORAGE_DEBUG_KEY,
  TELEMETRY_DEBUG_GLOBAL_FLAG
} from '../constants';
import { ClientConfig, ClientConfigStore } from './client-config';
import { isSessionSampled, SessionSampler } from './session-sampler';

// Session IDs whose hash buckets are 1184, 6018 and 8828 out of 10000.
const SESSION_LOW = 'test-session-3';
const SESSION_MID = 'test-session-1';
const SESSION_HIGH = 'sëssion-ü';

// Decision keys of two apps on the same page (which share the session ID).
const STORAGE_KEY = 'firebasecrashlytics.sampling:app-a:global';
const OTHER_APP_STORAGE_KEY = 'firebasecrashlytics.sampling:app-b:global';

class FakeConfigStore {
  config: ClientConfig;
  /** What {@link refreshIfStale} returns, i.e. when the sampler's refresh settles. */
  ready: Promise<void> = Promise.resolve();
  refreshCount = 0;
  stopCount = 0;
  constructor(config: Partial<ClientConfig> = {}) {
    this.config = { samplingRate: 1, enabled: true, ...config };
  }
  refreshIfStale(): Promise<void> {
    this.refreshCount++;
    return this.ready;
  }
  stop(): void {
    this.stopCount++;
  }
}

function createSampler(
  config: Partial<ClientConfig>,
  sessionId: string | undefined,
  initialWaitMs = 10,
  storageKey = STORAGE_KEY
): { sampler: SessionSampler; store: FakeConfigStore; attrs: AttributesStore } {
  const store = new FakeConfigStore(config);
  const attrs = new AttributesStore({ projectId: 'p', appId: 'a' });
  if (sessionId) {
    attrs.setSessionId(sessionId);
  }
  const sampler = new SessionSampler(
    store as unknown as ClientConfigStore,
    attrs,
    storageKey,
    initialWaitMs
  );
  return { sampler, store, attrs };
}

// The server makes the same decisions for these session IDs.
describe('isSessionSampled', () => {
  it('uses the shared hash buckets', () => {
    expect(isSessionSampled(SESSION_LOW, 0.1185)).toBe(true);
    expect(isSessionSampled(SESSION_LOW, 0.1184)).toBe(false);
    expect(isSessionSampled(SESSION_MID, 0.6019)).toBe(true);
    expect(isSessionSampled(SESSION_MID, 0.6018)).toBe(false);
    expect(isSessionSampled(SESSION_HIGH, 0.8829)).toBe(true);
    expect(isSessionSampled(SESSION_HIGH, 0.8828)).toBe(false);
  });

  it('makes the same decisions as the backend when it resamples at 0.5', () => {
    expect(isSessionSampled(SESSION_LOW, 0.5)).toBe(true);
    expect(isSessionSampled(SESSION_MID, 0.5)).toBe(false);
  });

  it('keeps everything at 1.0 and nothing at 0.0', () => {
    for (let i = 0; i < 200; i++) {
      expect(isSessionSampled(`session-${i}`, 1.0)).toBe(true);
      expect(isSessionSampled(`session-${i}`, 0.0)).toBe(false);
    }
  });

  it('samples roughly the configured fraction of sessions', () => {
    const total = 20000;
    let kept = 0;
    for (let i = 0; i < total; i++) {
      if (
        isSessionSampled(
          `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          0.25
        )
      ) {
        kept++;
      }
    }
    expect(kept / total).toBeGreaterThan(0.23);
    expect(kept / total).toBeLessThan(0.27);
  });
});

describe('SessionSampler', () => {
  beforeEach(() => {
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
  });

  afterEach(() => {
    sessionStorage.clear();
    delete (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG];
  });

  it('samples a session whose bucket is below the rate and stamps that rate', async () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    const decision = await sampler.getDecision();
    expect(decision).toEqual({
      sessionId: SESSION_LOW,
      sampled: true,
      samplingRate: 0.5
    });
  });

  it('drops a session whose bucket is above the rate', async () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
    expect((await sampler.getDecision()).sampled).toBe(false);
  });

  it('keeps every session with the default config', async () => {
    const { sampler } = createSampler({}, SESSION_HIGH);
    expect(await sampler.getDecision()).toMatchObject({
      sampled: true,
      samplingRate: 1
    });
  });

  it('drops everything when the rate is 0.0 (paused or disabled)', async () => {
    const { sampler } = createSampler({ samplingRate: 0 }, SESSION_LOW);
    expect((await sampler.getDecision()).sampled).toBe(false);
  });

  it('drops the session when there is no session id, even at a 100% rate', async () => {
    const { sampler } = createSampler({ samplingRate: 1 }, undefined);
    expect(await sampler.getDecision()).toEqual({
      sessionId: undefined,
      sampled: false,
      samplingRate: 1
    });
    // Nothing is persisted without a session id.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('makes a new decision once a session id becomes available', async () => {
    const { sampler, attrs } = createSampler({ samplingRate: 1 }, undefined);
    expect((await sampler.getDecision()).sampled).toBe(false);

    attrs.setSessionId(SESSION_HIGH);
    expect(await sampler.getDecision()).toEqual({
      sessionId: SESSION_HIGH,
      sampled: true,
      samplingRate: 1
    });
  });

  it('makes the decision once per session and keeps it across config changes', async () => {
    const { sampler, store } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    const first = await sampler.getDecision();
    expect(first.sampled).toBe(true);

    // Lowering the rate below the session's bucket does not flip the session.
    store.config = { samplingRate: 0.05, enabled: true };
    expect(await sampler.getDecision()).toEqual(first);
    expect(sampler.decide()).toEqual(first);
  });

  it('re-evaluates when a new session starts', async () => {
    const { sampler, store, attrs } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    expect((await sampler.getDecision()).sampled).toBe(true);

    store.config = { samplingRate: 0.9, enabled: true };
    attrs.setSessionId(SESSION_MID);
    expect(await sampler.getDecision()).toEqual({
      sessionId: SESSION_MID,
      sampled: true,
      samplingRate: 0.9
    });
  });

  it('persists the decision in sessionStorage and reuses it after a reload', async () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    const first = await sampler.getDecision();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual(first);

    // A new SDK instance in the same tab (same session id) sees a lower rate, but keeps the
    // original decision and rate.
    const { sampler: reloaded } = createSampler(
      { samplingRate: 0.01 },
      SESSION_LOW
    );
    expect(await reloaded.getDecision()).toEqual(first);
  });

  it('ignores a persisted decision for a different session', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: 'other', sampled: false, samplingRate: 0.1 })
    );
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    expect(await sampler.getDecision()).toMatchObject({
      sessionId: SESSION_LOW,
      sampled: true,
      samplingRate: 0.5
    });
  });

  it('keeps the decisions of apps sharing a session apart, across reloads', async () => {
    // SESSION_MID (bucket 6018) is sampled at app A's rate of 0.9 but not at app B's rate of 0.5.
    const { sampler: appA } = createSampler({ samplingRate: 0.9 }, SESSION_MID);
    const { sampler: appB } = createSampler(
      { samplingRate: 0.5 },
      SESSION_MID,
      undefined,
      OTHER_APP_STORAGE_KEY
    );
    const decisionA = await appA.getDecision();
    const decisionB = await appB.getDecision();
    expect(decisionA).toEqual({
      sessionId: SESSION_MID,
      sampled: true,
      samplingRate: 0.9
    });
    expect(decisionB).toEqual({
      sessionId: SESSION_MID,
      sampled: false,
      samplingRate: 0.5
    });

    // After a reload, each app restores its own decision, regardless of its current rate.
    const { sampler: reloadedA } = createSampler(
      { samplingRate: 0.01 },
      SESSION_MID
    );
    const { sampler: reloadedB } = createSampler(
      { samplingRate: 1 },
      SESSION_MID,
      undefined,
      OTHER_APP_STORAGE_KEY
    );
    expect(await reloadedA.getDecision()).toEqual(decisionA);
    expect(await reloadedB.getDecision()).toEqual(decisionB);
  });

  it('refreshes the config and waits for it before the first decision', async () => {
    const { sampler, store } = createSampler(
      { samplingRate: 1 },
      SESSION_HIGH,
      1000
    );
    let resolveFetch!: () => void;
    store.ready = new Promise<void>(resolve => {
      resolveFetch = resolve;
    });

    const pending = sampler.getDecision();
    expect(store.refreshCount).toBe(1);
    store.config = { samplingRate: 0.5, enabled: true };
    resolveFetch();

    expect(await pending).toMatchObject({ sampled: false, samplingRate: 0.5 });
  });

  it('does not wait longer than the initial wait for a slow refresh', async () => {
    const { sampler, store } = createSampler(
      { samplingRate: 1 },
      SESSION_HIGH,
      5
    );
    store.ready = new Promise<void>(() => {});
    expect(await sampler.getDecision()).toMatchObject({
      sampled: true,
      samplingRate: 1
    });
  });

  it('stops the config refresh once the decision is made', async () => {
    const { sampler, store } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    expect(store.stopCount).toBe(0);

    await sampler.getDecision();
    expect(store.stopCount).toBe(1);

    // Later exports reuse the decision without refreshing or stopping again.
    await sampler.getDecision();
    expect(store.refreshCount).toBe(1);
    expect(store.stopCount).toBe(1);
  });

  it('stops the config refresh when it restores a saved decision after a reload', async () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    await sampler.getDecision();

    const { sampler: reloaded, store: reloadedStore } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    await reloaded.getDecision();
    expect(reloadedStore.refreshCount).toBe(0);
    expect(reloadedStore.stopCount).toBe(1);
  });

  describe('applySampling', () => {
    it('stamps the sampling rate on every record of a sampled session', async () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
      const records = [
        { attributes: { existing: 'value' } },
        { attributes: {} }
      ];

      expect(await sampler.applySampling(records)).toBe(true);
      expect(records).toEqual([
        {
          attributes: {
            existing: 'value',
            [ATTR_KEY_SESSION_SAMPLING_RATE]: 0.5
          }
        },
        { attributes: { [ATTR_KEY_SESSION_SAMPLING_RATE]: 0.5 } }
      ]);
    });

    it('leaves the records untouched and returns false for an unsampled session', async () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const records = [{ attributes: { existing: 'value' } }];

      expect(await sampler.applySampling(records)).toBe(false);
      expect(records).toEqual([{ attributes: { existing: 'value' } }]);
    });

    it('also stamps session.sampling.forced on every record of a debug session', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const records = [
        { attributes: { existing: 'value' } },
        { attributes: {} }
      ];

      expect(await sampler.applySampling(records)).toBe(true);
      expect(records).toEqual([
        {
          attributes: {
            existing: 'value',
            [ATTR_KEY_SESSION_SAMPLING_RATE]: 1,
            [ATTR_KEY_SESSION_SAMPLING_FORCED]: true
          }
        },
        {
          attributes: {
            [ATTR_KEY_SESSION_SAMPLING_RATE]: 1,
            [ATTR_KEY_SESSION_SAMPLING_FORCED]: true
          }
        }
      ]);
    });
  });

  describe('waiting for the config refresh', () => {
    const NEVER = new Promise<void>(() => {});

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    function mockVisibility(state: DocumentVisibilityState): void {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
    }

    it('refreshes only before the first decision of a session', async () => {
      const { sampler, store } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH,
        60_000
      );

      const first = await sampler.getDecision();
      expect(await sampler.getDecision()).toEqual(first);
      expect(store.refreshCount).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not refresh or wait when the page is already hidden (unload flush)', async () => {
      mockVisibility('hidden');
      const { sampler, store } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH,
        60_000
      );
      store.ready = NEVER;

      expect(await sampler.getDecision()).toMatchObject({
        sampled: false,
        samplingRate: 0.5
      });
      expect(store.refreshCount).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('releases a pending wait when the page becomes hidden', async () => {
      const { sampler, store } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH,
        60_000
      );
      store.ready = NEVER;

      const pending = sampler.getDecision();
      mockVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));

      expect(await pending).toMatchObject({
        sampled: false,
        samplingRate: 0.5
      });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('releases a pending wait on pagehide', async () => {
      const { sampler, store } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH,
        60_000
      );
      store.ready = NEVER;

      const pending = sampler.getDecision();
      window.dispatchEvent(new Event('pagehide'));

      expect(await pending).toMatchObject({
        sampled: false,
        samplingRate: 0.5
      });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('keeps waiting on a visibilitychange to visible', async () => {
      const { sampler, store } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH,
        1000
      );
      store.ready = NEVER;

      let settled = false;
      const pending = sampler.getDecision().then(decision => {
        settled = true;
        return decision;
      });
      mockVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toMatchObject({
        sampled: false,
        samplingRate: 0.5
      });
    });

    it('clears its timers once the fetch settles, and concurrent callers get the same decision', async () => {
      const { sampler, store } = createSampler(
        { samplingRate: 1 },
        SESSION_HIGH,
        60_000
      );
      let resolveFetch!: () => void;
      store.ready = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      const logs = sampler.getDecision();
      const spans = sampler.getDecision();
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      store.config = { samplingRate: 0.5, enabled: true };
      resolveFetch();

      const [logsDecision, spansDecision] = await Promise.all([logs, spans]);
      expect(logsDecision).toEqual(spansDecision);
      expect(logsDecision).toMatchObject({ sampled: false, samplingRate: 0.5 });
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('debug override', () => {
    it('forces sampling even when there is no session id', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, undefined);
      expect(await sampler.getDecision()).toEqual({
        sessionId: undefined,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('forces sampling via the global flag and stamps 1.0 instead of the configured rate', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.01 }, SESSION_HIGH);
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('forces sampling via the sessionStorage marker and stamps 1.0', async () => {
      sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
      const { sampler } = createSampler({ samplingRate: 0.25 }, SESSION_HIGH);
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('forces sampling even when collection is paused (rate 0.0)', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0 }, SESSION_HIGH);
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('does not force sampling when telemetry is disabled', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: false,
        samplingRate: 0
      });
    });

    it('refreshes the config before a debug decision, so disabling is honored', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler, store } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH,
        1000
      );
      let resolveFetch!: () => void;
      store.ready = new Promise<void>(resolve => {
        resolveFetch = resolve;
      });

      const pending = sampler.getDecision();
      expect(store.refreshCount).toBe(1);
      // The refreshed config disables telemetry.
      store.config = { samplingRate: 0, enabled: false };
      resolveFetch();

      expect(await pending).toMatchObject({ sampled: false, samplingRate: 0 });
    });

    it('switches to a debug decision mid-session even while collection is paused', async () => {
      const { sampler } = createSampler({ samplingRate: 0 }, SESSION_HIGH);
      expect((await sampler.getDecision()).sampled).toBe(false);

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('does not switch to a debug decision mid-session when telemetry is disabled', async () => {
      const { sampler } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      expect((await sampler.getDecision()).sampled).toBe(false);

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const records = [{ attributes: {} }];
      expect(await sampler.applySampling(records)).toBe(false);
      expect(records).toEqual([{ attributes: {} }]);
    });

    it('overrides a previously cached unsampled decision when enabled mid-session', async () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      expect((await sampler.getDecision()).sampled).toBe(false);

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('overrides a previously cached sampled decision when enabled mid-session', async () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_LOW,
        sampled: true,
        samplingRate: 0.5
      });

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_LOW,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('overrides a decision restored after a reload once the override is on', async () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      expect((await sampler.getDecision()).sampled).toBe(false);

      // E.g. the page is reloaded with `?firebase_telemetry_debug=true`, which sets this marker.
      sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
      const { sampler: reloaded } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH
      );
      expect(await reloaded.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('keeps the debug decision after the override is turned off, including after a reload', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const debugDecision = await sampler.getDecision();
      expect(debugDecision).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });

      delete (globalThis as Record<string, unknown>)[
        TELEMETRY_DEBUG_GLOBAL_FLAG
      ];
      expect(await sampler.getDecision()).toEqual(debugDecision);

      const { sampler: reloaded } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH
      );
      expect(await reloaded.getDecision()).toEqual(debugDecision);
    });
  });
});
