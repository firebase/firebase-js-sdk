/**
 * @license
 * Copyright 2017 Google Inc.
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

import { contains, isEmpty, safeGet, CONSTANTS } from '@firebase/util';
import { stringify } from '@firebase/util';
import { assert } from '@firebase/util';
import { error, log, logWrapper, warn, ObjectToUniqueKey } from './util/util';
import { Path } from './util/Path';
import { VisibilityMonitor } from './util/VisibilityMonitor';
import { OnlineMonitor } from './util/OnlineMonitor';
import { isAdmin, isValidFormat } from '@firebase/util';
import { Connection } from '../realtime/Connection';
import { isMobileCordova, isReactNative, isNodeSdk } from '@firebase/util';
import { ServerActions } from './ServerActions';
import { AuthTokenProvider } from './AuthTokenProvider';
import { RepoInfo } from './RepoInfo';
import { Query } from '../api/Query';
import { SDK_VERSION } from './version';

const RECONNECT_MIN_DELAY = 1000;
const RECONNECT_MAX_DELAY_DEFAULT = 60 * 5 * 1000; // 5 minutes in milliseconds (Case: 1858)
const RECONNECT_MAX_DELAY_FOR_ADMINS = 30 * 1000; // 30 seconds for admin clients (likely to be a backend server)
const RECONNECT_DELAY_MULTIPLIER = 1.3;
const RECONNECT_DELAY_RESET_TIMEOUT = 30000; // Reset delay back to MIN_DELAY after being connected for 30sec.
const SERVER_KILL_INTERRUPT_REASON = 'server_kill';

// If auth fails repeatedly, we'll assume something is wrong and log a warning / back off.
const INVALID_AUTH_TOKEN_THRESHOLD = 3;

interface ListenSpec {
  onComplete(s: string, p?: any): void;

  hashFn(): string;

  query: Query;
  tag: number | null;
}

interface OnDisconnectRequest {
  pathString: string;
  action: string;
  data: any;
  onComplete?: (a: string, b: string) => void;
}

interface OutstandingPut {
  action: string;
  request: Object;
  queued?: boolean;
  onComplete: (a: string, b?: string) => void;
}

/**
 * Firebase connection.  Abstracts wire protocol and handles reconnecting.
 *
 * NOTE: All JSON objects sent to the realtime connection must have property names enclosed
 * in quotes to make sure the closure compiler does not minify them.
 */
export class PersistentConnection extends ServerActions {
  // Used for diagnostic logging.
  id = PersistentConnection.nextPersistentConnectionId_++;
  private log_ = logWrapper('p:' + this.id + ':');

  private interruptReasons_: { [reason: string]: boolean } = {};
  /** Map<path, Map<queryId, ListenSpec>> */
  private readonly listens: Map<
    /* path */ string,
    Map</* queryId */ string, ListenSpec>
  > = new Map();
  private outstandingPuts_: OutstandingPut[] = [];
  private outstandingPutCount_ = 0;
  private onDisconnectRequestQueue_: OnDisconnectRequest[] = [];
  private connected_ = false;
  private reconnectDelay_ = RECONNECT_MIN_DELAY;
  private maxReconnectDelay_ = RECONNECT_MAX_DELAY_DEFAULT;
  private securityDebugCallback_: ((a: Object) => void) | null = null;
  lastSessionId: string | null = null;

  private establishConnectionTimer_: number | null = null;

  private visible_: boolean = false;

  // Before we get connected, we keep a queue of pending messages to send.
  private requestCBHash_: { [k: number]: (a: any) => void } = {};
  private requestNumber_ = 0;

  private realtime_: {
    sendRequest(a: Object): void;
    close(): void;
  } | null = null;

  private authToken_: string | null = null;
  private forceTokenRefresh_ = false;
  private invalidAuthTokenCount_ = 0;

  private firstConnection_ = true;
  private lastConnectionAttemptTime_: number | null = null;
  private lastConnectionEstablishedTime_: number | null = null;

  private static nextPersistentConnectionId_ = 0;

  /**
   * Counter for number of connections created. Mainly used for tagging in the logs
   */
  private static nextConnectionId_ = 0;

