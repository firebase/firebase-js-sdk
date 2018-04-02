/**
 * Copyright 2018 Google Inc.
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

import { OnlineState } from '../core/types';
import * as log from '../util/log';
import { assert } from '../util/assert';
import { AsyncQueue, TimerId } from '../util/async_queue';
import { CancelablePromise } from '../util/promise';

const LOG_TAG = 'OnlineStateTracker';

// To deal with transient failures, we allow multiple stream attempts before
// giving up and transitioning from OnlineState.Unknown to Offline.
const MAX_WATCH_STREAM_FAILURES = 2;

// To deal with stream attempts that don't succeed or fail in a timely manner,
// we have a timeout for OnlineState to reach Online or Offline.
// If the timeout is reached, we transition to Offline rather than waiting
// indefinitely.
const ONLINE_STATE_TIMEOUT_MS = 10 * 1000;

/**
 * A component used by the RemoteStore to track the OnlineState (that is,
 * whether or not the client as a whole should be considered to be online or
 * offline), implementing the appropriate heuristics.
 *
 * In particular, when the client is trying to connect to the backend, we
 * allow up to MAX_WATCH_STREAM_FAILURES within ONLINE_STATE_TIMEOUT_MS for
 * a connection to succeed. If we have too many failures or the timeout elapses,
 * then we set the OnlineState to Offline, and the client will behave as if
 * it is offline (get()s will return cached data, etc.).
 */
export class OnlineStateTracker {
  /** The current OnlineState. */
  private state = OnlineState.Unknown;

  /**
   * A count of consecutive failures to open the stream. If it reaches the
   * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
   * Offline.
   */
  private watchStreamFailures = 0;

  /**
   * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
   * transition from OnlineState.Unknown to OnlineState.Offline without waiting
   * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
   */
  private onlineStateTimer: CancelablePromise<void> | null = null;

  /**
   * Whether the client should log a warning message if it fails to connect to
   * the backend (initially true, cleared after a successful stream, or if we've
   * logged the message already).
   */
  private shouldWarnClientIsOffline = true;

  constructor(
    private asyncQueue: AsyncQueue,
    private onlineStateHandler: (onlineState: OnlineState) => void
  ) {}

  /**
   * Called by RemoteStore when a watch stream is started (including on each
   * backoff attempt).
   *
   * If this is the first attempt, it sets the OnlineState to Unknown and starts
   * the onlineStateTimer.
   */
  handleWatchStreamStart(): void {
    if (this.watchStreamFailures === 0) {
      this.setAndBroadcast(OnlineState.Unknown);

      assert(
        this.onlineStateTimer === null,
        `onlineStateTimer shouldn't be started yet`
      );
      this.onlineStateTimer = this.asyncQueue.enqueueAfterDelay(
        TimerId.OnlineStateTimeout,
        ONLINE_STATE_TIMEOUT_MS,
        () => {
          this.onlineStateTimer = null;
          assert(
            this.state === OnlineState.Unknown,
            'Timer should be canceled if we transitioned to a different state.'
          );
          log.debug(
            LOG_TAG,
            `Watch stream didn't reach online or offline within ` +
              `${ONLINE_STATE_TIMEOUT_MS}ms. Considering client offline.`
          );
          this.logClientOfflineWarningIfNecessary();
          this.setAndBroadcast(OnlineState.Offline);

          // NOTE: handleWatchStreamFailure() will continue to increment
          // watchStreamFailures even though we are already marked Offline,
          // but this is non-harmful.

          return Promise.resolve();
        }
      );
    }
  }

  /**
   * Updates our OnlineState as appropriate after the watch stream reports a
   * failure. The first failure moves us to the 'Unknown' state. We then may
   * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
   * actually transition to the 'Offline' state.
   */
  handleWatchStreamFailure(): void {
    if (this.state === OnlineState.Online) {
      this.setAndBroadcast(OnlineState.Unknown);

      // To get to OnlineState.Online, set() must have been called which would
      // have reset our heuristics.
      assert(this.watchStreamFailures === 0, 'watchStreamFailures must be 0');
      assert(this.onlineStateTimer === null, 'onlineStateTimer must be null');
    } else {
      this.watchStreamFailures++;
      if (this.watchStreamFailures >= MAX_WATCH_STREAM_FAILURES) {
        this.clearOnlineStateTimer();
        this.logClientOfflineWarningIfNecessary();
        this.setAndBroadcast(OnlineState.Offline);
      }
    }
  }

  /**
   * Explicitly sets the OnlineState to the specified state.
   *
   * Note that this resets our timers / failure counters, etc. used by our
   * Offline heuristics, so must not be used in place of
   * handleWatchStreamStart() and handleWatchStreamFailure().
   */
  set(newState: OnlineState): void {
    this.clearOnlineStateTimer();
    this.watchStreamFailures = 0;

    if (newState === OnlineState.Online) {
      // We've connected to watch at least once. Don't warn the developer
      // about being offline going forward.
      this.shouldWarnClientIsOffline = false;
    }

    this.setAndBroadcast(newState);
  }

  private setAndBroadcast(newState: OnlineState): void {
    if (newState !== this.state) {
      this.state = newState;
      this.onlineStateHandler(newState);
    }
  }

  private logClientOfflineWarningIfNecessary(): void {
    if (this.shouldWarnClientIsOffline) {
      log.error('Could not reach Firestore backend.');
      this.shouldWarnClientIsOffline = false;
    }
  }

  private clearOnlineStateTimer(): void {
    if (this.onlineStateTimer !== null) {
      this.onlineStateTimer.cancel();
      this.onlineStateTimer = null;
    }
  }
}
