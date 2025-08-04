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

import { ConfigUpdateObserver } from '../public_types';
import { ERROR_FACTORY, ErrorCode } from '../errors';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { Storage } from '../storage/storage';
import { calculateBackoffMillis, FirebaseError } from '@firebase/util';

const ORIGINAL_RETRIES = 8;

export class RealtimeHandler {
  constructor(
    private readonly firebaseInstallations: _FirebaseInstallationsInternal,
    private readonly storage: Storage,
    private readonly sdkVersion: string,
    private readonly namespace: string,
    private readonly projectId: string,
    private readonly apiKey: string,
    private readonly appId: string
  ) { }

  private streamController?: AbortController;
  private observers: Set<ConfigUpdateObserver> = new Set<ConfigUpdateObserver>();
  private isConnectionActive: boolean = false;
  private retriesRemaining: number = ORIGINAL_RETRIES;
  private isRealtimeDisabled: boolean = false;
  private isInBackground: boolean = false;
  private scheduledConnectionTimeoutId?: ReturnType<typeof setTimeout>;
  private templateVersion: number = 0;
  /**
   * Adds an observer to the realtime updates.
   * @param observer The observer to add.
   */
  async addObserver(observer: ConfigUpdateObserver): Promise<void> {
    this.observers.add(observer);
    await this.beginRealtime();
  }

  /**
   * Removes an observer from the realtime updates.
   * @param observer The observer to remove.
   */
  removeObserver(observer: ConfigUpdateObserver): void {
    if (this.observers.has(observer)) {
      this.observers.delete(observer);
    }
    if (this.observers.size === 0) {
      this.stopRealtime();
    }
  }

  private async beginRealtime(): Promise<void> {
    if (this.observers.size > 0) {
      await this.makeRealtimeHttpConnection(0);
    }
  }

  /**
   * Checks whether connection can be made or not based on some conditions
   * @returns booelean
   */
  private canEstablishStreamConnection(): boolean {
    const hasActiveListeners = this.observers.size > 0;
    const isNotDisabled = !this.isRealtimeDisabled;
    const isForeground = !this.isInBackground;
    const isNoConnectionActive = !this.isConnectionActive;
    return hasActiveListeners && isNotDisabled && isForeground && isNoConnectionActive;
  }