  /**
   * @implements {ServerActions}
   * @param repoInfo_ Data about the namespace we are connecting to
   * @param onDataUpdate_ A callback for new data from the server
   */
  constructor(
    private repoInfo_: RepoInfo,
    private onDataUpdate_: (
      a: string,
      b: any,
      c: boolean,
      d: number | null
    ) => void,
    private onConnectStatus_: (a: boolean) => void,
    private onServerInfoUpdate_: (a: any) => void,
    private authTokenProvider_: AuthTokenProvider,
    private authOverride_?: Object | null
  ) {
    super();

    if (authOverride_ && !isNodeSdk()) {
      throw new Error(
        'Auth override specified in options, but not supported on non Node.js platforms'
      );
    }
    this.scheduleConnect_(0);

    VisibilityMonitor.getInstance().on('visible', this.onVisible_, this);

    if (repoInfo_.host.indexOf('fblocal') === -1) {
      OnlineMonitor.getInstance().on('online', this.onOnline_, this);
    }
  }

  protected sendRequest(
    action: string,
    body: any,
    onResponse?: (a: any) => void
  ) {
    const curReqNum = ++this.requestNumber_;

    const msg = { r: curReqNum, a: action, b: body };
    this.log_(stringify(msg));
    assert(
      this.connected_,
      "sendRequest call when we're not connected not allowed."
    );
    this.realtime_.sendRequest(msg);
    if (onResponse) {
      this.requestCBHash_[curReqNum] = onResponse;
    }
  }

  /**
   * @inheritDoc
   */
  listen(
    query: Query,
    currentHashFn: () => string,
    tag: number | null,
    onComplete: (a: string, b: any) => void
  ) {
    const queryId = query.queryIdentifier();
    const pathString = query.path.toString();
    this.log_('Listen called for ' + pathString + ' ' + queryId);
    if (!this.listens.has(pathString)) {
      this.listens.set(pathString, new Map());
    }
    assert(
      query.getQueryParams().isDefault() ||
        !query.getQueryParams().loadsAllData(),
      'listen() called for non-default but complete query'
    );
    assert(
      !this.listens.get(pathString)!.has(queryId),
      'listen() called twice for same path/queryId.'
    );
    const listenSpec: ListenSpec = {
      onComplete: onComplete,
      hashFn: currentHashFn,
      query: query,
      tag: tag
    };
    this.listens.get(pathString)!.set(queryId, listenSpec);

    if (this.connected_) {
      this.sendListen_(listenSpec);
    }
  }

  private sendListen_(listenSpec: ListenSpec) {
    const query = listenSpec.query;
    const pathString = query.path.toString();
    const queryId = query.queryIdentifier();
    this.log_('Listen on ' + pathString + ' for ' + queryId);
    const req: { [k: string]: any } = { /*path*/ p: pathString };

    const action = 'q';

    // Only bother to send query if it's non-default.
    if (listenSpec.tag) {
      req['q'] = query.queryObject();
      req['t'] = listenSpec.tag;
    }

    req[/*hash*/ 'h'] = listenSpec.hashFn();

    this.sendRequest(action, req, (message: { [k: string]: any }) => {
      const payload: any = message[/*data*/ 'd'];
      const status: string = message[/*status*/ 's'];

      // print warnings in any case...
      PersistentConnection.warnOnListenWarnings_(payload, query);

      const currentListenSpec =
        this.listens.get(pathString) &&
        this.listens.get(pathString)!.get(queryId);
      // only trigger actions if the listen hasn't been removed and readded
      if (currentListenSpec === listenSpec) {
        this.log_('listen response', message);

        if (status !== 'ok') {
          this.removeListen_(pathString, queryId);
        }

        if (listenSpec.onComplete) {
          listenSpec.onComplete(status, payload);
        }
      }
    });
  }

  private static warnOnListenWarnings_(payload: any, query: Query) {
    if (payload && typeof payload === 'object' && contains(payload, 'w')) {
      const warnings = safeGet(payload, 'w');
      if (Array.isArray(warnings) && ~warnings.indexOf('no_index')) {
        const indexSpec =
          '".indexOn": "' +
          query
            .getQueryParams()
            .getIndex()
            .toString() +
          '"';
        const indexPath = query.path.toString();
        warn(
          `Using an unspecified index. Your data will be downloaded and ` +
            `filtered on the client. Consider adding ${indexSpec} at ` +
            `${indexPath} to your security rules for better performance.`
        );
      }
    }
  }

