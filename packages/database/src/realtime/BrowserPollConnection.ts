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
  executeWhenDOMReady,
  isChromeExtensionContentScript,
  isWindowsStoreApp,
  log,
  logWrapper,
  LUIDGenerator,
  splitStringBySize
} from '../core/util/util';
import { StatsManager } from '../core/stats/StatsManager';
import { PacketReceiver } from './polling/PacketReceiver';
import {
  FORGE_DOMAIN,
  FORGE_REF,
  LAST_SESSION_PARAM,
  LONG_POLLING,
  PROTOCOL_VERSION,
  REFERER_PARAM,
  TRANSPORT_SESSION_PARAM,
  VERSION_PARAM
} from './Constants';
import { base64Encode, stringify } from '@firebase/util';
import { isNodeSdk } from '@firebase/util';
import { Transport } from './Transport';
import { RepoInfo } from '../core/RepoInfo';
import { StatsCollection } from '../core/stats/StatsCollection';

// URL query parameters associated with longpolling
export const FIREBASE_LONGPOLL_START_PARAM = 'start';
export const FIREBASE_LONGPOLL_CLOSE_COMMAND = 'close';
export const FIREBASE_LONGPOLL_COMMAND_CB_NAME = 'pLPCommand';
export const FIREBASE_LONGPOLL_DATA_CB_NAME = 'pRTLPCB';
export const FIREBASE_LONGPOLL_ID_PARAM = 'id';
export const FIREBASE_LONGPOLL_PW_PARAM = 'pw';
export const FIREBASE_LONGPOLL_SERIAL_PARAM = 'ser';
export const FIREBASE_LONGPOLL_CALLBACK_ID_PARAM = 'cb';
export const FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM = 'seg';
export const FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET = 'ts';
export const FIREBASE_LONGPOLL_DATA_PARAM = 'd';
export const FIREBASE_LONGPOLL_DISCONN_FRAME_PARAM = 'disconn';
export const FIREBASE_LONGPOLL_DISCONN_FRAME_REQUEST_PARAM = 'dframe';

//Data size constants.
//TODO: Perf: the maximum length actually differs from browser to browser.
// We should check what browser we're on and set accordingly.
const MAX_URL_DATA_SIZE = 1870;
const SEG_HEADER_SIZE = 30; //ie: &seg=8299234&ts=982389123&d=
const MAX_PAYLOAD_SIZE = MAX_URL_DATA_SIZE - SEG_HEADER_SIZE;

/**
 * Keepalive period
 * send a fresh request at minimum every 25 seconds. Opera has a maximum request
 * length of 30 seconds that we can't exceed.
 * @const
 * @type {number}
 */
const KEEPALIVE_REQUEST_INTERVAL = 25000;

/**
 * How long to wait before aborting a long-polling connection attempt.
 * @const
 * @type {number}
 */
const LP_CONNECT_TIMEOUT = 30000;

/**
 * This class manages a single long-polling connection.
 *
 * @constructor
 * @implements {Transport}
 */
export class BrowserPollConnection implements Transport {
  bytesSent = 0;
  bytesReceived = 0;
  urlFn: (params: object) => string;
  scriptTagHolder: FirebaseIFrameScriptHolder;
  myDisconnFrame: HTMLIFrameElement;
  curSegmentNum: number;
  myPacketOrderer: PacketReceiver;
  id: string;
  password: string;
  private log_: (...a: any[]) => void;
  private stats_: StatsCollection;
  private everConnected_ = false;
  private isClosed_: boolean;
  private connectTimeoutTimer_: number | null;
  private onDisconnect_: ((a?: boolean) => void) | null;

  /**
   * @param {string} connId An identifier for this connection, used for logging
   * @param {RepoInfo} repoInfo The info for the endpoint to send data to.
   * @param {string=} transportSessionId Optional transportSessionid if we are reconnecting for an existing
   *                                         transport session
   * @param {string=}  lastSessionId Optional lastSessionId if the PersistentConnection has already created a
   *                                     connection previously
   */
  constructor(
    public connId: string,
    public repoInfo: RepoInfo,
    public transportSessionId?: string,
    public lastSessionId?: string
  ) {
    this.log_ = logWrapper(connId);
    this.stats_ = StatsManager.getCollection(repoInfo);
    this.urlFn = (params: { [k: string]: string }) =>
      repoInfo.connectionURL(LONG_POLLING, params);
  }