  private async makeRealtimeHttpConnection(delayMillis: number): Promise<void> {
    if (this.scheduledConnectionTimeoutId) {
      clearTimeout(this.scheduledConnectionTimeoutId);
    }
    if (!this.canEstablishStreamConnection()) {
      return;
    }
    this.scheduledConnectionTimeoutId = setTimeout(async () => {
      if (this.retriesRemaining > 0) {
        this.retriesRemaining--;
        await this.beginRealtimeHttpStream();
      } else if (!this.isInBackground) {
        const error = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, { originalErrorMessage: 'Unable to connect to the server. Check your connection and try again.' });
        this.propagateError(error);
      }
    }, delayMillis);
  }

  private setIsHttpConnectionRunning(connectionRunning: boolean): void {
    this.isConnectionActive = connectionRunning;
  }

  private checkAndSetHttpConnectionFlagIfNotRunning(): boolean {
    if (this.canEstablishStreamConnection()) {
      this.streamController = new AbortController();
      this.setIsHttpConnectionRunning(true);
      return true;
    }
    return false;
  }

  private stopRealtime(): void {
    if (this.scheduledConnectionTimeoutId) {
      clearTimeout(this.scheduledConnectionTimeoutId);
      this.scheduledConnectionTimeoutId = undefined;
    }
    this.streamController?.abort();
    this.isConnectionActive = false;
  }

  private resetRetryCount(): void {
    this.retriesRemaining = ORIGINAL_RETRIES;
  }

  private async beginRealtimeHttpStream(): Promise<void> {
    if (!this.checkAndSetHttpConnectionFlagIfNotRunning()) {
      return;
    }

    const [metadataFromStorage, storedVersion] = await Promise.all([
      this.storage.getRealtimeBackoffMetadata(),
      this.storage.getLastKnownTemplateVersion()
    ]);

    let metadata;
    if (metadataFromStorage) {
      metadata = metadataFromStorage;
    } else {
      metadata = {
        backoffEndTimeMillis: new Date(0),
        numFailedStreams: 0
      };
      await this.storage.setRealtimeBackoffMetadata(metadata);
    }

    if (storedVersion !== undefined) {
      this.templateVersion = storedVersion;
    } else {
      this.templateVersion = 0;
      await this.storage.setLastKnownTemplateVersion(0);
    }

    const backoffEndTime = metadata.backoffEndTimeMillis.getTime();
  
    if (Date.now() < backoffEndTime) {
      await this.retryHttpConnectionWhenBackoffEnds();
      return;
    }
    let response: Response | undefined;
    try {
      const [installationId, installationTokenResult] = await Promise.all([
        this.firebaseInstallations.getId(),
        this.firebaseInstallations.getToken(false)
      ]);
      const headers = {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-Google-GFE-Can-Retry': 'yes',
        'X-Accept-Response-Streaming': 'true',
        'If-None-Match': '*',
        'authentication-token': installationTokenResult,
        'Accept': 'application/json'
      };

      const url = this.getRealtimeUrl();
      const requestBody = {
        project: this.projectId,
        namespace: this.namespace,
        lastKnownVersionNumber: this.templateVersion.toString(),
        appId: this.appId,
        sdkVersion: this.sdkVersion,
        appInstanceId: installationId
      };

      response =  await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      if (response?.status === 200 && response?.body) {
        this.resetRetryCount();
        await this.resetRealtimeBackoff();
        //code related to start StartAutofetch
        //and then give the notification to all the observers
      } else {
        throw new FirebaseError('http-status-error', `HTTP Error: ${response.status}`);
      }
    } catch (error) {
      if (this.isInBackground) {
        // It's possible the app was backgrounded while the connection was open, which
        // threw an exception trying to read the response. No real error here, so treat
        // this as a success, even if we haven't read a 200 response code yet.
        this.resetRetryCount();
      } else {
        console.error('Exception connecting to real-time RC backend. Retrying the connection...:', error);
      }
    } finally {
      this.isConnectionActive = false;
      const statusCode = response?.status;
      const connectionFailed = !this.isInBackground && (!statusCode || this.isStatusCodeRetryable(statusCode));

      if (connectionFailed) {
       await this.updateBackoffMetadataWithLastFailedStreamConnectionTime(new Date());
      }

      if (connectionFailed || statusCode === 200) {
        await this.retryHttpConnectionWhenBackoffEnds();
      } else {
        let errorMessage = `Unable to connect to the server. Try again in a few minutes. HTTP status code: ${statusCode}`;
        if (statusCode === 403 && response) {
          errorMessage = await this.parseErrorResponseBody(response.body);
        }
        const firebaseError = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, {
          httpStatus: statusCode,
          originalErrorMessage: errorMessage
        });
        this.propagateError(firebaseError);
      }
    }
  }

  private propagateError = (e: FirebaseError) => this.observers.forEach(o => o.error?.(e));

  private async updateBackoffMetadataWithLastFailedStreamConnectionTime(lastFailedStreamTime: Date): Promise<void> {
    const numFailedStreams = ((await this.storage.getRealtimeBackoffMetadata())?.numFailedStreams || 0) + 1;
    const backoffMillis = calculateBackoffMillis(numFailedStreams);
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: new Date(lastFailedStreamTime.getTime() + backoffMillis),
      numFailedStreams
    });
  }

  private isStatusCodeRetryable = (sc?: number) => !sc || [408, 429, 500, 502, 503, 504].includes(sc);

  private async retryHttpConnectionWhenBackoffEnds(): Promise<void> {
    const metadata = (await this.storage.getRealtimeBackoffMetadata()) || {
      backoffEndTimeMillis: new Date(0),
      numFailedStreams: 0
    };
    const backoffEndTime = new Date(metadata.backoffEndTimeMillis).getTime();
    const currentTime = Date.now();
    const retrySeconds = Math.max(0, backoffEndTime - currentTime);
    await this.makeRealtimeHttpConnection(retrySeconds);
  }

  private async resetRealtimeBackoff(): Promise<void> {
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: new Date(0),
      numFailedStreams: 0
    });
  }


  private getRealtimeUrl(): URL {
    const urlBase =
      window.FIREBASE_REMOTE_CONFIG_URL_BASE ||
      'https://firebaseremoteconfigrealtime.googleapis.com';

    const urlString = `${urlBase}/v1/projects/${this.projectId}/namespaces/${this.namespace}:streamFetchInvalidations?key=${this.apiKey}`;
    return new URL(urlString);
  }

  private async parseErrorResponseBody(
    body: ReadableStream<Uint8Array> | null
  ): Promise<string> {
    if (!body) {
      return 'Response body is empty.';
    }

    try {
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
      }
      const blob = new Blob(chunks);
      const text = await blob.text();

      const jsonResponse = JSON.parse(text);
      return (
        jsonResponse.error?.message ||
        jsonResponse.message ||
        'Unknown error from server.'
      );
    } catch (e) {
      return 'Could not parse error response body, or body is not JSON.';
    }
  }
}

