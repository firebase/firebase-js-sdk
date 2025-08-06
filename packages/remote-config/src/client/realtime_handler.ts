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

import { ConfigUpdate, ConfigUpdateObserver, FetchResponse, FirebaseRemoteConfigObject } from '../public_types';
import { ERROR_FACTORY, ErrorCode } from '../errors';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { Storage } from '../storage/storage';
import { calculateBackoffMillis, FirebaseError } from '@firebase/util';
import { StorageCache } from '../storage/storage_cache';
import { FetchRequest, RemoteConfigAbortSignal } from './remote_config_fetch_client';
import { RestClient } from './rest_client';

const ORIGINAL_RETRIES = 8;

export class RealtimeHandler {
  constructor(
    private readonly firebaseInstallations: _FirebaseInstallationsInternal,
    private readonly storage: Storage,
    private readonly sdkVersion: string,
    private readonly namespace: string,
    private readonly projectId: string,
    private readonly apiKey: string,
    private readonly appId: string,
  ) {
    this.restclient = new RestClient(
      firebaseInstallations,
      sdkVersion,
      namespace,
      projectId,
      apiKey,
      appId
    );
    this.activatedCache = new StorageCache(storage);
  }

  private streamController?: AbortController;
  private observers: Set<ConfigUpdateObserver> = new Set<ConfigUpdateObserver>();
  private isConnectionActive: boolean = false;
  private retriesRemaining: number = ORIGINAL_RETRIES;
  private isRealtimeDisabled: boolean = false;
  private isInBackground: boolean = false;
  private scheduledConnectionTimeoutId?: ReturnType<typeof setTimeout>;
  private templateVersion: number = 0;
  private activatedCache: StorageCache;
  private restclient: RestClient;

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

  private startAutoFetch(reader: ReadableStreamDefaultReader<Uint8Array>): ConfigAutoFetch {
    const retryCallback: ConfigUpdateObserver = {
      next: (configUpdate: ConfigUpdate) => {/* no-op for internal observer's 'next' */ },
      error: (e: FirebaseError) => {
        this.isRealtimeDisabled = true;
        this.propagateError(e);
      },
      complete: () => { /* no-op for internal observer's 'complete' */ }
    };

    return new ConfigAutoFetch(
      reader,
      this.observers,
      this.activatedCache,
      this.storage,
      retryCallback,
      this.restclient
    );
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
    // if (this.scheduledConnectionTimeoutId) {
    //   clearTimeout(this.scheduledConnectionTimeoutId);
    // }
    if (!this.canEstablishStreamConnection()) {
      return;
    }

    if (this.retriesRemaining > 0) {
      this.retriesRemaining--;
      this.scheduledConnectionTimeoutId = setTimeout(async () => {
        await this.beginRealtimeHttpStream();
      }, delayMillis);
    } else if (!this.isInBackground) {
      const error = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, { originalErrorMessage: 'Unable to connect to the server. Check your connection and try again.' });
      this.propagateError(error);
    }
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

    const [metadata, storedVersion] = await Promise.all([
      this.storage.getRealtimeBackoffMetadata(),
      this.storage.getLastKnownTemplateVersion()
    ]);

    // let metadata;
    // if (metadataFromStorage) {
    //   metadata = metadataFromStorage;
    // } else {
    //   metadata = {
    //     backoffEndTimeMillis: new Date(0),
    //     numFailedStreams: 0
    //   };
    //   await this.storage.setRealtimeBackoffMetadata(metadata);
    // }