  /**
   * @inheritDoc
   */
  refreshAuthToken(token: string) {
    this.authToken_ = token;
    this.log_('Auth token refreshed');
    if (this.authToken_) {
      this.tryAuth();
    } else {
      //If we're connected we want to let the server know to unauthenticate us. If we're not connected, simply delete
      //the credential so we dont become authenticated next time we connect.
      if (this.connected_) {
        this.sendRequest('unauth', {}, () => {});
      }
    }

    this.reduceReconnectDelayIfAdminCredential_(token);
  }

  private reduceReconnectDelayIfAdminCredential_(credential: string) {
    // NOTE: This isn't intended to be bulletproof (a malicious developer can always just modify the client).
    // Additionally, we don't bother resetting the max delay back to the default if auth fails / expires.
    const isFirebaseSecret = credential && credential.length === 40;
    if (isFirebaseSecret || isAdmin(credential)) {
      this.log_(
        'Admin auth credential detected.  Reducing max reconnect time.'
      );
      this.maxReconnectDelay_ = RECONNECT_MAX_DELAY_FOR_ADMINS;
    }
  }

  /**
   * Attempts to authenticate with the given credentials. If the authentication attempt fails, it's triggered like
   * a auth revoked (the connection is closed).
   */
  tryAuth() {
    if (this.connected_ && this.authToken_) {
      const token = this.authToken_;
      const authMethod = isValidFormat(token) ? 'auth' : 'gauth';
      const requestData: { [k: string]: any } = { cred: token };
      if (this.authOverride_ === null) {
        requestData['noauth'] = true;
      } else if (typeof this.authOverride_ === 'object') {
        requestData['authvar'] = this.authOverride_;
      }
      this.sendRequest(authMethod, requestData, (res: { [k: string]: any }) => {
        const status: string = res[/*status*/ 's'];
        const data: string = res[/*data*/ 'd'] || 'error';

        if (this.authToken_ === token) {
          if (status === 'ok') {
            this.invalidAuthTokenCount_ = 0;
          } else {
            // Triggers reconnect and force refresh for auth token
            this.onAuthRevoked_(status, data);
          }
        }
      });
    }
  }

  /**
   * @inheritDoc
   */
  unlisten(query: Query, tag: number | null) {
    const pathString = query.path.toString();
    const queryId = query.queryIdentifier();

    this.log_('Unlisten called for ' + pathString + ' ' + queryId);

    assert(
      query.getQueryParams().isDefault() ||
        !query.getQueryParams().loadsAllData(),
      'unlisten() called for non-default but complete query'
    );
    const listen = this.removeListen_(pathString, queryId);
    if (listen && this.connected_) {
      this.sendUnlisten_(pathString, queryId, query.queryObject(), tag);
    }
  }

  private sendUnlisten_(
    pathString: string,
    queryId: string,
    queryObj: Object,
    tag: number | null
  ) {
    this.log_('Unlisten on ' + pathString + ' for ' + queryId);

    const req: { [k: string]: any } = { /*path*/ p: pathString };
    const action = 'n';
    // Only bother sending queryId if it's non-default.
    if (tag) {
      req['q'] = queryObj;
      req['t'] = tag;
    }

    this.sendRequest(action, req);
  }

  /**
   * @inheritDoc
   */
  onDisconnectPut(
    pathString: string,
    data: any,
    onComplete?: (a: string, b: string) => void
  ) {
    if (this.connected_) {
      this.sendOnDisconnect_('o', pathString, data, onComplete);
    } else {
      this.onDisconnectRequestQueue_.push({
        pathString,
        action: 'o',
        data,
        onComplete
      });
    }
  }

