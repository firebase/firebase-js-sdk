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
  SESSION_STORAGE_DEBUG_KEY,
  SESSION_STORAGE_SAMPLING_DECISION_KEY,
  TELEMETRY_DEBUG_GLOBAL_FLAG
} from '../constants';
import { ClientConfig, ClientConfigStore } from './client-config';
import { isSessionSampled, SessionSampler } from './session-sampler';

// Buckets from the backend's SessionSamplingTest: 1184, 6018 and 8828 out of 10000.
const SESSION_LOW = 'test-session-3';
const SESSION_MID = 'test-session-1';
const SESSION_HIGH = 'sëssion-ü';

class FakeConfigStore {
  config: ClientConfig;
  ready: Promise<void> = Promise.resolve();
  constructor(config: Partial<ClientConfig> = {}) {
    this.config = { enabled: true, samplingRate: 1, ...config };
  }
  whenReady(): Promise<void> {
    return this.ready;
  }
}

function createSampler(
  config: Partial<ClientConfig>,
  sessionId: string | undefined,
  initialWaitMs = 10
): { sampler: SessionSampler; store: FakeConfigStore; attrs: AttributesStore } {
  const store = new FakeConfigStore(config);
  const attrs = new AttributesStore({ projectId: 'p', appId: 'a' });
  if (sessionId) {
    attrs.setSessionId(sessionId);
  }
  const sampler = new SessionSampler(
    store as unknown as ClientConfigStore,
    attrs,
    initialWaitMs
  );
  return { sampler, store, attrs };
}

describe('isSessionSampled', () => {
  it('uses the shared hash buckets', () => {
    expect(isSessionSampled(SESSION_LOW, 0.1185)).toBe(true);
    expect(isSessionSampled(SESSION_LOW, 0.1184)).toBe(false);
    expect(isSessionSampled(SESSION_MID, 0.6019)).toBe(true);
    expect(isSessionSampled(SESSION_MID, 0.6018)).toBe(false);
    expect(isSessionSampled(SESSION_HIGH, 0.8829)).toBe(true);
    expect(isSessionSampled(SESSION_HIGH, 0.8828)).toBe(false);
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
      if (isSessionSampled(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, 0.25)) {
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
    expect(sampler.getSamplingAttribute(decision)).toEqual({
      [ATTR_KEY_SESSION_SAMPLING_RATE]: 0.5
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

  it('drops everything when telemetry is disabled', async () => {
    const { sampler } = createSampler({ enabled: false }, SESSION_LOW);
    expect((await sampler.getDecision()).sampled).toBe(false);
  });

  it('drops everything when the rate is 0.0 (paused)', async () => {
    const { sampler } = createSampler({ samplingRate: 0 }, SESSION_LOW);
    expect((await sampler.getDecision()).sampled).toBe(false);
  });

  it('falls back to a random draw when there is no session id', async () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValue(0.1);
    let { sampler } = createSampler({ samplingRate: 0.5 }, undefined);
    expect(await sampler.getDecision()).toEqual({
      sessionId: undefined,
      sampled: true,
      samplingRate: 0.5
    });

    randomSpy.mockReturnValue(0.9);
    ({ sampler } = createSampler({ samplingRate: 0.5 }, undefined));
    expect((await sampler.getDecision()).sampled).toBe(false);
  });

  it('makes the decision once per session and keeps it across config changes', async () => {
    const { sampler, store } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    const first = await sampler.getDecision();
    expect(first.sampled).toBe(true);

    // Lowering the rate below the session's bucket does not flip the session.
    store.config = { enabled: true, samplingRate: 0.05 };
    expect(await sampler.getDecision()).toEqual(first);
    expect(sampler.decide()).toEqual(first);
  });

  it('re-evaluates when a new session starts', async () => {
    const { sampler, store, attrs } = createSampler(
      { samplingRate: 0.5 },
      SESSION_LOW
    );
    expect((await sampler.getDecision()).sampled).toBe(true);

    store.config = { enabled: true, samplingRate: 0.9 };
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
    expect(
      JSON.parse(sessionStorage.getItem(SESSION_STORAGE_SAMPLING_DECISION_KEY)!)
    ).toEqual(first);

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
      SESSION_STORAGE_SAMPLING_DECISION_KEY,
      JSON.stringify({ sessionId: 'other', sampled: false, samplingRate: 0.1 })
    );
    const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_LOW);
    expect(await sampler.getDecision()).toMatchObject({
      sessionId: SESSION_LOW,
      sampled: true,
      samplingRate: 0.5
    });
  });

  it('waits for the initial config fetch before the first decision', async () => {
    const { sampler, store } = createSampler({ samplingRate: 1 }, SESSION_HIGH, 1000);
    let resolveFetch!: () => void;
    store.ready = new Promise<void>(resolve => {
      resolveFetch = resolve;
    });

    const pending = sampler.getDecision();
    store.config = { enabled: true, samplingRate: 0.5 };
    resolveFetch();

    expect(await pending).toMatchObject({ sampled: false, samplingRate: 0.5 });
  });

  it('does not wait longer than the initial wait for a slow fetch', async () => {
    const { sampler, store } = createSampler({ samplingRate: 1 }, SESSION_HIGH, 5);
    store.ready = new Promise<void>(() => {});
    expect(await sampler.getDecision()).toMatchObject({
      sampled: true,
      samplingRate: 1
    });
  });

  describe('debug override', () => {
    it('forces sampling via the global flag and stamps the configured rate', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = true;
      const { sampler } = createSampler({ samplingRate: 0.5 }, SESSION_HIGH);
      expect(await sampler.getDecision()).toEqual({
        sessionId: SESSION_HIGH,
        sampled: true,
        samplingRate: 0.5
      });
    });

    it('forces sampling via the sessionStorage marker', async () => {
      sessionStorage.setItem(SESSION_STORAGE_DEBUG_KEY, 'true');
      const { sampler } = createSampler({ enabled: false }, SESSION_HIGH);
      expect((await sampler.getDecision()).sampled).toBe(true);
    });

    it('stamps 1.0 when collection is paused', async () => {
      (globalThis as Record<string, unknown>)[TELEMETRY_DEBUG_GLOBAL_FLAG] = true;
      const { sampler } = createSampler({ samplingRate: 0 }, SESSION_HIGH);
      expect(await sampler.getDecision()).toMatchObject({
        sampled: true,
        samplingRate: 1
      });
    });
  });
});