  /**
   *
   * @param {function(Object)} onMessage Callback when messages arrive
   * @param {function()} onDisconnect Callback with connection lost.
   */
  open(onMessage: (msg: Object) => void, onDisconnect: (a?: boolean) => void) {
    this.curSegmentNum = 0;
    this.onDisconnect_ = onDisconnect;
    this.myPacketOrderer = new PacketReceiver(onMessage);
    this.isClosed_ = false;

    this.connectTimeoutTimer_ = setTimeout(() => {
      this.log_('Timed out trying to connect.');
      // Make sure we clear the host cache
      this.onClosed_();
      this.connectTimeoutTimer_ = null;
    }, Math.floor(LP_CONNECT_TIMEOUT)) as any;

    // Ensure we delay the creation of the iframe until the DOM is loaded.
    executeWhenDOMReady(() => {
      if (this.isClosed_) return;

      //Set up a callback that gets triggered once a connection is set up.
      this.scriptTagHolder = new FirebaseIFrameScriptHolder(
        (...args) => {
          const [command, arg1, arg2, arg3, arg4] = args;
          this.incrementIncomingBytes_(args);
          if (!this.scriptTagHolder) return; // we closed the connection.

          if (this.connectTimeoutTimer_) {
            clearTimeout(this.connectTimeoutTimer_);
            this.connectTimeoutTimer_ = null;
          }
          this.everConnected_ = true;
          if (command == FIREBASE_LONGPOLL_START_PARAM) {
            this.id = arg1;
            this.password = arg2;
          } else if (command === FIREBASE_LONGPOLL_CLOSE_COMMAND) {
            // Don't clear the host cache. We got a response from the server, so we know it's reachable
            if (arg1) {
              // We aren't expecting any more data (other than what the server's already in the process of sending us
              // through our already open polls), so don't send any more.
              this.scriptTagHolder.sendNewPolls = false;

              // arg1 in this case is the last response number sent by the server. We should try to receive
              // all of the responses up to this one before closing
              this.myPacketOrderer.closeAfter(arg1, () => {
                this.onClosed_();
              });
            } else {
              this.onClosed_();
            }
          } else {
            throw new Error('Unrecognized command received: ' + command);
          }
        },
        (...args) => {
          const [pN, data] = args;
          this.incrementIncomingBytes_(args);
          this.myPacketOrderer.handleResponse(pN, data);
        },
        () => {
          this.onClosed_();
        },
        this.urlFn
      );

      //Send the initial request to connect. The serial number is simply to keep the browser from pulling previous results
      //from cache.
      const urlParams: { [k: string]: string | number } = {};
      urlParams[FIREBASE_LONGPOLL_START_PARAM] = 't';
      urlParams[FIREBASE_LONGPOLL_SERIAL_PARAM] = Math.floor(
        Math.random() * 100000000
      );
      if (this.scriptTagHolder.uniqueCallbackIdentifier)
        urlParams[
          FIREBASE_LONGPOLL_CALLBACK_ID_PARAM
        ] = this.scriptTagHolder.uniqueCallbackIdentifier;
      urlParams[VERSION_PARAM] = PROTOCOL_VERSION;
      if (this.transportSessionId) {
        urlParams[TRANSPORT_SESSION_PARAM] = this.transportSessionId;
      }
      if (this.lastSessionId) {
        urlParams[LAST_SESSION_PARAM] = this.lastSessionId;
      }
      if (
        !isNodeSdk() &&
        typeof location !== 'undefined' &&
        location.href &&
        location.href.indexOf(FORGE_DOMAIN) !== -1
      ) {
        urlParams[REFERER_PARAM] = FORGE_REF;
      }
      const connectURL = this.urlFn(urlParams);
      this.log_('Connecting via long-poll to ' + connectURL);
      this.scriptTagHolder.addTag(connectURL, () => {
        /* do nothing */
      });
    });
  }

  /**
   * Call this when a handshake has completed successfully and we want to consider the connection established
   */
  start() {
    this.scriptTagHolder.startLongPoll(this.id, this.password);
    this.addDisconnectPingFrame(this.id, this.password);
  }

