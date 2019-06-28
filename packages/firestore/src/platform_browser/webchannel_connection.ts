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

import {
  createWebChannelTransport,
  ErrorCode,
  EventType,
  WebChannel,
  WebChannelOptions,
  XhrIo
} from '@firebase/webchannel-wrapper';

import { isReactNative } from '@firebase/util';

import { Token } from '../api/credentials';
import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { SDK_VERSION } from '../core/version';
import { Connection, Stream } from '../remote/connection';
import {
  mapCodeFromHttpStatus,
  mapCodeFromRpcStatus
} from '../remote/rpc_error';
import { StreamBridge } from '../remote/stream_bridge';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import * as log from '../util/log';
import { Rejecter, Resolver } from '../util/promise';
import { StringMap } from '../util/types';

const LOG_TAG = 'Connection';

const RPC_STREAM_SERVICE = 'google.firestore.v1.Firestore';
const RPC_URL_VERSION = 'v1';

/** Maps RPC names to the corresponding REST endpoint name. */
const RPC_NAME_REST_MAPPING: { [key: string]: string } = {
  BatchGetDocuments: 'batchGet',
  Commit: 'commit'
};

// TODO(b/38203344): The SDK_VERSION is set independently from Firebase because
// we are doing out-of-band releases. Once we release as part of Firebase, we
// should use the Firebase version instead.
const X_GOOG_API_CLIENT_VALUE = 'gl-js/ fire/' + SDK_VERSION;

const XHR_TIMEOUT_SECS = 15;

export class WebChannelConnection implements Connection {
  private readonly databaseId: DatabaseId;
  private readonly baseUrl: string;
  private readonly forceLongPolling: boolean;

  constructor(info: DatabaseInfo) {
    this.databaseId = info.databaseId;
    const proto = info.ssl ? 'https' : 'http';
    this.baseUrl = proto + '://' + info.host;
    this.forceLongPolling = info.forceLongPolling;
  }

  /**
   * Modifies the headers for a request, adding any authorization token if
   * present and any additional headers for the request.
   */
  private modifyHeadersForRequest(
    headers: StringMap,
    token: Token | null
  ): void {
    if (token) {
      for (const header in token.authHeaders) {
        if (token.authHeaders.hasOwnProperty(header)) {
          headers[header] = token.authHeaders[header];
        }
      }
    }
    headers['X-Goog-Api-Client'] = X_GOOG_API_CLIENT_VALUE;
  }

