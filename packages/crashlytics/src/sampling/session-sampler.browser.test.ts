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
  refreshCount = 0;
  stopCount = 0;
  constructor(config: Partial<ClientConfig> = {}) {
    this.config = { samplingRate: 1, enabled: true, ...config };
  }
  refreshIfStale(): Promise<void> {
    this.refreshCount++;
    return Promise.resolve();
  }
  stop(): void {
    this.stopCount++;
  }
}

function createSampler(
  config: Partial<ClientConfig>,
  sessionId: string | undefined,
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
    storageKey
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

  it('samples a session whose bucket is below the rate and stamps that rate', () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    const decision = sampler.getDecision();
    expect(decision).toEqual({
      sessionId: SESSION_LOW,
      sampled: true,
      samplingRate: 0.5
    });
  });

  it('drops a session whose bucket is above the rate', () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
    expect(sampler.getDecision().sampled).toBe(false);
  });

  it('keeps every session with the default config', () => {
    const { sampler } = createSampler({}, SESSION_HIGH);
    expect(sampler.getDecision()).toMatchObject({
      sampled: true,
      samplingRate: 1
    });
  });

  it('drops everything when the rate is 0.0 (paused or disabled)', () => {
    const { sampler } = createSampler({ samplingRate: 0 }, SESSION_LOW);
    expect(sampler.getDecision().sampled).toBe(false);
  });

  it('drops the session when there is no session id, even at a 100% rate', () => {
    const { sampler } = createSampler({ samplingRate: 1 }, undefined);
    expect(sampler.getDecision()).toEqual({
      sessionId: undefined,
      sampled: false,
      samplingRate: 1
    });
    // Nothing is persisted without a session id.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('makes a new decision once a session id becomes available', () => {
    const { sampler, attrs } = createSampler({ samplingRate: 1 }, undefined);
    expect(sampler.getDecision().sampled).toBe(false);

    attrs.setSessionId(SESSION_HIGH);
    expect(sampler.getDecision()).toEqual({
      sessionId: SESSION_HIGH,
      sampled: true,
      samplingRate: 1
    });
  });

  it('decides right away from the configuration in memory, without refreshing it', () => {
    const { sampler, store } = createSampler(
      { samplingRate: 0.5 },
      SESSION_HIGH
    );
    // E.g. the startup fetch returned after the store was created.
    store.config = { samplingRate: 1, enabled: true };
    expect(sampler.getDecision()).toEqual({
      sessionId: SESSION_HIGH,
      sampled: true,
      samplingRate: 1
    });
    expect(store.refreshCount).toBe(0);
  });

  it('makes the decision once per session and keeps it across config changes', () => {
    const { sampler, store } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    const first = sampler.getDecision();
    expect(first.sampled).toBe(true);

    // Lowering the rate below the session's bucket does not flip the session.
    store.config = { samplingRate: 0.05, enabled: true };
    expect(sampler.getDecision()).toEqual(first);
  });

  it('re-evaluates when a new session starts', () => {
    const { sampler, store, attrs } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    expect(sampler.getDecision().sampled).toBe(true);

    store.config = { samplingRate: 0.9, enabled: true };
    attrs.setSessionId(SESSION_MID);
    expect(sampler.getDecision()).toEqual({
      sessionId: SESSION_MID,
      sampled: true,
      samplingRate: 0.9
    });
  });

  it('persists the decision in sessionStorage and reuses it after a reload', () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    const first = sampler.getDecision();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual(first);

    // A new SDK instance in the same tab (same session id) sees a lower rate, but keeps the
    // original decision and rate.
    const { sampler: reloaded } = createSampler(
      { samplingRate: 0.01 },
      SESSION_LOW
    );
    expect(reloaded.getDecision()).toEqual(first);
  });

  it('ignores a persisted decision for a different session', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: 'other', sampled: false, samplingRate: 0.1 })
    );
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    expect(sampler.getDecision()).toMatchObject({
      sessionId: SESSION_LOW,
      sampled: true,
      samplingRate: 0.5
    });
  });

  it('keeps the decisions of apps sharing a session apart, across reloads', () => {
    // SESSION_MID (bucket 6018) is sampled at app A's rate of 0.9 but not at app B's rate of 0.5.
    const { sampler: appA } = createSampler({ samplingRate: 0.9 }, SESSION_MID);
    const { sampler: appB } = createSampler(
      { samplingRate: 0.5 },
      SESSION_MID,
      OTHER_APP_STORAGE_KEY
    );
    const decisionA = appA.getDecision();
    const decisionB = appB.getDecision();
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
      OTHER_APP_STORAGE_KEY
    );
    expect(reloadedA.getDecision()).toEqual(decisionA);
    expect(reloadedB.getDecision()).toEqual(decisionB);
  });

  it('stops the config refresh once the decision is made', () => {
    const { sampler, store } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    expect(store.stopCount).toBe(0);

    sampler.getDecision();
    expect(store.stopCount).toBe(1);

    // Later exports reuse the decision without stopping again.
    sampler.getDecision();
    expect(store.stopCount).toBe(1);
  });

  it('stops the config refresh when it restores a saved decision after a reload', () => {
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    sampler.getDecision();

    const { sampler: reloaded, store: reloadedStore } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    reloaded.getDecision();
    expect(reloadedStore.refreshCount).toBe(0);
    expect(reloadedStore.stopCount).toBe(1);
  });

  describe('applySampling', () => {
    it('stamps the sampling rate on every record of a sampled session', () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
      const records = [
        { attributes: { existing: 'value' } },
        { attributes: {} }
      ];

      expect(sampler.applySampling(records)).toBe(true);
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

    it('leaves the records untouched and returns false for an unsampled session', () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const records = [{ attributes: { existing: 'value' } }];

      expect(sampler.applySampling(records)).toBe(false);
      expect(records).toEqual([{ attributes: { existing: 'value' } }]);
    });

    it('also stamps session.sampling.forced on every record of a debug session', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const records = [
        { attributes: { existing: 'value' } },
        { attributes: {} }
      ];

      expect(sampler.applySampling(records)).toBe(true);
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

  describe('debug override', () => {
    it('forces sampling even when there is no session id', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, undefined);
      expect(sampler.getDecision()).toEqual({
        sessionId: undefined,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('forces sampling via the global flag and stamps 1.0 instead of the configured rate', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.01 }, SESSION_HIGH);
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('forces sampling via the sessionStorage marker and stamps 1.0', () => {
      sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
      const { sampler } = createSampler({ samplingRate: 0.25 }, SESSION_HIGH);
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('forces sampling even when collection is paused (rate 0.0)', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0 }, SESSION_HIGH);
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('does not force sampling when telemetry is disabled', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: false,
        samplingRate: 0
      });
    });

    it('switches to a debug decision mid-session even while collection is paused', () => {
      const { sampler } = createSampler({ samplingRate: 0 }, SESSION_HIGH);
      expect(sampler.getDecision().sampled).toBe(false);

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('does not switch to a debug decision mid-session when telemetry is disabled', () => {
      const { sampler } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      expect(sampler.getDecision().sampled).toBe(false);

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const records = [{ attributes: {} }];
      expect(sampler.applySampling(records)).toBe(false);
      expect(records).toEqual([{ attributes: {} }]);
    });

    it('refreshes the config without waiting until the session is forced, so re-enabling telemetry is picked up', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler, store } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      expect(sampler.getDecision().sampled).toBe(false);
      expect(store.refreshCount).toBe(1);

      // The refresh returns after that decision: telemetry was re-enabled.
      store.config = { samplingRate: 0.5, enabled: true };
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
      expect(store.refreshCount).toBe(2);

      // The forced decision is kept without refreshing again.
      sampler.getDecision();
      expect(store.refreshCount).toBe(2);
    });

    it('avoids redundant sessionStorage I/O on repeated unforced debug checks while disabled', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler, store } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      try {
        expect(sampler.getDecision().sampled).toBe(false);
        expect(getItemSpy).toHaveBeenCalledTimes(1);
        expect(setItemSpy).toHaveBeenCalledTimes(1);
        expect(store.stopCount).toBe(1);

        // Subsequent calls hit the in-memory decision instead of sessionStorage.
        expect(sampler.getDecision().sampled).toBe(false);
        expect(sampler.getDecision().sampled).toBe(false);
        expect(getItemSpy).toHaveBeenCalledTimes(1);
        expect(setItemSpy).toHaveBeenCalledTimes(1);
        expect(store.stopCount).toBe(1);
      } finally {
        getItemSpy.mockRestore();
        setItemSpy.mockRestore();
      }
    });

    it('skips checking debug override once a session is forced', () => {
      sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      try {
        expect(sampler.getDecision().forced).toBe(true);
        const initialReads = getItemSpy.mock.calls.length;
        expect(initialReads).toBeGreaterThan(0);

        // Once forced, later calls return cached without reading sessionStorage again.
        expect(sampler.getDecision().forced).toBe(true);
        expect(sampler.getDecision().forced).toBe(true);
        expect(getItemSpy).toHaveBeenCalledTimes(initialReads);
      } finally {
        getItemSpy.mockRestore();
      }
    });

    it('does not refresh the config for decisions made without the debug override', () => {
      const { sampler, store } = createSampler(
        { samplingRate: 0, enabled: false },
        SESSION_HIGH
      );
      sampler.getDecision();
      sampler.getDecision();
      expect(store.refreshCount).toBe(0);
    });

    it('overrides a previously cached unsampled decision when enabled mid-session', () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      expect(sampler.getDecision().sampled).toBe(false);

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('overrides a previously cached sampled decision when enabled mid-session', () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_LOW,
        sampled: true,
        samplingRate: 0.5
      });

      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      expect(sampler.getDecision()).toEqual({
        sessionId: SESSION_LOW,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('overrides a decision restored after a reload once the override is on', () => {
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      expect(sampler.getDecision().sampled).toBe(false);

      // E.g. the page is reloaded with `?firebase_telemetry_debug=true`, which sets this marker.
      sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
      const { sampler: reloaded } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH
      );
      expect(reloaded.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });
    });

    it('keeps the debug decision after the override is turned off, including after a reload', () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] =
        true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      const debugDecision = sampler.getDecision();
      expect(debugDecision).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 1,
        forced: true
      });

      delete (globalThis as Record<string, unknown>)[
        TELEMETRY_DEBUG_GLOBAL_FLAG
      ];
      expect(sampler.getDecision()).toEqual(debugDecision);

      const { sampler: reloaded } = createSampler(
        { samplingRate: 0.5 },
        SESSION_HIGH
      );
      expect(reloaded.getDecision()).toEqual(debugDecision);
    });
  });
});
