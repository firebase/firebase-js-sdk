/**
 * @license
 * Copyright 2025 Google LLC
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

import { ConfigUpdateObserver, /*FetchResponse*/ } from '../public_types';
const MAX_HTTP_RETRIES = 8;
// import { ERROR_FACTORY, ErrorCode } from '../errors';
// import { FetchRequest } from './remote_config_fetch_client';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
export class RealtimeHandler {
  constructor (
    private readonly firebaseInstallations: _FirebaseInstallationsInternal,
  )
  { }

  private streamController?: AbortController;
  private observers: Set<ConfigUpdateObserver> = new Set<ConfigUpdateObserver>();
  private isConnectionActive: boolean = false;
  private retriesRemaining: number = MAX_HTTP_RETRIES;
  private isRealtimeDisabled: boolean = false;
  private isInBackground: boolean = false;
  private backoffCount: number = 0;
  private scheduledConnectionTimeoutId?: ReturnType<typeof setTimeout>;
 // private backoffManager: BackoffManager = new BackoffManager();


  /**
   * Adds an observer to the realtime updates.
   * @param observer The observer to add.
   */
  addObserver(observer: ConfigUpdateObserver): void {
    this.observers.add(observer);
    //this.beginRealtime();
  }

  /**
   * Removes an observer from the realtime updates.
   * @param observer The observer to remove.
   */
  removeObserver(observer: ConfigUpdateObserver): void {
    if (this.observers.has(observer)) {
      this.observers.delete(observer);
    }
  }

  private beginRealtime(): void {
    if (this.observers.size > 0) {
      this.retriesRemaining = MAX_HTTP_RETRIES;
      this.backoffCount = 0;
    //  this.makeRealtimeHttpConnection(0);
    }
  }

  // private canMakeHttpConnection(): void {

  // }

  private canEstablishStreamConnection(): boolean {
    const hasActiveListeners = this.observers.size > 0;
    const isNotDisabled = !this.isRealtimeDisabled;
    const isForeground = !this.isInBackground;
    return hasActiveListeners && isNotDisabled && isForeground;
  }

  // private async makeRealtimeHttpConnection(delayMillis: number): void {
  //   if (this.scheduledConnectionTimeoutId) {
  //     clearTimeout(this.scheduledConnectionTimeoutId);
  //   }

  //   this.scheduledConnectionTimeoutId = setTimeout(() => {
  //     // Check 1: Can we connect at all? Mirrors Java's first check.
  //     if (!this.canEstablishStreamConnection()) {
  //       return;
  //     }
  //     if (this.retriesRemaining > 0) {
  //       this.retriesRemaining--;
  //       await this.beginRealtimeHttpStream();
  //     } else if (!this.isInBackground) {
  //       throw ERROR_FACTORY.create(ErrorCode.REALTIME_UPDATE_STREAM_ERROR);
  //     }
  //   }, delayMillis);
  // }


  private checkAndSetHttpConnectionFlagIfNotRunning(): boolean {
    if (this.canEstablishStreamConnection()) {
      this.streamController = new AbortController();
      this.isConnectionActive = true;
      return true;
    }
    return false;
  }

  // private retryHttpConnectionWhenBackoffEnds(): void {
  //   const currentTime = Date.now();
  //   const timeToWait = Math.max(0, this.backoffManager.backoffEndTimeMillis - currentTime);
  //   this.makeRealtimeHttpConnection(timeToWait);
  // }


  //   private async createFetchRequest(): Promise<FetchRequest> {
  //       const [installationId, installationTokenResult] = await Promise.all([
  //           this.firebaseInstallations.getId(),
  //           this.firebaseInstallations.getToken(false)
  //       ]);
        
  //       const url = this._getRealtimeUrl();
        
  //       const requestBody = {
  //           project: extractProjectNumberFromAppId(this.firebaseApp.options.appId!),
  //           namespace: 'firebase',
  //           lastKnownVersionNumber: this.templateVersion.toString(),
  //           appId: this.firebaseApp.options.appId,
  //           sdkVersion: '20.0.4',
  //           appInstanceId: installationId
  //       };
        
  //       const request: FetchRequest = {
  //           url: url.toString(),
  //           method: 'POST',
  //           signal: this.streamController!.signal,
  //           body: JSON.stringify(requestBody),
  //           headers: {
  //               'Content-Type': 'application/json',
  //               'Accept': 'application/json',
  //               'X-Goog-Api-Key': this.firebaseApp.options.apiKey!,
  //               'X-Goog-Firebase-Installations-Auth': installationTokenResult.token,
  //               'X-Accept-Response-Streaming': 'true',
  //               'X-Google-GFE-Can-Retry': 'yes'
  //           }
  //       };
  //       return request;
  //   }
    
  // //method which is responsible for making an realtime HTTP connection
  // private async beginRealtimeHttpStream(): void {
  //   if (!this.checkAndSetHttpConnectionFlagIfNotRunning()) {
  //     return;
  //   }

  //   const currentTime = Date.now();
  //   if (currentTime < this.backoffManager.backoffEndTimeMillis) {
  //     this.retryHttpConnectionWhenBackoffEnds();
  //     return;
  //   }

  //   let response: FetchResponse | undefined;

  //   try {
  //           const request = await this.createFetchRequest();
            
  //           response = await this.fetchClient.fetch(request);

  //           if (response.status === 200 && response.body) {
  //               this.retriesRemaining = MAX_HTTP_RETRIES;
  //               this.backoffCount = 0;
  //               this.backoffManager.reset();
  //               this.saveRealtimeBackoffMetadata(); 

  //               const parser = new StreamParser(response.body, this.observers);
  //               await parser.listen();
  //           } else {
  //                throw new FirebaseError('http-status-error', `HTTP Error: ${response.status}`);
  //           }
  //       } catch (error) {
  //           if (error.name === 'AbortError') {
  //               return;
  //           }
  //       } finally {
  //           this.isConnectionActive = false;

  //           const statusCode = response?.status;
  //           const connectionFailed = !this.isInBackground && (!statusCode || this.isStatusCodeRetryable(statusCode));

  //           if (connectionFailed) {
  //               this.handleStreamError();
  //           } else if (statusCode && statusCode !== 200) {
  //               const firebaseError = new FirebaseError('config-update-stream-error', 
  //                   `Unable to connect to the server. HTTP status code: ${statusCode}`);
  //               this.propagateError(firebaseError);
  //           } else {
  //                this.makeRealtimeHttpConnection(0);
  //           }
  //       }
  // }
}
