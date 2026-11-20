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

import { RepoInfo } from '../src/core/RepoInfo';
import { Connection } from '../src/realtime/Connection';
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
  healthyMarked = false;
  readonly initialInternalHost: string;

  constructor(
    public connId: string,
    public repoInfo: RepoInfo,
    public applicationId?: string,
    public appCheckToken?: string,
    public authToken?: string,
    public transportSessionId?: string,
    public lastSessionId?: string
  ) {
    this.initialInternalHost = repoInfo.internalHost;
  }

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

  markConnectionHealthy(): void {
    this.healthyMarked = true;
  }

  triggerMessage(msg: {}): void {
    this.onMessageCb?.(msg);
  }

  triggerDisconnect(everConnected?: boolean, httpStatus?: number): void {
    this.onDisconnectCb?.(everConnected, httpStatus);
  }
}

function createFakeTransportFactory(
  created: FakeTransport[],
  healthyTimeout = 0,
  responsesRequiredToBeHealthy = 0
): TransportConstructor {
  return class extends FakeTransport {
    static isAvailable = () => true;
    static healthyTimeout = healthyTimeout;
    static responsesRequiredToBeHealthy = responsesRequiredToBeHealthy;

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
      created.push(this);
    }
  };
}

describe('Connection reset guard and HTTP status propagation', () => {
  let primaryTransports: FakeTransport[];
  let secondaryTransports: FakeTransport[];
  let initialTransportSpy: ReturnType<typeof vi.spyOn>;
  let upgradeTransportSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    primaryTransports = [];
    secondaryTransports = [];
    initialTransportSpy = vi
      .spyOn(TransportManager.prototype, 'initialTransport')
      .mockImplementation(() => createFakeTransportFactory(primaryTransports));
    upgradeTransportSpy = vi
      .spyOn(TransportManager.prototype, 'upgradeTransport')
      .mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('allows 1 immediate reset redirect during CONNECTING without calling onDisconnect', () => {
    const repoInfo = new RepoInfo('initial.firebaseio.com', true, 'test', true);
    const onDisconnect = vi.fn();
    const onReady = vi.fn();

    new Connection(
      '1',
      repoInfo,
      undefined,
      undefined,
      undefined,
      () => {},
      onReady,
      onDisconnect,
      () => {}
    );

    vi.advanceTimersByTime(0);
    expect(primaryTransports).toHaveLength(1);
    expect(primaryTransports[0].openCalled).toBe(true);
    expect(primaryTransports[0].initialInternalHost).toBe(
      'initial.firebaseio.com'
    );

    // 1st 'r' control packet while CONNECTING restarts transport immediately.
    primaryTransports[0].triggerMessage({
      t: 'c',
      d: { t: 'r', d: 'redirect-1.firebaseio.com' }
    });

    expect(repoInfo.internalHost).toBe('redirect-1.firebaseio.com');
    expect(primaryTransports[0].closeCalled).toBe(true);
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(primaryTransports).toHaveLength(2);
    expect(primaryTransports[1].openCalled).toBe(false);

    // Scheduled via setTimeout(..., 0)
    vi.advanceTimersByTime(0);
    expect(primaryTransports[1].openCalled).toBe(true);
    expect(primaryTransports[1].initialInternalHost).toBe(
      'redirect-1.firebaseio.com'
    );

    // Handshake succeeds on the redirected transport.
    primaryTransports[1].triggerMessage({
      t: 'c',
      d: {
        t: 'h',
        d: {
          ts: 12345,
          v: '5',
          h: 'redirect-1.firebaseio.com',
          s: 'session-1'
        }
      }
    });
    expect(onReady).toHaveBeenCalledWith(12345, 'session-1');
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('closes and invokes onDisconnect on 2nd reset redirect during CONNECTING', () => {
    const repoInfo = new RepoInfo('initial.firebaseio.com', true, 'test', true);
    const onDisconnect = vi.fn();

    new Connection(
      '1',
      repoInfo,
      undefined,
      undefined,
      undefined,
      () => {},
      () => {},
      onDisconnect,
      () => {}
    );

    vi.advanceTimersByTime(0);
    expect(primaryTransports).toHaveLength(1);

    // 1st reset restarts transport.
    primaryTransports[0].triggerMessage({
      t: 'c',
      d: { t: 'r', d: 'redirect-1.firebaseio.com' }
    });
    vi.advanceTimersByTime(0);
    expect(primaryTransports).toHaveLength(2);
    expect(onDisconnect).not.toHaveBeenCalled();

    // 2nd reset on the same Connection while still CONNECTING breaks the loop via close().
    primaryTransports[1].triggerMessage({
      t: 'c',
      d: { t: 'r', d: 'redirect-2.firebaseio.com' }
    });

    expect(repoInfo.internalHost).toBe('redirect-2.firebaseio.com');
    expect(primaryTransports[1].closeCalled).toBe(true);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(undefined);

    vi.runAllTimers();
    expect(primaryTransports).toHaveLength(2);
  });

  it('closes and invokes onDisconnect on reset packet while CONNECTED', () => {
    const repoInfo = new RepoInfo('initial.firebaseio.com', true, 'test', true);
    const onDisconnect = vi.fn();
    const onReady = vi.fn();

    new Connection(
      '1',
      repoInfo,
      undefined,
      undefined,
      undefined,
      () => {},
      onReady,
      onDisconnect,
      () => {}
    );

    vi.advanceTimersByTime(0);
    primaryTransports[0].triggerMessage({
      t: 'c',
      d: {
        t: 'h',
        d: { ts: 100, v: '5', h: 'initial.firebaseio.com', s: 'sess-1' }
      }
    });
    expect(onReady).toHaveBeenCalledTimes(1);

    primaryTransports[0].triggerMessage({
      t: 'c',
      d: { t: 'r', d: 'redirect-after-connect.firebaseio.com' }
    });

    expect(repoInfo.internalHost).toBe('redirect-after-connect.firebaseio.com');
    expect(primaryTransports[0].closeCalled).toBe(true);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(undefined);
    expect(primaryTransports).toHaveLength(1);
  });

  for (const httpStatus of [402, 429]) {
    it(`forwards HTTP ${httpStatus} from primary Transport.onDisconnect to Connection onDisconnect`, () => {
      const repoInfo = new RepoInfo('test.firebaseio.com', true, 'test', true);
      const onDisconnect = vi.fn();

      new Connection(
        '1',
        repoInfo,
        undefined,
        undefined,
        undefined,
        () => {},
        () => {},
        onDisconnect,
        () => {}
      );

      vi.advanceTimersByTime(0);
      primaryTransports[0].triggerDisconnect(false, httpStatus);

      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledWith(httpStatus);
    });
  }

  it('forwards undefined when primary Transport.onDisconnect omits httpStatus', () => {
    const repoInfo = new RepoInfo('test.firebaseio.com', true, 'test', true);
    const onDisconnect = vi.fn();

    new Connection(
      '1',
      repoInfo,
      undefined,
      undefined,
      undefined,
      () => {},
      () => {},
      onDisconnect,
      () => {}
    );

    vi.advanceTimersByTime(0);
    primaryTransports[0].triggerDisconnect(false);

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(undefined);
  });

  it('forwards undefined on healthy timeout or external close()', () => {
    initialTransportSpy.mockImplementation(() =>
      createFakeTransportFactory(primaryTransports, 30000, 2)
    );
    const repoInfo = new RepoInfo('test.firebaseio.com', true, 'test', true);
    const onDisconnect = vi.fn();

    const conn = new Connection(
      '1',
      repoInfo,
      undefined,
      undefined,
      undefined,
      () => {},
      () => {},
      onDisconnect,
      () => {}
    );

    vi.advanceTimersByTime(30000);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(undefined);

    // Calling close() again after already disconnected does not fire again.
    conn.close(429);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('forwards httpStatus from secondary Transport when connection has switched tx_ to secondary', () => {
    upgradeTransportSpy.mockImplementation(() =>
      createFakeTransportFactory(secondaryTransports)
    );
    const repoInfo = new RepoInfo('test.firebaseio.com', true, 'test', false);
    const onDisconnect = vi.fn();

    new Connection(
      '1',
      repoInfo,
      undefined,
      undefined,
      undefined,
      () => {},
      () => {},
      onDisconnect,
      () => {}
    );

    vi.advanceTimersByTime(0);
    // Complete handshake on primary to trigger upgradeTransport.
    primaryTransports[0].triggerMessage({
      t: 'c',
      d: {
        t: 'h',
        d: { ts: 100, v: '5', h: 'test.firebaseio.com', s: 'sess-1' }
      }
    });
    expect(secondaryTransports).toHaveLength(1);
    expect(secondaryTransports[0].openCalled).toBe(true);

    // Complete upgrade handshake so tx_ becomes secondaryConn_.
    secondaryTransports[0].triggerMessage({
      t: 'c',
      d: { t: 'a', d: {} }
    });
    expect(onDisconnect).not.toHaveBeenCalled();

    // Secondary disconnects with HTTP 429 after tx_ switched to it.
    secondaryTransports[0].triggerDisconnect(true, 429);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(429);
  });
});