  /**
   * @inheritDoc
   */
  onDisconnectMerge(
    pathString: string,
    data: any,
    onComplete?: (a: string, b: string) => void
  ) {
    if (this.connected_) {
      this.sendOnDisconnect_('om', pathString, data, onComplete);
    } else {
      this.onDisconnectRequestQueue_.push({
        pathString,
        action: 'om',
        data,
        onComplete
      });
    }
  }

  /**
   * @inheritDoc
   */
  onDisconnectCancel(
    pathString: string,
    onComplete?: (a: string, b: string) => void
  ) {
    if (this.connected_) {
      this.sendOnDisconnect_('oc', pathString, null, onComplete);
    } else {
      this.onDisconnectRequestQueue_.push({
        pathString,
        action: 'oc',
        data: null,
        onComplete
      });
    }
  }

  private sendOnDisconnect_(
    action: string,
    pathString: string,
    data: any,
    onComplete: (a: string, b: string) => void
  ) {
    const request = { /*path*/ p: pathString, /*data*/ d: data };
    this.log_('onDisconnect ' + action, request);
    this.sendRequest(action, request, (response: { [k: string]: any }) => {
      if (onComplete) {
        setTimeout(function() {
          onComplete(response[/*status*/ 's'], response[/* data */ 'd']);
        }, Math.floor(0));
      }
    });
  }

  /**
   * @inheritDoc
   */
  put(
    pathString: string,
    data: any,
    onComplete?: (a: string, b: string) => void,
    hash?: string
  ) {
    this.putInternal('p', pathString, data, onComplete, hash);
  }

  /**
   * @inheritDoc
   */
  merge(
    pathString: string,
    data: any,
    onComplete: (a: string, b: string | null) => void,
    hash?: string
  ) {
    this.putInternal('m', pathString, data, onComplete, hash);
  }

  putInternal(
    action: string,
    pathString: string,
    data: any,
    onComplete: (a: string, b: string | null) => void,
    hash?: string
  ) {
    const request: { [k: string]: any } = {
      /*path*/ p: pathString,
      /*data*/ d: data
    };

    if (hash !== undefined) request[/*hash*/ 'h'] = hash;

    // TODO: Only keep track of the most recent put for a given path?
    this.outstandingPuts_.push({
      action,
      request,
      onComplete
    });

    this.outstandingPutCount_++;
    const index = this.outstandingPuts_.length - 1;

    if (this.connected_) {
      this.sendPut_(index);
    } else {
      this.log_('Buffering put: ' + pathString);
    }
  }

  private sendPut_(index: number) {
    const action = this.outstandingPuts_[index].action;
    const request = this.outstandingPuts_[index].request;
    const onComplete = this.outstandingPuts_[index].onComplete;
    this.outstandingPuts_[index].queued = this.connected_;

    this.sendRequest(action, request, (message: { [k: string]: any }) => {
      this.log_(action + ' response', message);

      delete this.outstandingPuts_[index];
      this.outstandingPutCount_--;

      // Clean up array occasionally.
      if (this.outstandingPutCount_ === 0) {
        this.outstandingPuts_ = [];
      }

      if (onComplete)
        onComplete(message[/*status*/ 's'], message[/* data */ 'd']);
    });
  }

  /**
   * @inheritDoc
   */
  reportStats(stats: { [k: string]: any }) {
    // If we're not connected, we just drop the stats.
    if (this.connected_) {
      const request = { /*counters*/ c: stats };
      this.log_('reportStats', request);

      this.sendRequest(/*stats*/ 's', request, result => {
        const status = result[/*status*/ 's'];
        if (status !== 'ok') {
          const errorReason = result[/* data */ 'd'];
          this.log_('reportStats', 'Error sending stats: ' + errorReason);
        }
      });
    }
  }

  private onDataMessage_(message: { [k: string]: any }) {
    if ('r' in message) {
      // this is a response
      this.log_('from server: ' + stringify(message));
      const reqNum = message['r'];
      const onResponse = this.requestCBHash_[reqNum];
      if (onResponse) {
        delete this.requestCBHash_[reqNum];
        onResponse(message[/*body*/ 'b']);
      }
    } else if ('error' in message) {
      throw 'A server-side error has occurred: ' + message['error'];
    } else if ('a' in message) {
      // a and b are action and body, respectively
      this.onDataPush_(message['a'], message['b']);
    }
  }

