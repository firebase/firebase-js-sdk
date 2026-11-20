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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppCheckTokenProvider } from '../src/core/AppCheckTokenProvider';
import { AuthTokenProvider } from '../src/core/AuthTokenProvider';
import { PersistentConnection } from '../src/core/PersistentConnection';
import { RepoInfo } from '../src/core/RepoInfo';
import { EventEmitter } from '../src/core/util/EventEmitter';
import { OnlineMonitor } from '../src/core/util/OnlineMonitor';
import {
  RECONNECT_DELAY_RESET_TIMEOUT,
  RECONNECT_MAX_DELAY_DEFAULT,
  RECONNECT_MAX_DELAY_FOR_ADMINS,
  RECONNECT_MIN_DELAY
} from '../src/core/util/RetryHelper';
import { VisibilityMonitor } from '../src/core/util/VisibilityMonitor';
import { Transport, TransportConstructor } from '../src/realtime/Transport';
import { TransportManager } from '../src/realtime/TransportManager';

class FakeTransport implements Transport {
  bytesReceived = 0;
  bytesSent = 0;
  onMessageCb: ((msg: {}) => void) | null = null;
  onDisconnectCb:
    ((everConnected?: boolean, httpStatus?: number) => void) | null = null;
  openCalled = false;
  startCalled = false;
  closeCalled = false;
  sentMessages: Array<{}> = [];

  constructor(
    public connId: string,
    public repoInfo: RepoInfo,
    public applicationId?: string,
    public appCheckToken?: string,
    public authToken?: string,
    public transportSessionId?: string,
    public lastSessionId?: string
  ) {}

  open(
    onMessage: (a: {}) => void,
    onDisconnect: (a?: boolean, httpStatus?: number) => void
  ): void {
    this.openCalled = true;
    this.onMessageCb = onMessage;
    this.onDisconnectCb = onDisconnect;
  }

  start(): void {
    this.startCalled = true;
  }

  close(): void {
    this.closeCalled = true;
  }

  send(data: {}): void {
    this.sentMessages.push(data);
  }

  markConnectionHealthy(): void {}

  triggerReady(sessionId = 'sess-1'): void {
    expect(this.openCalled).toBe(true);
    this.onMessageCb!({
      t: 'c',
      d: {
        t: 'h',
        d: {
          ts: Date.now(),
          v: '5',
          h: this.repoInfo.host,
          s: sessionId
        }
      }
    });
  }

  triggerAuthRevoked(statusCode: string, explanation = 'revoked'): void {
    expect(this.openCalled).toBe(true);
    this.onMessageCb!({
      t: 'd',
      d: {
        a: 'ac',
        b: { s: statusCode, d: explanation }
      }
    });
  }

  triggerDisconnect(everConnected = false, httpStatus?: number): void {
    expect(this.openCalled).toBe(true);
    this.onDisconnectCb!(everConnected, httpStatus);
  }
}

class FakeVisibilityMonitor extends EventEmitter {
  private visible_ = true;

  constructor() {
    super(['visible']);
  }

  getInitialEvent(): boolean[] {
    return [this.visible_];
  }

  setVisible(visible: boolean): void {
    this.visible_ = visible;
    this.trigger('visible', visible);
  }
}

class FakeOnlineMonitor extends EventEmitter {
  private online_ = true;

  constructor() {
    super(['online']);
  }

  getInitialEvent(): boolean[] {
    return [this.online_];
  }

  currentlyOnline(): boolean {
    return this.online_;
  }

  setOnline(online: boolean): void {
    this.online_ = online;
    this.trigger('online', online);
  }
}

interface TestHarness {
  pc: PersistentConnection;
  transports: FakeTransport[];
  visibilityMonitor: FakeVisibilityMonitor;
  onlineMonitor: FakeOnlineMonitor;
  onConnectStatus: ReturnType<typeof vi.fn>;
  authProvider: AuthTokenProvider;
  appCheckProvider: AppCheckTokenProvider;
  scheduledDelays: number[];
  lastScheduledDelay: () => number;
  lastTransport: () => FakeTransport;
}

/**
 * Advances fake timers by `ms` to fire `scheduleConnect_`, flushes token
 * promises in `establishConnection_()`, and runs `Connection.start_()`'s
 * 0ms `open()` timer so the created `FakeTransport` is opened.
 */
