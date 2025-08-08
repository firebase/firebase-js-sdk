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

import { _FirebaseInstallationsInternal } from "@firebase/installations";
import { ConfigUpdate, ConfigUpdateObserver } from "../public_types";
import { calculateBackoffMillis, FirebaseError } from "@firebase/util";
import { ERROR_FACTORY, ErrorCode } from "../errors";
import { Storage } from "../storage/storage";
const ORIGINAL_RETRIES = 8;
const API_KEY_HEADER = 'X-Goog-Api-Key';
const INSTALLATIONS_AUTH_TOKEN_HEADER = 'X-Goog-Firebase-Installations-Auth';
export class RealtimeHandler {
  constructor(
    private readonly firebaseInstallations: _FirebaseInstallationsInternal,
    private readonly storage: Storage,
    private readonly sdkVersion: string,
    private readonly namespace: string,
    private readonly projectId: string,
    private readonly apiKey: string,
    private readonly appId: string,
  ) { }

  private observers: Set<ConfigUpdateObserver> = new Set<ConfigUpdateObserver>();
  private isConnectionActive: boolean = false;
  private retriesRemaining: number = ORIGINAL_RETRIES;
  private isRealtimeDisabled: boolean = false;
  private scheduledConnectionTimeoutId?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private reader: ReadableStreamDefaultReader | undefined;

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
      // this.stopRealtime();
    }
  }

  /**
  * Checks whether connection can be made or not based on some conditions
  * @returns booelean
  */
  private canEstablishStreamConnection(): boolean {
    const hasActiveListeners = this.observers.size > 0;
    const isNotDisabled = !this.isRealtimeDisabled;
    const isNoConnectionActive = !this.isConnectionActive;
    return hasActiveListeners && isNotDisabled && isNoConnectionActive;
  }

  private async beginRealtime(): Promise<void> {
    if (this.observers.size > 0) {
      await this.makeRealtimeHttpConnection(0);
    }
  }

  private async makeRealtimeHttpConnection(delayMillis: number): Promise<void> {
    if (!this.canEstablishStreamConnection()) {
      return;
    }
    if (this.retriesRemaining > 0) {
      this.retriesRemaining--;
      console.log(this.retriesRemaining);
      this.scheduledConnectionTimeoutId = setTimeout(async () => {
        await this.beginRealtimeHttpStream();
      }, delayMillis);
    }
  }

  private propagateError = (e: FirebaseError) => this.observers.forEach(o => o.error?.(e));

  private checkAndSetHttpConnectionFlagIfNotRunning(): boolean {
    let canMakeConnection: boolean;
    canMakeConnection = this.canEstablishStreamConnection();
    if (canMakeConnection) {
      this.setIsHttpConnectionRunning(true);
    }
    return canMakeConnection;
  }

  private setIsHttpConnectionRunning(connectionRunning: boolean): void {
    this.isConnectionActive = connectionRunning;
  }

  private async beginRealtimeHttpStream(): Promise<void> {
    if (!this.checkAndSetHttpConnectionFlagIfNotRunning()) {
      return;
    }
    const metadataFromStorage = await this.storage.getRealtimeBackoffMetadata();
    let metadata;
    if (metadataFromStorage) {
      metadata = metadataFromStorage;
    } else {
      metadata = {
        backoffEndTimeMillis: new Date(-1),
        numFailedStreams: 0
      }
      await this.storage.setRealtimeBackoffMetadata(metadata);
    }
    const backoffEndTime = metadata.backoffEndTimeMillis.getTime();

    if (Date.now() < backoffEndTime) {
      await this.retryHttpConnectionWhenBackoffEnds();
      return;
    }

    let response: Response | undefined;
    let responseCode: number | undefined;

    try {
      response = await this.createRealtimeConnection();
      responseCode = response.status;

      if (response.ok && response.body) {
        this.resetRetryCount();
        await this.resetRealtimeBackoff();
        //const configAutoFetch = this.startAutoFetch(reader);
        //await configAutoFetch.listenForNotifications();
      }
    }
    catch (error) {
      console.error('Exception connecting to real-time RC backend. Retrying the connection...:', error);
    }
    finally {
      this.closeRealtimeHttpConnection();
      this.setIsHttpConnectionRunning(false);
      const connectionFailed = responseCode == null || this.isStatusCodeRetryable(responseCode);

      if (connectionFailed) {
        await this.updateBackoffMetadataWithLastFailedStreamConnectionTime(new Date());
      }

      if (connectionFailed || response?.ok) {
        await this.retryHttpConnectionWhenBackoffEnds();
      } else {
        let errorMessage = `Unable to connect to the server. HTTP status code: ${responseCode}`;
        if (responseCode === 403) {
          if (response) {
            errorMessage = await this.parseForbiddenErrorResponseMessage(response);
          }
        }
        const firebaseError = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, {
          httpStatus: responseCode,
          originalErrorMessage: errorMessage
        });
        this.propagateError(firebaseError);
      }
    }
  }

  private async retryHttpConnectionWhenBackoffEnds(): Promise<void> {
    const metadataFromStorage = await this.storage.getRealtimeBackoffMetadata();
    let metadata;
    if (metadataFromStorage) {
      metadata = metadataFromStorage;
    } else {
      metadata = {
        backoffEndTimeMillis: new Date(-1),
        numFailedStreams: 0
      }
      await this.storage.setRealtimeBackoffMetadata(metadata);
    }
    const backoffEndTime = new Date(metadata.backoffEndTimeMillis).getTime();
    const currentTime = Date.now();
    const retryMillis = Math.max(0, backoffEndTime - currentTime);
    this.makeRealtimeHttpConnection(retryMillis);
  }

  private async resetRealtimeBackoff(): Promise<void> {
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: new Date(-1),
      numFailedStreams: 0
    });
  }

  private resetRetryCount(): void {
    this.retriesRemaining = ORIGINAL_RETRIES;
  }

  private isStatusCodeRetryable = (sc?: number) => !sc || [408, 429, 502, 503, 504].includes(sc);

  private async updateBackoffMetadataWithLastFailedStreamConnectionTime(lastFailedStreamTime: Date): Promise<void> {
    const numFailedStreams = ((await this.storage.getRealtimeBackoffMetadata())?.numFailedStreams || 0) + 1;
    const backoffMillis = calculateBackoffMillis(numFailedStreams);
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: new Date(lastFailedStreamTime.getTime() + backoffMillis),
      numFailedStreams
    });
  }

  private async createRealtimeConnection(): Promise<Response> {
    this.controller = new AbortController();
    const [installationId, installationTokenResult] = await Promise.all([
      this.firebaseInstallations.getId(),
      this.firebaseInstallations.getToken(false)
    ]);
    let response: Response;
    const url = this.getRealtimeUrl();
    response = await this.setRequestParams(url, installationId, installationTokenResult, this.controller.signal);
    return response;
  }

  private getRealtimeUrl(): URL {
    const urlBase =
      window.FIREBASE_REMOTE_CONFIG_URL_BASE ||
      'https://firebaseremoteconfigrealtime.googleapis.com';

    const urlString = `${urlBase}/v1/projects/${this.projectId}/namespaces/${this.namespace}:streamFetchInvalidations?key=${this.apiKey}`;
    return new URL(urlString);
  }

  private async setRequestParams(url: URL, installationId: string, installationTokenResult: string, signal: AbortSignal): Promise<Response> {
    const eTagValue = await this.storage.getActiveConfigEtag();
    const headers = {
      [API_KEY_HEADER]: this.apiKey,
      [INSTALLATIONS_AUTH_TOKEN_HEADER]: installationTokenResult,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'If-None-Match': eTagValue || '*',
      'Content-Encoding': 'gzip',
    };
    const requestBody = {
      project: this.projectId,
      namespace: this.namespace,
      lastKnownVersionNumber: await this.storage.getLastKnownTemplateVersion(),
      appId: this.appId,
      sdkVersion: this.sdkVersion,
      appInstanceId: installationId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: signal
    });
    return response;
  }

  private parseForbiddenErrorResponseMessage(response: Response): Promise<string> {
    const error = response.text();
    return error;
  }

  private closeRealtimeHttpConnection(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = undefined;
    }

    if (this.reader) {
      this.reader.cancel();
      this.reader = undefined;
    }
  }
}