  private onDataPush_(action: string, body: { [k: string]: any }) {
    this.log_('handleServerMessage', action, body);
    if (action === 'd')
      this.onDataUpdate_(
        body[/*path*/ 'p'],
        body[/*data*/ 'd'],
        /*isMerge*/ false,
        body['t']
      );
    else if (action === 'm')
      this.onDataUpdate_(
        body[/*path*/ 'p'],
        body[/*data*/ 'd'],
        /*isMerge=*/ true,
        body['t']
      );
    else if (action === 'c')
      this.onListenRevoked_(body[/*path*/ 'p'], body[/*query*/ 'q']);
    else if (action === 'ac')
      this.onAuthRevoked_(
        body[/*status code*/ 's'],
        body[/* explanation */ 'd']
      );
    else if (action === 'sd') this.onSecurityDebugPacket_(body);
    else
      error(
        'Unrecognized action received from server: ' +
          stringify(action) +
          '\nAre you using the latest client?'
      );
  }

  private onReady_(timestamp: number, sessionId: string) {
    this.log_('connection ready');
    this.connected_ = true;
    this.lastConnectionEstablishedTime_ = new Date().getTime();
    this.handleTimestamp_(timestamp);
    this.lastSessionId = sessionId;
    if (this.firstConnection_) {
      this.sendConnectStats_();
    }
    this.restoreState_();
    this.firstConnection_ = false;
    this.onConnectStatus_(true);
  }

  private scheduleConnect_(timeout: number) {
    assert(
      !this.realtime_,
      "Scheduling a connect when we're already connected/ing?"
    );

    if (this.establishConnectionTimer_) {
      clearTimeout(this.establishConnectionTimer_);
    }

    // NOTE: Even when timeout is 0, it's important to do a setTimeout to work around an infuriating "Security Error" in
    // Firefox when trying to write to our long-polling iframe in some scenarios (e.g. Forge or our unit tests).

    this.establishConnectionTimer_ = setTimeout(() => {
      this.establishConnectionTimer_ = null;
      this.establishConnection_();
    }, Math.floor(timeout)) as any;
  }

  private onVisible_(visible: boolean) {
    // NOTE: Tabbing away and back to a window will defeat our reconnect backoff, but I think that's fine.
    if (
      visible &&
      !this.visible_ &&
      this.reconnectDelay_ === this.maxReconnectDelay_
    ) {
      this.log_('Window became visible.  Reducing delay.');
      this.reconnectDelay_ = RECONNECT_MIN_DELAY;

      if (!this.realtime_) {
        this.scheduleConnect_(0);
      }
    }
    this.visible_ = visible;
  }

  private onOnline_(online: boolean) {
    if (online) {
      this.log_('Browser went online.');
      this.reconnectDelay_ = RECONNECT_MIN_DELAY;
      if (!this.realtime_) {
        this.scheduleConnect_(0);
      }
    } else {
      this.log_('Browser went offline.  Killing connection.');
      if (this.realtime_) {
        this.realtime_.close();
      }
    }
  }

  private onRealtimeDisconnect_() {
    this.log_('data client disconnected');
    this.connected_ = false;
    this.realtime_ = null;

    // Since we don't know if our sent transactions succeeded or not, we need to cancel them.
    this.cancelSentTransactions_();

    // Clear out the pending requests.
    this.requestCBHash_ = {};

    if (this.shouldReconnect_()) {
      if (!this.visible_) {
        this.log_("Window isn't visible.  Delaying reconnect.");
        this.reconnectDelay_ = this.maxReconnectDelay_;
        this.lastConnectionAttemptTime_ = new Date().getTime();
      } else if (this.lastConnectionEstablishedTime_) {
        // If we've been connected long enough, reset reconnect delay to minimum.
        const timeSinceLastConnectSucceeded =
          new Date().getTime() - this.lastConnectionEstablishedTime_;
        if (timeSinceLastConnectSucceeded > RECONNECT_DELAY_RESET_TIMEOUT)
          this.reconnectDelay_ = RECONNECT_MIN_DELAY;
        this.lastConnectionEstablishedTime_ = null;
      }

      const timeSinceLastConnectAttempt =
        new Date().getTime() - this.lastConnectionAttemptTime_;
      let reconnectDelay = Math.max(
        0,
        this.reconnectDelay_ - timeSinceLastConnectAttempt
      );
      reconnectDelay = Math.random() * reconnectDelay;

      this.log_('Trying to reconnect in ' + reconnectDelay + 'ms');
      this.scheduleConnect_(reconnectDelay);

      // Adjust reconnect delay for next time.
      this.reconnectDelay_ = Math.min(
        this.maxReconnectDelay_,
        this.reconnectDelay_ * RECONNECT_DELAY_MULTIPLIER
      );
    }
    this.onConnectStatus_(false);
  }