  private static forceAllow_: boolean;

  /**
   * Forces long polling to be considered as a potential transport
   */
  static forceAllow() {
    BrowserPollConnection.forceAllow_ = true;
  }

  private static forceDisallow_: boolean;

  /**
   * Forces longpolling to not be considered as a potential transport
   */
  static forceDisallow() {
    BrowserPollConnection.forceDisallow_ = true;
  }

  // Static method, use string literal so it can be accessed in a generic way
  static isAvailable() {
    // NOTE: In React-Native there's normally no 'document', but if you debug a React-Native app in
    // the Chrome debugger, 'document' is defined, but document.createElement is null (2015/06/08).
    return (
      BrowserPollConnection.forceAllow_ ||
      (!BrowserPollConnection.forceDisallow_ &&
        typeof document !== 'undefined' &&
        document.createElement != null &&
        !isChromeExtensionContentScript() &&
        !isWindowsStoreApp() &&
        !isNodeSdk())
    );
  }

  /**
   * No-op for polling
   */
  markConnectionHealthy() {}

  /**
   * Stops polling and cleans up the iframe
   * @private
   */
  private shutdown_() {
    this.isClosed_ = true;

    if (this.scriptTagHolder) {
      this.scriptTagHolder.close();
      this.scriptTagHolder = null;
    }

    //remove the disconnect frame, which will trigger an XHR call to the server to tell it we're leaving.
    if (this.myDisconnFrame) {
      document.body.removeChild(this.myDisconnFrame);
      this.myDisconnFrame = null;
    }

    if (this.connectTimeoutTimer_) {
      clearTimeout(this.connectTimeoutTimer_);
      this.connectTimeoutTimer_ = null;
    }
  }

  /**
   * Triggered when this transport is closed
   * @private
   */
  private onClosed_() {
    if (!this.isClosed_) {
      this.log_('Longpoll is closing itself');
      this.shutdown_();

      if (this.onDisconnect_) {
        this.onDisconnect_(this.everConnected_);
        this.onDisconnect_ = null;
      }
    }
  }

  /**
   * External-facing close handler. RealTime has requested we shut down. Kill our connection and tell the server
   * that we've left.
   */
  close() {
    if (!this.isClosed_) {
      this.log_('Longpoll is being closed.');
      this.shutdown_();
    }
  }

  /**
   * Send the JSON object down to the server. It will need to be stringified, base64 encoded, and then
   * broken into chunks (since URLs have a small maximum length).
   * @param {!Object} data The JSON data to transmit.
   */
  send(data: Object) {
    const dataStr = stringify(data);
    this.bytesSent += dataStr.length;
    this.stats_.incrementCounter('bytes_sent', dataStr.length);

    //first, lets get the base64-encoded data
    const base64data = base64Encode(dataStr);

    //We can only fit a certain amount in each URL, so we need to split this request
    //up into multiple pieces if it doesn't fit in one request.
    const dataSegs = splitStringBySize(base64data, MAX_PAYLOAD_SIZE);

    //Enqueue each segment for transmission. We assign each chunk a sequential ID and a total number
    //of segments so that we can reassemble the packet on the server.
    for (let i = 0; i < dataSegs.length; i++) {
      this.scriptTagHolder.enqueueSegment(
        this.curSegmentNum,
        dataSegs.length,
        dataSegs[i]
      );
      this.curSegmentNum++;
    }
  }

  /**
   * This is how we notify the server that we're leaving.
   * We aren't able to send requests with DHTML on a window close event, but we can
   * trigger XHR requests in some browsers (everything but Opera basically).
   * @param {!string} id
   * @param {!string} pw
   */
  addDisconnectPingFrame(id: string, pw: string) {
    if (isNodeSdk()) return;
    this.myDisconnFrame = document.createElement('iframe');
    const urlParams: { [k: string]: string } = {};
    urlParams[FIREBASE_LONGPOLL_DISCONN_FRAME_REQUEST_PARAM] = 't';
    urlParams[FIREBASE_LONGPOLL_ID_PARAM] = id;
    urlParams[FIREBASE_LONGPOLL_PW_PARAM] = pw;
    this.myDisconnFrame.src = this.urlFn(urlParams);
    this.myDisconnFrame.style.display = 'none';

    document.body.appendChild(this.myDisconnFrame);
  }