  invokeRPC<Req, Resp>(
    rpcName: string,
    request: Req,
    token: Token | null
  ): Promise<Resp> {
    const url = this.makeUrl(rpcName);

    return new Promise((resolve: Resolver<Resp>, reject: Rejecter) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, XhrIo doesn't have TS typings.
      const xhr: any = new XhrIo();
      xhr.listenOnce(EventType.COMPLETE, () => {
        try {
          switch (xhr.getLastErrorCode()) {
            case ErrorCode.NO_ERROR:
              const json = xhr.getResponseJson() as Resp;
              log.debug(LOG_TAG, 'XHR received:', JSON.stringify(json));
              resolve(json);
              break;
            case ErrorCode.TIMEOUT:
              log.debug(LOG_TAG, 'RPC "' + rpcName + '" timed out');
              reject(
                new FirestoreError(Code.DEADLINE_EXCEEDED, 'Request time out')
              );
              break;
            case ErrorCode.HTTP_ERROR:
              const status = xhr.getStatus();
              log.debug(
                LOG_TAG,
                'RPC "' + rpcName + '" failed with status:',
                status,
                'response text:',
                xhr.getResponseText()
              );
              if (status > 0) {
                reject(
                  new FirestoreError(
                    mapCodeFromHttpStatus(status),
                    'Server responded with status ' + xhr.getStatusText()
                  )
                );
              } else {
                // If we received an HTTP_ERROR but there's no status code,
                // it's most probably a connection issue
                log.debug(LOG_TAG, 'RPC "' + rpcName + '" failed');
                reject(
                  new FirestoreError(Code.UNAVAILABLE, 'Connection failed.')
                );
              }
              break;
            default:
              fail(
                'RPC "' +
                  rpcName +
                  '" failed with unanticipated ' +
                  'webchannel error ' +
                  xhr.getLastErrorCode() +
                  ': ' +
                  xhr.getLastError() +
                  ', giving up.'
              );
          }
        } finally {
          log.debug(LOG_TAG, 'RPC "' + rpcName + '" completed.');
        }
      });

      const requestString = JSON.stringify(request);
      log.debug(LOG_TAG, 'XHR sending: ', url + ' ' + requestString);
      // Content-Type: text/plain will avoid preflight requests which might
      // mess with CORS and redirects by proxies. If we add custom headers
      // we will need to change this code to potentially use the
      // $httpOverwrite parameter supported by ESF to avoid
      // triggering preflight requests.
      const headers: StringMap = { 'Content-Type': 'text/plain' };

      this.modifyHeadersForRequest(headers, token);

      xhr.send(url, 'POST', requestString, headers, XHR_TIMEOUT_SECS);
    });
  }

  invokeStreamingRPC<Req, Resp>(
    rpcName: string,
    request: Req,
    token: Token | null
  ): Promise<Resp[]> {
    // The REST API automatically aggregates all of the streamed results, so we
    // can just use the normal invoke() method.
    return this.invokeRPC<Req, Resp[]>(rpcName, request, token);
  }

  openStream<Req, Resp>(
    rpcName: string,
    token: Token | null
  ): Stream<Req, Resp> {
    const urlParts = [
      this.baseUrl,
      '/',
      RPC_STREAM_SERVICE,
      '/',
      rpcName,
      '/channel'
    ];
    const webchannelTransport = createWebChannelTransport();
    const request: WebChannelOptions = {
      // Background channel test avoids the initial two test calls and decreases
      // initial cold start time.
      // TODO(dimond): wenboz@ mentioned this might affect use with proxies and
      // we should monitor closely for any reports.
      backgroundChannelTest: true,
      // Required for backend stickiness, routing behavior is based on this
      // parameter.
      httpSessionIdParam: 'gsessionid',
      initMessageHeaders: {},
      messageUrlParams: {
        // This param is used to improve routing and project isolation by the
        // backend and must be included in every request.
        database: `projects/${this.databaseId.projectId}/databases/${
          this.databaseId.database
        }`
      },
      sendRawJson: true,
      supportsCrossDomainXhr: true,
      internalChannelParams: {
        // Override the default timeout (randomized between 10-20 seconds) since
        // a large write batch on a slow internet connection may take a long
        // time to send to the backend. Rather than have WebChannel impose a
        // tight timeout which could lead to infinite timeouts and retries, we
        // set it very large (5-10 minutes) and rely on the browser's builtin
        // timeouts to kick in if the request isn't working.
        forwardChannelRequestTimeoutMs: 10 * 60 * 1000
      },
      forceLongPolling: this.forceLongPolling
    };

    this.modifyHeadersForRequest(request.initMessageHeaders!, token);

    // Sending the custom headers we just added to request.initMessageHeaders
    // (Authorization, etc.) will trigger the browser to make a CORS preflight
    // request because the XHR will no longer meet the criteria for a "simple"
    // CORS request:
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
    //
    // Therefore to avoid the CORS preflight request (an extra network
    // roundtrip), we use the httpHeadersOverwriteParam option to specify that
    // the headers should instead be encoded into a special "$httpHeaders" query
    // parameter, which is recognized by the webchannel backend. This is
    // formally defined here:
    // https://github.com/google/closure-library/blob/b0e1815b13fb92a46d7c9b3c30de5d6a396a3245/closure/goog/net/rpc/httpcors.js#L32
    //
    // But for some unclear reason (see
    // https://github.com/firebase/firebase-js-sdk/issues/703), this breaks
    // ReactNative and so we exclude it, which just means ReactNative may be
    // subject to the extra network roundtrip for CORS preflight.
    if (!isReactNative()) {
      request.httpHeadersOverwriteParam = '$httpHeaders';
    }

    const url = urlParts.join('');
    log.debug(LOG_TAG, 'Creating WebChannel: ' + url + ' ' + request);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, Because listen isn't defined on it.
    const channel = webchannelTransport.createWebChannel(url, request) as any;

    // WebChannel supports sending the first message with the handshake - saving
    // a network round trip. However, it will have to call send in the same
    // JS event loop as open. In order to enforce this, we delay actually
    // opening the WebChannel until send is called. Whether we have called
    // open is tracked with this variable.
    let opened = false;

    // A flag to determine whether the stream was closed (by us or through an
    // error/close event) to avoid delivering multiple close events or sending
    // on a closed stream
    let closed = false;

    const streamBridge = new StreamBridge<Req, Resp>({
      sendFn: (msg: Req) => {
        if (!closed) {
          if (!opened) {
            log.debug(LOG_TAG, 'Opening WebChannel transport.');
            channel.open();
            opened = true;
          }
          log.debug(LOG_TAG, 'WebChannel sending:', msg);
          channel.send(msg);
        } else {
          log.debug(LOG_TAG, 'Not sending because WebChannel is closed:', msg);
        }
      },
      closeFn: () => channel.close()
    });

    // Closure events are guarded and exceptions are swallowed, so catch any
    // exception and rethrow using a setTimeout so they become visible again.
    // Note that eventually this function could go away if we are confident
    // enough the code is exception free.
    const unguardedEventListen = <T>(
      type: WebChannel.EventType,
      fn: (param?: T) => void
    ): void => {
      // TODO(dimond): closure typing seems broken because WebChannel does
      // not implement goog.events.Listenable
      channel.listen(type, (param?: T) => {
        try {
          fn(param);
        } catch (e) {
          setTimeout(() => {
            throw e;
          }, 0);
        }
      });
    };

    unguardedEventListen(WebChannel.EventType.OPEN, () => {
      if (!closed) {
        log.debug(LOG_TAG, 'WebChannel transport opened.');
      }
    });

    unguardedEventListen(WebChannel.EventType.CLOSE, () => {
      if (!closed) {
        closed = true;
        log.debug(LOG_TAG, 'WebChannel transport closed');
        streamBridge.callOnClose();
      }
    });

    unguardedEventListen<Error>(WebChannel.EventType.ERROR, err => {
      if (!closed) {
        closed = true;
        log.debug(LOG_TAG, 'WebChannel transport errored:', err);
        streamBridge.callOnClose(
          new FirestoreError(
            Code.UNAVAILABLE,
            'The operation could not be completed'
          )
        );
      }
    });

    // WebChannel delivers message events as array. If batching is not enabled
    // (it's off by default) each message will be delivered alone, resulting in
    // a single element array.
    interface WebChannelResponse {
      data: Resp[];
    }

    unguardedEventListen<WebChannelResponse>(
      WebChannel.EventType.MESSAGE,
      msg => {
        if (!closed) {
          const msgData = msg!.data[0];
          assert(!!msgData, 'Got a webchannel message without data.');
          // TODO(b/35143891): There is a bug in One Platform that caused errors
          // (and only errors) to be wrapped in an extra array. To be forward
          // compatible with the bug we need to check either condition. The latter
          // can be removed once the fix has been rolled out.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, msgData.error is not typed.
          const msgDataAsAny: any = msgData;
          const error =
            msgDataAsAny.error || (msgDataAsAny[0] && msgDataAsAny[0].error);
          if (error) {
            log.debug(LOG_TAG, 'WebChannel received error:', error);
            // error.status will be a string like 'OK' or 'NOT_FOUND'.
            const status: string = error.status;
            let code = mapCodeFromRpcStatus(status);
            let message = error.message;
            if (code === undefined) {
              code = Code.INTERNAL;
              message =
                'Unknown error status: ' +
                status +
                ' with message ' +
                error.message;
            }
            // Mark closed so no further events are propagated
            closed = true;
            streamBridge.callOnClose(new FirestoreError(code, message));
            channel.close();
          } else {
            log.debug(LOG_TAG, 'WebChannel received:', msgData);
            streamBridge.callOnMessage(msgData);
          }
        }
      }
    );

    setTimeout(() => {
      // Technically we could/should wait for the WebChannel opened event,
      // but because we want to send the first message with the WebChannel
      // handshake we pretend the channel opened here (asynchronously), and
      // then delay the actual open until the first message is sent.
      streamBridge.callOnOpen();
    }, 0);
    return streamBridge;
  }

  // visible for testing
  makeUrl(rpcName: string): string {
    const urlRpcName = RPC_NAME_REST_MAPPING[rpcName];
    assert(urlRpcName !== undefined, 'Unknown REST mapping for: ' + rpcName);
    const url = [this.baseUrl, '/', RPC_URL_VERSION];
    url.push('/projects/');
    url.push(this.databaseId.projectId);

    url.push('/databases/');
    url.push(this.databaseId.database);
    url.push('/documents');

    url.push(':');
    url.push(urlRpcName);
    return url.join('');
  }
}