async function advanceAndConnect(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  await vi.advanceTimersToNextTimerAsync();
}

describe('PersistentConnection reconnect backoff', () => {
  let delaysByInstance: Map<PersistentConnection, number[]>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
    delaysByInstance = new Map();

    const proto = PersistentConnection.prototype as unknown as {
      scheduleConnect_(timeout: number): void;
    };
    const origScheduleConnect = proto.scheduleConnect_;
    vi.spyOn(proto, 'scheduleConnect_').mockImplementation(function (
      this: PersistentConnection,
      timeout: number
    ) {
      let arr = delaysByInstance.get(this);
      if (!arr) {
        arr = [];
        delaysByInstance.set(this, arr);
      }
      arr.push(timeout);
      return origScheduleConnect.call(this, timeout);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function createHarness(
    options: {
      host?: string;
      authGetToken?: () => Promise<{ accessToken: string } | null>;
    } = {}
  ): TestHarness {
    const transports: FakeTransport[] = [];
    const TransportClass: TransportConstructor = class extends FakeTransport {
      static isAvailable = () => true;
      static healthyTimeout = 0;
      static responsesRequiredToBeHealthy = 0;

      constructor(
        connId: string,
        repoInfo: RepoInfo,
        applicationId?: string,
        appCheckToken?: string,
        authToken?: string,
        transportSessionId?: string,
        lastSessionId?: string
      ) {
        super(
          connId,
          repoInfo,
          applicationId,
          appCheckToken,
          authToken,
          transportSessionId,
          lastSessionId
        );
        transports.push(this);
      }
    };

    vi.spyOn(TransportManager.prototype, 'initialTransport').mockReturnValue(
      TransportClass
    );
    vi.spyOn(TransportManager.prototype, 'upgradeTransport').mockReturnValue(
      null
    );

    const visibilityMonitor = new FakeVisibilityMonitor();
    const onlineMonitor = new FakeOnlineMonitor();

    vi.spyOn(VisibilityMonitor, 'getInstance').mockReturnValue(
      visibilityMonitor as unknown as VisibilityMonitor
    );
    vi.spyOn(OnlineMonitor, 'getInstance').mockReturnValue(
      onlineMonitor as unknown as OnlineMonitor
    );

    const authProvider: AuthTokenProvider = {
      getToken: vi.fn(
        options.authGetToken ?? (() => Promise.resolve({ accessToken: 'tok' }))
      ),
      addTokenChangeListener: vi.fn(),
      removeTokenChangeListener: vi.fn(),
      notifyForInvalidToken: vi.fn()
    };

    const appCheckProvider = {
      getToken: vi.fn(() => Promise.resolve({ token: 'app-check-tok' })),
      addTokenChangeListener: vi.fn(),
      notifyForInvalidToken: vi.fn()
    } as unknown as AppCheckTokenProvider;

    const onConnectStatus = vi.fn();
    const repoInfo = new RepoInfo(
      options.host ?? 'test.firebaseio.com',
      true,
      'test',
      false
    );

    const pc = new PersistentConnection(
      repoInfo,
      'app-id',
      vi.fn(),
      onConnectStatus,
      vi.fn(),
      authProvider,
      appCheckProvider
    );

    let scheduledDelays = delaysByInstance.get(pc);
    if (!scheduledDelays) {
      scheduledDelays = [];
      delaysByInstance.set(pc, scheduledDelays);
    }

    return {
      pc,
      transports,
      visibilityMonitor,
      onlineMonitor,
      onConnectStatus,
      authProvider,
      appCheckProvider,
      scheduledDelays,
      lastScheduledDelay: () => {
        expect(scheduledDelays!.length).toBeGreaterThan(0);
        return scheduledDelays![scheduledDelays!.length - 1];
      },
      lastTransport: () => {
        expect(transports.length).toBeGreaterThan(0);
        return transports[transports.length - 1];
      }
    };
  }

  /** Creates an unsigned JWT string with `{ admin: true }` payload. */
  function makeAdminJwt(): string {
    const toBase64Url = (obj: object): string => {
      const json = JSON.stringify(obj);
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };
    return `${toBase64Url({ alg: 'none', typ: 'JWT' })}.${toBase64Url({
      admin: true
    })}.sig`;
  }

  describe('Minimum, Moderate, FiveMinutes, and Centered jitter', () => {
    it('schedules initial connect at 0ms via onOnline_ and initConnection_', async () => {
      // Non-fblocal schedules 0ms via OnlineMonitor initial event.
      const h1 = createHarness({ host: 'test.firebaseio.com' });
      expect(h1.scheduledDelays).toEqual([0]);
      await advanceAndConnect(0);
      expect(h1.transports).toHaveLength(1);
      expect(h1.transports[0].openCalled).toBe(true);

      // fblocal waits for initConnection_() and schedules 0ms on first request.
      const h2 = createHarness({ host: 'localhost:9000/?ns=fblocal' });
      expect(h2.scheduledDelays).toEqual([]);
      h2.pc.onDisconnectCancel('/test');
      expect(h2.scheduledDelays).toEqual([0]);
      await advanceAndConnect(0);
      expect(h2.transports).toHaveLength(1);
      expect(h2.transports[0].openCalled).toBe(true);
    });

    it('progresses from 1000ms by 1.5x up to 300,000ms with centered +/-50% jitter', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { lastScheduledDelay, lastTransport } = createHarness();

      await advanceAndConnect(0);
      expect(lastTransport().openCalled).toBe(true);

      const expectedBases = [
        RECONNECT_MIN_DELAY,
        1500,
        2250,
        3375,
        5062.5,
        7593.75
      ];
      for (const expectedBase of expectedBases) {
        lastTransport().triggerDisconnect(false);
        expect(lastScheduledDelay()).toBe(expectedBase);
        await advanceAndConnect(Math.floor(lastScheduledDelay()));
      }

      // Continue failing until capped at 300,000ms.
      for (let i = 0; i < 20; i++) {
        lastTransport().triggerDisconnect(false);
        await advanceAndConnect(Math.floor(lastScheduledDelay()));
      }
      lastTransport().triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);
    });

    it('applies centered +/-50% jitter bounds on first retry and max cap', async () => {
      const randomSpy = vi.spyOn(Math, 'random');

      // Lower bound (random = 0 -> 0.5 * base = 500ms)
      randomSpy.mockReturnValue(0);
      const low = createHarness();
      await advanceAndConnect(0);
      low.lastTransport().triggerDisconnect(false);
      expect(low.lastScheduledDelay()).toBe(500);

      // Push low harness to 300,000ms cap -> lower bound is 150,000ms.
      for (let i = 0; i < 20; i++) {
        await advanceAndConnect(Math.floor(low.lastScheduledDelay()));
        low.lastTransport().triggerDisconnect(false);
      }
      expect(low.lastScheduledDelay()).toBe(150_000);

      // Upper bound (random = 0.9999 -> ~1.5 * base < 1500ms)
      randomSpy.mockReturnValue(0.9999);
      const high = createHarness();
      await advanceAndConnect(0);
      high.lastTransport().triggerDisconnect(false);
      expect(high.lastScheduledDelay()).toBeGreaterThanOrEqual(1499);
      expect(high.lastScheduledDelay()).toBeLessThan(1500);

      // Push high harness to 300,000ms cap -> upper bound is [449,900, 450,000).
      for (let i = 0; i < 20; i++) {
        await advanceAndConnect(Math.floor(high.lastScheduledDelay()));
        high.lastTransport().triggerDisconnect(false);
      }
      expect(high.lastScheduledDelay()).toBeGreaterThanOrEqual(449_900);
      expect(high.lastScheduledDelay()).toBeLessThan(450_000);
    });
  });

  describe('Disconnect timing', () => {
    it('does not subtract elapsed connection attempt time on failure before ready', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, lastScheduledDelay } = createHarness();

      await advanceAndConnect(0);
      expect(transports).toHaveLength(1);

      // 1st attempt hangs for 20s before failing without becoming ready.
      await vi.advanceTimersByTimeAsync(20_000);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);

      await advanceAndConnect(1000);
      expect(transports).toHaveLength(2);

      // 2nd attempt hangs for 60s before failing without becoming ready.
      await vi.advanceTimersByTimeAsync(60_000);
      transports[1].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1500);
    });

    it('does not subtract elapsed token fetch time when getToken() fails slowly', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      let rejectToken!: (err: Error) => void;
      const { lastScheduledDelay } = createHarness({
        authGetToken: () =>
          new Promise((_, reject) => {
            rejectToken = reject;
          })
      });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(25_000);
      rejectToken(new Error('token fetch timeout'));
      await vi.advanceTimersByTimeAsync(0);

      expect(lastScheduledDelay()).toBe(1000);
    });
  });

  describe('Sustained connections and resume()', () => {
    it('keeps advancing backoff when disconnected at <= 30,000ms after onReady_', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, lastScheduledDelay } = createHarness();

      // Fail once so next step on ladder is 1500ms.
      await advanceAndConnect(0);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);

      // Reconnect and become ready, then disconnect after exactly 30,000ms.
      await advanceAndConnect(1000);
      transports[1].triggerReady('sess-1');
      await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_RESET_TIMEOUT);
      transports[1].triggerDisconnect(true);

      // Because elapsed === 30,000ms (not > 30,000ms), ladder does not reset.
      expect(lastScheduledDelay()).toBe(1500);
    });

    it('resets backoff to 1000ms when disconnected > 30,000ms after onReady_', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, lastScheduledDelay } = createHarness();

      // Advance ladder: 1000 -> 1500 -> 2250.
      await advanceAndConnect(0);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
      await advanceAndConnect(1000);
      transports[1].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1500);

      // Connect and stay ready for 30,001ms, then disconnect.
      await advanceAndConnect(1500);
      transports[2].triggerReady('sess-2');
      await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_RESET_TIMEOUT + 1);
      transports[2].triggerDisconnect(true);

      expect(lastScheduledDelay()).toBe(1000);
    });

    it('resets backoff on resume() after interrupt()', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { pc, transports, lastScheduledDelay } = createHarness();

      // Advance ladder past 1000ms.
      await advanceAndConnect(0);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
      await advanceAndConnect(1000);
      transports[1].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1500);
      await advanceAndConnect(1500);
      expect(transports).toHaveLength(3);

      // Interrupt and resume.
      pc.interrupt('manual');
      pc.resume('manual');
      expect(lastScheduledDelay()).toBe(0);

      await advanceAndConnect(0);
      expect(transports).toHaveLength(4);

      // Subsequent disconnect starts back at 1000ms.
      transports[3].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
    });
  });

  describe('PreserveLadder and SeparateHide', () => {
    it('onOnline_(true) reconnects immediately at 0ms without resetting backoff ladder', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, onlineMonitor, lastScheduledDelay } = createHarness();

      // Advance ladder: 1000 consumed -> next is 1500 -> 2250.
      await advanceAndConnect(0);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
      await advanceAndConnect(1000);
      transports[1].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1500);
      await advanceAndConnect(1500);
      expect(transports).toHaveLength(3);

      // Go offline while connection attempt 3 is active.
      onlineMonitor.setOnline(false);
      expect(transports[2].closeCalled).toBe(true);

      // Come back online -> immediate 0ms connect, ladder preserved at 2250ms.
      onlineMonitor.setOnline(true);
      expect(lastScheduledDelay()).toBe(0);
      await advanceAndConnect(0);
      expect(transports).toHaveLength(4);

      transports[3].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(2250);
    });

    it('onOnline_(true) does not schedule connect while interrupted', async () => {
      const { pc, onlineMonitor, scheduledDelays } = createHarness();

      await advanceAndConnect(0);
      pc.interrupt('test_reason');
      onlineMonitor.setOnline(false);
      const countBeforeOnline = scheduledDelays.length;

      onlineMonitor.setOnline(true);
      expect(scheduledDelays.length).toBe(countBeforeOnline);
    });

    it('SeparateHide schedules [150s, 450s) while hidden and resumes underlying ladder on visible', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, visibilityMonitor, lastScheduledDelay } =
        createHarness();

      // Advance ladder: first failure uses 1000ms, next step is 1500ms.
      await advanceAndConnect(0);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
      await advanceAndConnect(1000);
      expect(transports).toHaveLength(2);

      // Tab goes hidden, then connection disconnects -> 300,000ms (max) without mutating ladder.
      visibilityMonitor.setVisible(false);
      transports[1].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);

      // Tab becomes visible -> cancels 300s timer and schedules 0ms immediately.
      visibilityMonitor.setVisible(true);
      expect(lastScheduledDelay()).toBe(0);

      await advanceAndConnect(0);
      expect(transports).toHaveLength(3);
      expect(vi.getTimerCount()).toBe(0);

      // Immediate post-visible attempt fails -> resumes from 1500ms, NOT 300s or 1000ms.
      transports[2].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1500);
    });

    it('resets underlying ladder when disconnecting while hidden after > 30s sustained connection', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, visibilityMonitor, lastScheduledDelay } =
        createHarness();

      // Advance ladder to 1500ms.
      await advanceAndConnect(0);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
      await advanceAndConnect(1000);

      // Connect and sustain for > 30s, then hide and disconnect.
      transports[1].triggerReady('sess-hidden-sustained');
      await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_RESET_TIMEOUT + 1);
      visibilityMonitor.setVisible(false);
      transports[1].triggerDisconnect(true);

      // Hidden disconnect still waits 300,000ms.
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);

      // Returning visible schedules 0ms, and failing uses reset 1000ms.
      visibilityMonitor.setVisible(true);
      expect(lastScheduledDelay()).toBe(0);
      await advanceAndConnect(0);
      transports[2].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(1000);
    });

    it('onVisible_(true) does not spuriously schedule connect when offline, interrupted, or on fblocal init', async () => {
      // Case 1: fblocal constructor receives synchronous initial visible=true without scheduling.
      const fblocal = createHarness({ host: 'localhost:9000/?ns=fblocal' });
      expect(fblocal.scheduledDelays).toEqual([]);
      fblocal.visibilityMonitor.setVisible(false);
      fblocal.visibilityMonitor.setVisible(true);
      expect(fblocal.scheduledDelays).toEqual([]);

      // Case 2: offline + hidden -> visible does not schedule connect.
      const offline = createHarness();
      await advanceAndConnect(0);
      offline.visibilityMonitor.setVisible(false);
      offline.onlineMonitor.setOnline(false);
      const offlineCalls = offline.scheduledDelays.length;
      offline.visibilityMonitor.setVisible(true);
      expect(offline.scheduledDelays.length).toBe(offlineCalls);

      // Case 3: interrupted + hidden -> visible does not schedule connect.
      const interrupted = createHarness();
      await advanceAndConnect(0);
      interrupted.visibilityMonitor.setVisible(false);
      interrupted.pc.interrupt('paused');
      const interruptedCalls = interrupted.scheduledDelays.length;
      interrupted.visibilityMonitor.setVisible(true);
      expect(interrupted.scheduledDelays.length).toBe(interruptedCalls);
    });
  });

  describe('Escalate (402 / 429) and EscalateOverridesAdmin', () => {
    for (const httpStatus of [402, 429]) {
      it(`jumps immediately to [150s, 450s) on HTTP ${httpStatus} for normal clients`, async () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const { transports, lastScheduledDelay } = createHarness();

        await advanceAndConnect(0);
        transports[0].triggerReady('sess-esc');
        // Even after > 30s sustained connection, 402/429 escalates instead of resetting.
        await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_RESET_TIMEOUT + 5000);
        transports[0].triggerDisconnect(true, httpStatus);
        expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);

        // Verify jitter bounds [150s, 450s) on escalated delay.
        randomSpy.mockReturnValue(0);
        await advanceAndConnect(RECONNECT_MAX_DELAY_DEFAULT);
        transports[1].triggerDisconnect(false, httpStatus);
        expect(lastScheduledDelay()).toBe(150_000);

        randomSpy.mockReturnValue(0.9999);
        await advanceAndConnect(150_000);
        transports[2].triggerDisconnect(false, httpStatus);
        expect(lastScheduledDelay()).toBeGreaterThanOrEqual(449_900);
        expect(lastScheduledDelay()).toBeLessThan(450_000);
      });

      it(`overrides 30s admin cap on HTTP ${httpStatus} and returns to 30s cap on subsequent normal disconnect`, async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const { pc, lastScheduledDelay, lastTransport } = createHarness();

        // 40-char Firebase secret sets admin cap (30,000ms).
        pc.refreshAuthToken('s'.repeat(40));

        await advanceAndConnect(0);
        // Advance to admin cap via normal disconnects.
        for (let i = 0; i < 12; i++) {
          lastTransport().triggerDisconnect(false);
          await advanceAndConnect(Math.floor(lastScheduledDelay()));
        }
        lastTransport().triggerDisconnect(false);
        expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_FOR_ADMINS);

        // HTTP 402/429 overrides admin cap to 300,000ms.
        await advanceAndConnect(RECONNECT_MAX_DELAY_FOR_ADMINS);
        lastTransport().triggerDisconnect(false, httpStatus);
        expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);

        // Subsequent normal disconnect returns to 30,000ms admin cap.
        await advanceAndConnect(RECONNECT_MAX_DELAY_DEFAULT);
        lastTransport().triggerDisconnect(false);
        expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_FOR_ADMINS);
      });
    }

    it('detects JWT admin tokens and escalates to 300s even while hidden', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { pc, transports, visibilityMonitor, lastScheduledDelay } =
        createHarness();

      pc.refreshAuthToken(makeAdminJwt());
      await advanceAndConnect(0);

      // Normal hidden disconnect for admin uses 30,000ms.
      visibilityMonitor.setVisible(false);
      transports[0].triggerDisconnect(false);
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_FOR_ADMINS);

      // Visible again -> 0ms -> hidden 429 escalates to 300,000ms.
      visibilityMonitor.setVisible(true);
      await advanceAndConnect(0);
      visibilityMonitor.setVisible(false);
      transports[1].triggerDisconnect(false, 429);
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);
    });
  });

  describe('onAuthRevoked_()', () => {
    it('clamps current delay to >= 30,000ms on the 3rd invalid_token/permission_denied and notifies provider', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { transports, authProvider, lastScheduledDelay } = createHarness();

      await advanceAndConnect(0);

      // 1st revocation ('invalid_token'): normal ladder (1000ms), no notify.
      transports[0].triggerAuthRevoked('invalid_token', 'expired');
      expect(transports[0].closeCalled).toBe(true);
      expect(lastScheduledDelay()).toBe(1000);
      expect(authProvider.notifyForInvalidToken).not.toHaveBeenCalled();

      // 2nd revocation ('permission_denied'): normal ladder (1500ms), no notify.
      await advanceAndConnect(1000);
      transports[1].triggerAuthRevoked('permission_denied', 'denied');
      expect(transports[1].closeCalled).toBe(true);
      expect(lastScheduledDelay()).toBe(1500);
      expect(authProvider.notifyForInvalidToken).not.toHaveBeenCalled();

      // 3rd revocation: clamps immediately to >= 30,000ms right on 3rd disconnect and notifies.
      await advanceAndConnect(1500);
      transports[2].triggerAuthRevoked('invalid_token', 'still invalid');
      expect(transports[2].closeCalled).toBe(true);
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_FOR_ADMINS);
      expect(authProvider.notifyForInvalidToken).toHaveBeenCalledTimes(1);
    });

    it('does not lower an already higher backoff delay (>= 120s or 300s from 429)', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { authProvider, lastScheduledDelay, lastTransport } =
        createHarness();

      await advanceAndConnect(0);

      // Push ladder above 120,000ms (1000 * 1.5^12 = 129,746.337890625ms).
      for (let i = 0; i < 12; i++) {
        lastTransport().triggerDisconnect(false);
        await advanceAndConnect(Math.floor(lastScheduledDelay()));
      }

      // Trigger 3 invalid_token revocations while delay is > 120,000ms.
      for (let i = 0; i < 3; i++) {
        lastTransport().triggerAuthRevoked('invalid_token', 'bad token');
        const scheduled = lastScheduledDelay();
        expect(scheduled).toBeGreaterThan(120_000);
        await advanceAndConnect(Math.floor(scheduled));
      }
      expect(authProvider.notifyForInvalidToken).toHaveBeenCalledTimes(1);

      // Trigger 429 escalation to 300,000ms, then an invalid_token revocation -> stays 300,000ms.
      lastTransport().triggerDisconnect(false, 429);
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);
      await advanceAndConnect(RECONNECT_MAX_DELAY_DEFAULT);

      lastTransport().triggerAuthRevoked('invalid_token', 'still bad');
      expect(lastScheduledDelay()).toBe(RECONNECT_MAX_DELAY_DEFAULT);
    });
  });
});