  /**
   * Used to track the bytes received by this client
   * @param {*} args
   * @private
   */
  private incrementIncomingBytes_(args: any) {
    // TODO: This is an annoying perf hit just to track the number of incoming bytes.  Maybe it should be opt-in.
    const bytesReceived = stringify(args).length;
    this.bytesReceived += bytesReceived;
    this.stats_.incrementCounter('bytes_received', bytesReceived);
  }
}

export interface IFrameElement extends HTMLIFrameElement {
  doc: Document;
}

/*********************************************************************************************
 * A wrapper around an iframe that is used as a long-polling script holder.
 * @constructor
 *********************************************************************************************/
export class FirebaseIFrameScriptHolder {
  //We maintain a count of all of the outstanding requests, because if we have too many active at once it can cause
  //problems in some browsers.
  outstandingRequests = new Set<number>();

  //A queue of the pending segments waiting for transmission to the server.
  pendingSegs: { seg: number; ts: number; d: any }[] = [];

  //A serial number. We use this for two things:
  // 1) A way to ensure the browser doesn't cache responses to polls
  // 2) A way to make the server aware when long-polls arrive in a different order than we started them. The
  //    server needs to release both polls in this case or it will cause problems in Opera since Opera can only execute
  //    JSONP code in the order it was added to the iframe.
  currentSerial = Math.floor(Math.random() * 100000000);

  // This gets set to false when we're "closing down" the connection (e.g. we're switching transports but there's still
  // incoming data from the server that we're waiting for).
  sendNewPolls = true;

  uniqueCallbackIdentifier: number;
  myIFrame: IFrameElement;
  alive: boolean;
  myID: string;
  myPW: string;
  commandCB: (command: string, ...args: any[]) => void;
  onMessageCB: (...args: any[]) => void;

  /**
   * @param commandCB - The callback to be called when control commands are recevied from the server.
   * @param onMessageCB - The callback to be triggered when responses arrive from the server.
   * @param onDisconnect - The callback to be triggered when this tag holder is closed
   * @param urlFn - A function that provides the URL of the endpoint to send data to.
   */
  constructor(
    commandCB: (command: string, ...args: any[]) => void,
    onMessageCB: (...args: any[]) => void,
    public onDisconnect: () => void,
    public urlFn: (a: object) => string
  ) {
    if (!isNodeSdk()) {
      //Each script holder registers a couple of uniquely named callbacks with the window. These are called from the
      //iframes where we put the long-polling script tags. We have two callbacks:
      //   1) Command Callback - Triggered for control issues, like starting a connection.
      //   2) Message Callback - Triggered when new data arrives.
      this.uniqueCallbackIdentifier = LUIDGenerator();
      (window as any)[
        FIREBASE_LONGPOLL_COMMAND_CB_NAME + this.uniqueCallbackIdentifier
      ] = commandCB;
      (window as any)[
        FIREBASE_LONGPOLL_DATA_CB_NAME + this.uniqueCallbackIdentifier
      ] = onMessageCB;

      //Create an iframe for us to add script tags to.
      this.myIFrame = FirebaseIFrameScriptHolder.createIFrame_();

      // Set the iframe's contents.
      let script = '';
      // if we set a javascript url, it's IE and we need to set the document domain. The javascript url is sufficient
      // for ie9, but ie8 needs to do it again in the document itself.
      if (
        this.myIFrame.src &&
        this.myIFrame.src.substr(0, 'javascript:'.length) === 'javascript:'
      ) {
        const currentDomain = document.domain;
        script = '<script>document.domain="' + currentDomain + '";</script>';
      }
      const iframeContents = '<html><body>' + script + '</body></html>';
      try {
        this.myIFrame.doc.open();
        this.myIFrame.doc.write(iframeContents);
        this.myIFrame.doc.close();
      } catch (e) {
        log('frame writing exception');
        if (e.stack) {
          log(e.stack);
        }
        log(e);
      }
    } else {
      this.commandCB = commandCB;
      this.onMessageCB = onMessageCB;
    }
  }