  private establishConnection_() {
    if (this.shouldReconnect_()) {
      this.log_('Making a connection attempt');
      this.lastConnectionAttemptTime_ = new Date().getTime();
      this.lastConnectionEstablishedTime_ = null;
      const onDataMessage = this.onDataMessage_.bind(this);
      const onReady = this.onReady_.bind(this);
      const onDisconnect = this.onRealtimeDisconnect_.bind(this);
      const connId = this.id + ':' + PersistentConnection.nextConnectionId_++;
      const self = this;
      const lastSessionId = this.lastSessionId;
      let canceled = false;
      let connection: Connection | null = null;
      const closeFn = function() {
        if (connection) {
          connection.close();
        } else {
          canceled = true;
          onDisconnect();
        }
      };
      const sendRequestFn = function(msg: Object) {
        assert(
          connection,
          "sendRequest call when we're not connected not allowed."
        );
        connection.sendRequest(msg);
      };

      this.realtime_ = {
        close: closeFn,
        sendRequest: sendRequestFn
      };

      const forceRefresh = this.forceTokenRefresh_;
      this.forceTokenRefresh_ = false;

      // First fetch auth token, and establish connection after fetching the token was successful
      this.authTokenProvider_
        .getToken(forceRefresh)
        .then(function(result) {
          if (!canceled) {
            log('getToken() completed. Creating connection.');
            self.authToken_ = result && result.accessToken;
            connection = new Connection(
              connId,
              self.repoInfo_,
              onDataMessage,
              onReady,
              onDisconnect,
              /* onKill= */ function(reason) {
                warn(reason + ' (' + self.repoInfo_.toString() + ')');
                self.interrupt(SERVER_KILL_INTERRUPT_REASON);
              },
              lastSessionId
            );
          } else {
            log('getToken() completed but was canceled');
          }
        })
        .then(null, function(error) {
          self.log_('Failed to get token: ' + error);
          if (!canceled) {
            if (CONSTANTS.NODE_ADMIN) {
              // This may be a critical error for the Admin Node.js SDK, so log a warning.
              // But getToken() may also just have temporarily failed, so we still want to
              // continue retrying.
              warn(error);
            }
            closeFn();
          }
        });
    }
  }

  interrupt(reason: string) {
    log('Interrupting connection for reason: ' + reason);
    this.interruptReasons_[reason] = true;
    if (this.realtime_) {
      this.realtime_.close();
    } else {
      if (this.establishConnectionTimer_) {
        clearTimeout(this.establishConnectionTimer_);
        this.establishConnectionTimer_ = null;
      }
      if (this.connected_) {
        this.onRealtimeDisconnect_();
      }
    }
  }

  resume(reason: string) {
    log('Resuming connection for reason: ' + reason);
    delete this.interruptReasons_[reason];
    if (isEmpty(this.interruptReasons_)) {
      this.reconnectDelay_ = RECONNECT_MIN_DELAY;
      if (!this.realtime_) {
        this.scheduleConnect_(0);
      }
    }
  }

  private handleTimestamp_(timestamp: number) {
    const delta = timestamp - new Date().getTime();
    this.onServerInfoUpdate_({ serverTimeOffset: delta });
  }

