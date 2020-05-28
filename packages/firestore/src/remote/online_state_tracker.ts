/**
 * @license
 * Copyright 2018 Google LLC
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
import { debugAssert } from '../util/assert';
import { AsyncQueue, DelayedOperation, TimerId } from '../util/async_queue';
import { FirestoreError } from '../util/error';
import { logError, logDebug } from '../util/log';

const LOG_TAG = 'OnlineStateTracker';

// To deal with transient failures, we allow multiple stream attempts before
// giving up and transitioning from OnlineState.Unknown to Offline.
// TODO(mikelehen): This used to be set to 2 as a mitigation for b/66228394.
// @jdimond thinks that bug is sufficiently fixed so that we can set this back
// to 1. If that works okay, we could potentially remove this logic entirely.
const MAX_WATCH_STREAM_FAILURES = 1;

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
  private onlineStateTimer: DelayedOperation<void> | null = null;

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

      debugAssert(
        this.onlineStateTimer === null,
        `onlineStateTimer shouldn't be started yet`
      );
      this.onlineStateTimer = this.asyncQueue.enqueueAfterDelay(
        TimerId.OnlineStateTimeout,
        ONLINE_STATE_TIMEOUT_MS,
        () => {
          this.onlineStateTimer = null;
          debugAssert(
            this.state === OnlineState.Unknown,
            'Timer should be canceled if we transitioned to a different state.'
          );
          this.logClientOfflineWarningIfNecessary(
            `Backend didn't respond within ${ONLINE_STATE_TIMEOUT_MS / 1000} ` +
              `seconds.`
          );
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
  handleWatchStreamFailure(error: FirestoreError): void {
    if (this.state === OnlineState.Online) {
      this.setAndBroadcast(OnlineState.Unknown);

      // To get to OnlineState.Online, set() must have been called which would
      // have reset our heuristics.
      debugAssert(
        this.watchStreamFailures === 0,
        'watchStreamFailures must be 0'
      );
      debugAssert(
        this.onlineStateTimer === null,
        'onlineStateTimer must be null'
      );
    } else {
      this.watchStreamFailures++;
      if (this.watchStreamFailures >= MAX_WATCH_STREAM_FAILURES) {
        this.clearOnlineStateTimer();

        this.logClientOfflineWarningIfNecessary(
          `Connection failed ${MAX_WATCH_STREAM_FAILURES} ` +
            `times. Most recent error: ${error.toString()}`
        );

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

  private logClientOfflineWarningIfNecessary(details: string): void {
    const message =
      `Could not reach Cloud Firestore backend. ${details}\n` +
      `This typically indicates that your device does not have a healthy ` +
      `Internet connection at the moment. The client will operate in offline ` +
      `mode until it is able to successfully connect to the backend.`;
    if (this.shouldWarnClientIsOffline) {
      logError(message);
      this.shouldWarnClientIsOffline = false;
    } else {
      logDebug(LOG_TAG, message);
    }
  }

  private clearOnlineStateTimer(): void {
    if (this.onlineStateTimer !== null) {
      this.onlineStateTimer.cancel();
      this.onlineStateTimer = null;
    }
  }
}