  /**
   * Each browser has its own funny way to handle iframes. Here we mush them all together into one object that I can
   * actually use.
   * @private
   * @return {Element}
   */
  private static createIFrame_(): IFrameElement {
    const iframe = document.createElement('iframe') as IFrameElement;
    iframe.style.display = 'none';

    // This is necessary in order to initialize the document inside the iframe
    if (document.body) {
      document.body.appendChild(iframe);
      try {
        // If document.domain has been modified in IE, this will throw an error, and we need to set the
        // domain of the iframe's document manually. We can do this via a javascript: url as the src attribute
        // Also note that we must do this *after* the iframe has been appended to the page. Otherwise it doesn't work.
        const a = iframe.contentWindow.document;
        if (!a) {
          // Apologies for the log-spam, I need to do something to keep closure from optimizing out the assignment above.
          log('No IE domain setting required');
        }
      } catch (e) {
        const domain = document.domain;
        iframe.src =
          "javascript:void((function(){document.open();document.domain='" +
          domain +
          "';document.close();})())";
      }
    } else {
      // LongPollConnection attempts to delay initialization until the document is ready, so hopefully this
      // never gets hit.
      throw 'Document body has not initialized. Wait to initialize Firebase until after the document is ready.';
    }

    // Get the document of the iframe in a browser-specific way.
    if (iframe.contentDocument) {
      (iframe as any).doc = iframe.contentDocument; // Firefox, Opera, Safari
    } else if (iframe.contentWindow) {
      (iframe as any).doc = iframe.contentWindow.document; // Internet Explorer
    } else if ((iframe as any).document) {
      (iframe as any).doc = (iframe as any).document; //others?
    }

    return iframe;
  }

  /**
   * Cancel all outstanding queries and remove the frame.
   */
  close() {
    //Mark this iframe as dead, so no new requests are sent.
    this.alive = false;

    if (this.myIFrame) {
      //We have to actually remove all of the html inside this iframe before removing it from the
      //window, or IE will continue loading and executing the script tags we've already added, which
      //can lead to some errors being thrown. Setting innerHTML seems to be the easiest way to do this.
      this.myIFrame.doc.body.innerHTML = '';
      setTimeout(() => {
        if (this.myIFrame !== null) {
          document.body.removeChild(this.myIFrame);
          this.myIFrame = null;
        }
      }, Math.floor(0));
    }

    if (isNodeSdk() && this.myID) {
      const urlParams: { [k: string]: string } = {};
      urlParams[FIREBASE_LONGPOLL_DISCONN_FRAME_PARAM] = 't';
      urlParams[FIREBASE_LONGPOLL_ID_PARAM] = this.myID;
      urlParams[FIREBASE_LONGPOLL_PW_PARAM] = this.myPW;
      const theURL = this.urlFn(urlParams);
      (FirebaseIFrameScriptHolder as any).nodeRestRequest(theURL);
    }

    // Protect from being called recursively.
    const onDisconnect = this.onDisconnect;
    if (onDisconnect) {
      this.onDisconnect = null;
      onDisconnect();
    }
  }

  /**
   * Actually start the long-polling session by adding the first script tag(s) to the iframe.
   * @param {!string} id - The ID of this connection
   * @param {!string} pw - The password for this connection
   */
  startLongPoll(id: string, pw: string) {
    this.myID = id;
    this.myPW = pw;
    this.alive = true;

    //send the initial request. If there are requests queued, make sure that we transmit as many as we are currently able to.
    while (this.newRequest_()) {}
  }

