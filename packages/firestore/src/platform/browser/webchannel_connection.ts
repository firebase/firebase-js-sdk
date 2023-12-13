/**
 * @license
 * Copyright 2017 Google LLC
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
  WebChannelError,
  WebChannelOptions,
  XhrIo,
  getStatEventTarget,
  EventTarget,
  StatEvent,
  Event,
  Stat
} from '@firebase/webchannel-wrapper';

import { Token } from '../../api/credentials';
import { ExperimentalLongPollingOptions } from '../../api/long_polling_options';
import { DatabaseInfo } from '../../core/database_info';
import { Stream } from '../../remote/connection';
import { RestConnection } from '../../remote/rest_connection';
import {
  mapCodeFromRpcStatus,
  mapCodeFromHttpResponseErrorStatus
} from '../../remote/rpc_error';
import { StreamBridge } from '../../remote/stream_bridge';
import { fail, hardAssert } from '../../util/assert';
import { generateUniqueDebugId } from '../../util/debug_uid';
import { Code, FirestoreError } from '../../util/error';
import { logDebug, logWarn } from '../../util/log';
import { Rejecter, Resolver } from '../../util/promise';
import { StringMap } from '../../util/types';

const LOG_TAG = 'WebChannelConnection';

const RPC_STREAM_SERVICE = 'google.firestore.v1.Firestore';

const XHR_TIMEOUT_SECS = 15;

export class WebChannelConnection extends RestConnection {
  private readonly forceLongPolling: boolean;
  private readonly autoDetectLongPolling: boolean;
  private readonly useFetchStreams: boolean;
  private readonly longPollingOptions: ExperimentalLongPollingOptions;

  constructor(info: DatabaseInfo) {
    super(info);
    this.forceLongPolling = info.forceLongPolling;
    this.autoDetectLongPolling = info.autoDetectLongPolling;
    this.useFetchStreams = info.useFetchStreams;
    this.longPollingOptions = info.longPollingOptions;
  }

  protected performRPCRequest<Req, Resp>(
    rpcName: string,
    url: string,
    headers: StringMap,
    body: Req
  ): Promise<Resp> {
    const streamId = generateUniqueDebugId();
    return new Promise((resolve: Resolver<Resp>, reject: Rejecter) => {
      const xhr = new XhrIo();
      xhr.setWithCredentials(true);
      xhr.listenOnce(EventType.COMPLETE, () => {
        try {
          switch (xhr.getLastErrorCode()) {
            case ErrorCode.NO_ERROR:
              const json = xhr.getResponseJson() as Resp;
              logDebug(
                LOG_TAG,
                `XHR for RPC '${rpcName}' ${streamId} received:`,
                JSON.stringify(json)
              );
              resolve(json);
              break;
            case ErrorCode.TIMEOUT:
              logDebug(LOG_TAG, `RPC '${rpcName}' ${streamId} timed out`);
              reject(
                new FirestoreError(Code.DEADLINE_EXCEEDED, 'Request time out')
              );
              break;
            case ErrorCode.HTTP_ERROR:
              const status = xhr.getStatus();
              logDebug(
                LOG_TAG,
                `RPC '${rpcName}' ${streamId} failed with status:`,
                status,
                'response text:',
                xhr.getResponseText()
              );
              if (status > 0) {
                let response = xhr.getResponseJson();
                if (Array.isArray(response)) {
                  response = response[0];
                }
                const responseError = (response as WebChannelError)?.error;
                if (
                  !!responseError &&
                  !!responseError.status &&
                  !!responseError.message
                ) {
                  const firestoreErrorCode = mapCodeFromHttpResponseErrorStatus(
                    responseError.status
                  );
                  reject(
                    new FirestoreError(
                      firestoreErrorCode,
                      responseError.message
                    )
                  );
                } else {
                  reject(
                    new FirestoreError(
                      Code.UNKNOWN,
                      'Server responded with status ' + xhr.getStatus()
                    )
                  );
                }
              } else {
                // If we received an HTTP_ERROR but there's no status code,
                // it's most probably a connection issue
                reject(
                  new FirestoreError(Code.UNAVAILABLE, 'Connection failed.')
                );
              }
              break;
            default:
              fail(
                `RPC '${rpcName}' ${streamId} ` +
                  'failed with unanticipated webchannel error: ' +
                  xhr.getLastErrorCode() +
                  ': ' +
                  xhr.getLastError() +
                  ', giving up.'
              );
          }
        } finally {
          logDebug(LOG_TAG, `RPC '${rpcName}' ${streamId} completed.`);
        }
      });

      const requestString = JSON.stringify(body);
      logDebug(LOG_TAG, `RPC '${rpcName}' ${streamId} sending request:`, body);
      xhr.send(url, 'POST', requestString, headers, XHR_TIMEOUT_SECS);
    });
  }

  openStream<Req, Resp>(
    rpcName: string,
    authToken: Token | null,
    appCheckToken: Token | null
  ): Stream<Req, Resp> {
    const streamId = generateUniqueDebugId();
    const urlParts = [
      this.baseUrl,
      '/',
      RPC_STREAM_SERVICE,
      '/',
      rpcName,
      '/channel'
    ];
    const webchannelTransport = createWebChannelTransport();
    const requestStats = getStatEventTarget();
    const request: WebChannelOptions = {
      // Required for backend stickiness, routing behavior is based on this
      // parameter.
      httpSessionIdParam: 'gsessionid',
      initMessageHeaders: {},
      messageUrlParams: {
        // This param is used to improve routing and project isolation by the
        // backend and must be included in every request.
        database: `projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`
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
      forceLongPolling: this.forceLongPolling,
      detectBufferingProxy: this.autoDetectLongPolling
    };

    const longPollingTimeoutSeconds = this.longPollingOptions.timeoutSeconds;
    if (longPollingTimeoutSeconds !== undefined) {
      request.longPollingTimeout = Math.round(longPollingTimeoutSeconds * 1000);
    }

    if (this.useFetchStreams) {
      request.useFetchStreams = true;
    }

    this.modifyHeadersForRequest(
      request.initMessageHeaders!,
      authToken,
      appCheckToken
    );

    // Sending the custom headers we just added to request.initMessageHeaders
    // (Authorization, etc.) will trigger the browser to make a CORS preflight
    // request because the XHR will no longer meet the criteria for a "simple"
    // CORS request:
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
    //
    // Therefore to avoid the CORS preflight request (an extra network
    // roundtrip), we use the encodeInitMessageHeaders option to specify that
    // the headers should instead be encoded in the request's POST payload,
    // which is recognized by the webchannel backend.
    request.encodeInitMessageHeaders = true;

    const url = urlParts.join('');
    logDebug(
      LOG_TAG,
      `Creating RPC '${rpcName}' stream ${streamId}: ${url}`,
      request
    );
    const channel = webchannelTransport.createWebChannel(url, request);

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
            logDebug(
              LOG_TAG,
              `Opening RPC '${rpcName}' stream ${streamId} transport.`
            );
            channel.open();
            opened = true;
          }
          logDebug(
            LOG_TAG,
            `RPC '${rpcName}' stream ${streamId} sending:`,
            msg
          );
          channel.send(msg);
        } else {
          logDebug(
            LOG_TAG,
            `Not sending because RPC '${rpcName}' stream ${streamId} ` +
              'is closed:',
            msg
          );
        }
      },
      closeFn: () => channel.close()
    });

    // Closure events are guarded and exceptions are swallowed, so catch any
    // exception and rethrow using a setTimeout so they become visible again.
    // Note that eventually this function could go away if we are confident
    // enough the code is exception free.
    const unguardedEventListen = <T>(
      target: EventTarget,
      type: string | number,
      fn: (param: T) => void
    ): void => {
      // TODO(dimond): closure typing seems broken because WebChannel does
      // not implement goog.events.Listenable
      target.listen(type, (param: unknown) => {
        try {
          fn(param as T);
        } catch (e) {
          setTimeout(() => {
            throw e;
          }, 0);
        }
      });
    };

    unguardedEventListen(channel, WebChannel.EventType.OPEN, () => {
      if (!closed) {
        logDebug(
          LOG_TAG,
          `RPC '${rpcName}' stream ${streamId} transport opened.`
        );
      }
    });

    unguardedEventListen(channel, WebChannel.EventType.CLOSE, () => {
      if (!closed) {
        closed = true;
        logDebug(
          LOG_TAG,
          `RPC '${rpcName}' stream ${streamId} transport closed`
        );
        streamBridge.callOnClose();
      }
    });

    unguardedEventListen<Error>(channel, WebChannel.EventType.ERROR, err => {
      if (!closed) {
        closed = true;
        logWarn(
          LOG_TAG,
          `RPC '${rpcName}' stream ${streamId} transport errored:`,
          err
        );
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
      channel,
      WebChannel.EventType.MESSAGE,
      msg => {
        if (!closed) {
          const msgData = msg.data[0];
          hardAssert(!!msgData, 'Got a webchannel message without data.');
          // TODO(b/35143891): There is a bug in One Platform that caused errors
          // (and only errors) to be wrapped in an extra array. To be forward
          // compatible with the bug we need to check either condition. The latter
          // can be removed once the fix has been rolled out.
          // Use any because msgData.error is not typed.
          const msgDataOrError: WebChannelError | object = msgData;
          const error =
            msgDataOrError.error ||
            (msgDataOrError as WebChannelError[])[0]?.error;
          if (error) {
            logDebug(
              LOG_TAG,
              `RPC '${rpcName}' stream ${streamId} received error:`,
              error
            );
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
            logDebug(
              LOG_TAG,
              `RPC '${rpcName}' stream ${streamId} received:`,
              msgData
            );
            streamBridge.callOnMessage(msgData);
          }
        }
      }
    );

    unguardedEventListen<StatEvent>(requestStats, Event.STAT_EVENT, event => {
      if (event.stat === Stat.PROXY) {
        logDebug(
          LOG_TAG,
          `RPC '${rpcName}' stream ${streamId} detected buffering proxy`
        );
      } else if (event.stat === Stat.NOPROXY) {
        logDebug(
          LOG_TAG,
          `RPC '${rpcName}' stream ${streamId} detected no buffering proxy`
        );
      }
    });

    setTimeout(() => {
      // Technically we could/should wait for the WebChannel opened event,
      // but because we want to send the first message with the WebChannel
      // handshake we pretend the channel opened here (asynchronously), and
      // then delay the actual open until the first message is sent.
      streamBridge.callOnOpen();
    }, 0);
    return streamBridge;
  }
}