  private cancelSentTransactions_() {
    for (let i = 0; i < this.outstandingPuts_.length; i++) {
      const put = this.outstandingPuts_[i];
      if (put && /*hash*/ 'h' in put.request && put.queued) {
        if (put.onComplete) put.onComplete('disconnect');

        delete this.outstandingPuts_[i];
        this.outstandingPutCount_--;
      }
    }

    // Clean up array occasionally.
    if (this.outstandingPutCount_ === 0) this.outstandingPuts_ = [];
  }

  private onListenRevoked_(pathString: string, query?: any[]) {
    // Remove the listen and manufacture a "permission_denied" error for the failed listen.
    let queryId;
    if (!query) {
      queryId = 'default';
    } else {
      queryId = query.map(q => ObjectToUniqueKey(q)).join('$');
    }
    const listen = this.removeListen_(pathString, queryId);
    if (listen && listen.onComplete) listen.onComplete('permission_denied');
  }

  private removeListen_(pathString: string, queryId: string): ListenSpec {
    const normalizedPathString = new Path(pathString).toString(); // normalize path.
    let listen;
    if (this.listens.has(normalizedPathString)) {
      const map = this.listens.get(normalizedPathString)!;
      listen = map.get(queryId);
      map.delete(queryId);
      if (map.size === 0) {
        this.listens.delete(normalizedPathString);
      }
    } else {
      // all listens for this path has already been removed
      listen = undefined;
    }
    return listen;
  }

  private onAuthRevoked_(statusCode: string, explanation: string) {
    log('Auth token revoked: ' + statusCode + '/' + explanation);
    this.authToken_ = null;
    this.forceTokenRefresh_ = true;
    this.realtime_.close();
    if (statusCode === 'invalid_token' || statusCode === 'permission_denied') {
      // We'll wait a couple times before logging the warning / increasing the
      // retry period since oauth tokens will report as "invalid" if they're
      // just expired. Plus there may be transient issues that resolve themselves.
      this.invalidAuthTokenCount_++;
      if (this.invalidAuthTokenCount_ >= INVALID_AUTH_TOKEN_THRESHOLD) {
        // Set a long reconnect delay because recovery is unlikely
        this.reconnectDelay_ = RECONNECT_MAX_DELAY_FOR_ADMINS;

        // Notify the auth token provider that the token is invalid, which will log
        // a warning
        this.authTokenProvider_.notifyForInvalidToken();
      }
    }
  }

  private onSecurityDebugPacket_(body: { [k: string]: any }) {
    if (this.securityDebugCallback_) {
      this.securityDebugCallback_(body);
    } else {
      if ('msg' in body) {
        console.log('FIREBASE: ' + body['msg'].replace('\n', '\nFIREBASE: '));
      }
    }
  }

  private restoreState_() {
    //Re-authenticate ourselves if we have a credential stored.
    this.tryAuth();

    // Puts depend on having received the corresponding data update from the server before they complete, so we must
    // make sure to send listens before puts.
    for (const queries of this.listens.values()) {
      for (const listenSpec of queries.values()) {
        this.sendListen_(listenSpec);
      }
    }

    for (let i = 0; i < this.outstandingPuts_.length; i++) {
      if (this.outstandingPuts_[i]) this.sendPut_(i);
    }

    while (this.onDisconnectRequestQueue_.length) {
      const request = this.onDisconnectRequestQueue_.shift();
      this.sendOnDisconnect_(
        request.action,
        request.pathString,
        request.data,
        request.onComplete
      );
    }
  }

  /**
   * Sends client stats for first connection
   */
  private sendConnectStats_() {
    const stats: { [k: string]: number } = {};

    let clientName = 'js';
    if (CONSTANTS.NODE_ADMIN) {
      clientName = 'admin_node';
    } else if (CONSTANTS.NODE_CLIENT) {
      clientName = 'node';
    }

    stats['sdk.' + clientName + '.' + SDK_VERSION.replace(/\./g, '-')] = 1;

    if (isMobileCordova()) {
      stats['framework.cordova'] = 1;
    } else if (isReactNative()) {
      stats['framework.reactnative'] = 1;
    }
    this.reportStats(stats);
  }

  private shouldReconnect_(): boolean {
    const online = OnlineMonitor.getInstance().currentlyOnline();
    return isEmpty(this.interruptReasons_) && online;
  }
}