  /**
   * This is called any time someone might want a script tag to be added. It adds a script tag when there aren't
   * too many outstanding requests and we are still alive.
   *
   * If there are outstanding packet segments to send, it sends one. If there aren't, it sends a long-poll anyways if
   * needed.
   */
  private newRequest_() {
    // We keep one outstanding request open all the time to receive data, but if we need to send data
    // (pendingSegs.length > 0) then we create a new request to send the data.  The server will automatically
    // close the old request.
    if (
      this.alive &&
      this.sendNewPolls &&
      this.outstandingRequests.size < (this.pendingSegs.length > 0 ? 2 : 1)
    ) {
      //construct our url
      this.currentSerial++;
      const urlParams: { [k: string]: string | number } = {};
      urlParams[FIREBASE_LONGPOLL_ID_PARAM] = this.myID;
      urlParams[FIREBASE_LONGPOLL_PW_PARAM] = this.myPW;
      urlParams[FIREBASE_LONGPOLL_SERIAL_PARAM] = this.currentSerial;
      let theURL = this.urlFn(urlParams);
      //Now add as much data as we can.
      let curDataString = '';
      let i = 0;

      while (this.pendingSegs.length > 0) {
        //first, lets see if the next segment will fit.
        const nextSeg = this.pendingSegs[0];
        if (
          nextSeg.d.length + SEG_HEADER_SIZE + curDataString.length <=
          MAX_URL_DATA_SIZE
        ) {
          //great, the segment will fit. Lets append it.
          const theSeg = this.pendingSegs.shift();
          curDataString =
            curDataString +
            '&' +
            FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM +
            i +
            '=' +
            theSeg.seg +
            '&' +
            FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET +
            i +
            '=' +
            theSeg.ts +
            '&' +
            FIREBASE_LONGPOLL_DATA_PARAM +
            i +
            '=' +
            theSeg.d;
          i++;
        } else {
          break;
        }
      }

      theURL = theURL + curDataString;
      this.addLongPollTag_(theURL, this.currentSerial);

      return true;
    } else {
      return false;
    }
  }

  /**
   * Queue a packet for transmission to the server.
   * @param segnum - A sequential id for this packet segment used for reassembly
   * @param totalsegs - The total number of segments in this packet
   * @param data - The data for this segment.
   */
  enqueueSegment(segnum: number, totalsegs: number, data: any) {
    //add this to the queue of segments to send.
    this.pendingSegs.push({ seg: segnum, ts: totalsegs, d: data });

    //send the data immediately if there isn't already data being transmitted, unless
    //startLongPoll hasn't been called yet.
    if (this.alive) {
      this.newRequest_();
    }
  }

  /**
   * Add a script tag for a regular long-poll request.
   * @param {!string} url - The URL of the script tag.
   * @param {!number} serial - The serial number of the request.
   * @private
   */
  private addLongPollTag_(url: string, serial: number) {
    //remember that we sent this request.
    this.outstandingRequests.add(serial);

    const doNewRequest = () => {
      this.outstandingRequests.delete(serial);
      this.newRequest_();
    };

    // If this request doesn't return on its own accord (by the server sending us some data), we'll
    // create a new one after the KEEPALIVE interval to make sure we always keep a fresh request open.
    const keepaliveTimeout = setTimeout(
      doNewRequest,
      Math.floor(KEEPALIVE_REQUEST_INTERVAL)
    );

    const readyStateCB = () => {
      // Request completed.  Cancel the keepalive.
      clearTimeout(keepaliveTimeout);

      // Trigger a new request so we can continue receiving data.
      doNewRequest();
    };

    this.addTag(url, readyStateCB);
  }

  /**
   * Add an arbitrary script tag to the iframe.
   * @param {!string} url - The URL for the script tag source.
   * @param {!function()} loadCB - A callback to be triggered once the script has loaded.
   */
  addTag(url: string, loadCB: () => void) {
    if (isNodeSdk()) {
      (this as any).doNodeLongPoll(url, loadCB);
    } else {
      setTimeout(() => {
        try {
          // if we're already closed, don't add this poll
          if (!this.sendNewPolls) return;
          const newScript = this.myIFrame.doc.createElement('script');
          newScript.type = 'text/javascript';
          newScript.async = true;
          newScript.src = url;
          newScript.onload = (newScript as any).onreadystatechange = function() {
            const rstate = (newScript as any).readyState;
            if (!rstate || rstate === 'loaded' || rstate === 'complete') {
              newScript.onload = (newScript as any).onreadystatechange = null;
              if (newScript.parentNode) {
                newScript.parentNode.removeChild(newScript);
              }
              loadCB();
            }
          };
          newScript.onerror = () => {
            log('Long-poll script failed to load: ' + url);
            this.sendNewPolls = false;
            this.close();
          };
          this.myIFrame.doc.body.appendChild(newScript);
        } catch (e) {
          // TODO: we should make this error visible somehow
        }
      }, Math.floor(1));
    }
  }
}