    // if (storedVersion !== undefined) {
    //   this.templateVersion = storedVersion;
    // } else {
    //   this.templateVersion = 0;
    //   await this.storage.setLastKnownTemplateVersion(0);
    // }

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
        lastKnownVersionNumber: (await this.storage.getLastKnownTemplateVersion()).toString,
        appId: this.appId,
        sdkVersion: this.sdkVersion,
        appInstanceId: installationId
      };

      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      if (response?.status === 200 && response?.body) {
        this.resetRetryCount();
        await this.resetRealtimeBackoff();
        const configAutoFetch = this.startAutoFetch(response.body.getReader());
        void configAutoFetch.listenForNotifications();
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
      const connectionFailed = !this.isInBackground && (statusCode == null || this.isStatusCodeRetryable(statusCode));

      if (connectionFailed) {
        await this.updateBackoffMetadataWithLastFailedStreamConnectionTime(new Date());
      }
      // If responseCode is null then no connection was made to server and the SDK should
      // still
      // retry.
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

  private isStatusCodeRetryable = (sc?: number) => !sc || [408, 429, 502, 503, 504].includes(sc);

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

const MAXIMUM_FETCH_ATTEMPTS = 3;
const FETCH_RETRY_DELAY_SECONDS = 4;

class ConfigAutoFetch {
  private decoder = new TextDecoder('utf-8');
  private buffer = '';
  private currentFetchTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
    private readonly observers: Set<ConfigUpdateObserver>,
    private readonly storageCache: StorageCache,
    private storage: Storage,
    private readonly retrycallback: ConfigUpdateObserver,
    private restclient: RestClient
  ) { }

  public async listenForNotifications(): Promise<void> {
    let partialUpdateConfigMessage;
    let currentConfigUpdateMessage = '';

    if (!this.reader) return;
    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;
        partialUpdateConfigMessage = this.decoder.decode(value, { stream: true }).substring(1);
        currentConfigUpdateMessage += partialUpdateConfigMessage;
        if (partialUpdateConfigMessage.includes('}')) {
          const data = JSON.parse(currentConfigUpdateMessage);
          if (isNaN(data.latestTemplateVersionNumber)) return;
          let oldtemplateVersion = await this.storage.getLastKnownTemplateVersion();
          let templateVersion = Number(data.latestTemplateVersionNumber);
          if (templateVersion > oldtemplateVersion) {
            console.log('Received new template version:', templateVersion);
            this.autoFetch(MAXIMUM_FETCH_ATTEMPTS, templateVersion);
          }
        }
      }

      // console.log(partialUpdateConfigMessage);
      // let lastIndex;
      // while ((lastIndex = this.buffer.indexOf('\n')) !== -1) {
      //   const message = this.buffer.substring(0, lastIndex).trim();
      //   this.buffer = this.buffer.substring(lastIndex + 1);
      //   if (!message) continue;
      //   try {
      //     console.log('message:', message);
      //     const data = JSON.parse(message);
      //     console.log(data);
      //     if (data.featureDisabled === true) {
      //       const error = ERROR_FACTORY.create(
      //         ErrorCode.CONFIG_UPDATE_UNAVAILABLE,
      //         { originalErrorMessage: 'The server is temporarily unavailable. Realtime updates disabled.' }
      //       );
      //       this.retrycallback.error?.(error);
      //       return;
      //     }
      //     if (this.observers.size === 0) return;
      //     if (typeof data.latestTemplateVersionNumber === 'number' && data.latestTemplateVersionNumber > this.templateVersionRef) {
      //       console.log('Received new template version:', data.latestTemplateVersionNumber);
      //       const targetTemplateVersion = data.latestTemplateVersionNumber;
      //       this.autoFetch(MAXIMUM_FETCH_ATTEMPTS, targetTemplateVersion);
      //     }
      //   } catch (e: unknown) {
      //     const errorMessage = e instanceof Error ? e.message : String(e);
      //     const error = ERROR_FACTORY.create(
      //       ErrorCode.CONFIG_UPDATE_MESSAGE_INVALID,
      //       { originalErrorMessage: `Unable to parse config update message: ${errorMessage}` }
      //     );
      //     this.retrycallback.error?.(error);
      //   }
      // }


    } catch (e: unknown) {
      const errorAsError = e instanceof Error ? e : new Error(String(e));
      if (errorAsError.name !== 'AbortError') {
        const firebaseError = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, {
          originalErrorMessage: `Error reading real-time stream: ${errorAsError.message || 'unknown error'}`
        });
        this.retrycallback.error?.(firebaseError);
      }
    }
  }

  private autoFetch(remainingAttempts: number, targetVersion: number): void {
    if (remainingAttempts === 0) {
      const error = ERROR_FACTORY.create(
        ErrorCode.CONFIG_UPDATE_NOT_FETCHED,
        { originalErrorMessage: 'Unable to fetch the latest version of the template.' }
      );
      this.retrycallback.error?.(error);
      return;
    }

    const timeTillFetch = getRandomInt(4);
    setTimeout(async () => {
      await this.fetchLatestConfig(remainingAttempts, targetVersion);
    }, timeTillFetch);
  }

  private async fetchLatestConfig(remainingAttempts: number, targetVersion: number): Promise<void> {
    const remainingAttemptsAfterFetch = remainingAttempts - 1;
    try {
      const fetchRequest: FetchRequest = {
        cacheMaxAgeMillis: 0,
        signal: new RemoteConfigAbortSignal(),
      };
      const fetchResponse: FetchResponse = await this.restclient.fetch(fetchRequest);
      console.log(fetchResponse.templateVersionNumber);
      const activatedConfigs = (await this.storage.getActiveConfig());
      console.log("activatedConfigs:", activatedConfigs);
      console.log(fetchResponse.config);

      if (!this.fetchResponseIsUpToDate(fetchResponse, targetVersion)) {
        console.log("Fetched template version is the same as SDK's current version." + " Retrying fetch.");
        this.autoFetch(remainingAttemptsAfterFetch, targetVersion);
        return;
      }

      if (fetchResponse.config == null) {
        console.log("The fetch succeeded, but the backend had no updates.");
        return;
      }

      if (activatedConfigs == null) {
        ///what to do over here??
      }

      const updatedKeys = getChangedParams(fetchResponse.config, activatedConfigs);

      if (updatedKeys.size === 0) {
        console.log("Config was fetched, but no params changed.");
        return;
      }

      const configUpdate: ConfigUpdate = {
        // Implement the getUpdatedKeys method
        getUpdatedKeys(): Set<string> {
          return new Set(updatedKeys);
        }
      };

      this.executeAllListenerCallbacks(configUpdate);

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const error = ERROR_FACTORY.create(
        ErrorCode.CONFIG_UPDATE_NOT_FETCHED,
        { originalErrorMessage: `Failed to auto-fetch config update: ${errorMessage}` }
      );
      this.retrycallback.error?.(error);
    }
  }
  private executeAllListenerCallbacks(configUpdate: ConfigUpdate): void {
    this.observers.forEach(observer => observer.next(configUpdate));
  }

  private fetchResponseIsUpToDate(fetchResponse: FetchResponse, lastKnownVersion: number): boolean {
    // If there's a config, make sure its version is >= the last known version.
    if (fetchResponse.config != null) {
      return fetchResponse.templateVersionNumber >= lastKnownVersion;
    }
    // If there isn't a config, treat as not up to date
    return false;
  }
}

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function getChangedParams(
  newConfig: FirebaseRemoteConfigObject,
  oldConfig: FirebaseRemoteConfigObject
): Set<string> {
  const changed = new Set<string>();

  // Assume configs are plain objects with key-value pairs
  const newKeys = new Set(Object.keys(newConfig || {}));
  const oldKeys = new Set(Object.keys(oldConfig || {}));

  // Keys present in newConfig but not in oldConfig, or with different values
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      changed.add(key);
      continue;
    }
    if (JSON.stringify((newConfig as any)[key]) !== JSON.stringify((oldConfig as any)[key])) {
      changed.add(key);
      continue;
    }
  }

  // Keys present in oldConfig but not in newConfig
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      changed.add(key);
    }
  }

  return changed;
}