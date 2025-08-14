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

import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { Logger } from '@firebase/logger';
import {
  ConfigUpdate,
  ConfigUpdateObserver,
  FetchResponse,
  FirebaseRemoteConfigObject
} from '../public_types';
import { calculateBackoffMillis, FirebaseError } from '@firebase/util';
import { ERROR_FACTORY, ErrorCode } from '../errors';
import { Storage } from '../storage/storage';
import { VisibilityMonitor } from './visibility_monitor';
import { StorageCache } from '../storage/storage_cache';
import {
  FetchRequest,
  RemoteConfigAbortSignal
} from './remote_config_fetch_client';
import { CachingClient } from './caching_client';

const API_KEY_HEADER = 'X-Goog-Api-Key';
const INSTALLATIONS_AUTH_TOKEN_HEADER = 'X-Goog-Firebase-Installations-Auth';
const ORIGINAL_RETRIES = 8;
const MAXIMUM_FETCH_ATTEMPTS = 3;
const NO_BACKOFF_TIME_IN_MILLIS = -1;
const NO_FAILED_REALTIME_STREAMS = 0;
const REALTIME_DISABLED_KEY = 'featureDisabled';
const REALTIME_RETRY_INTERVAL = 'retryIntervalSeconds';
const TEMPLATE_VERSION_KEY = 'latestTemplateVersionNumber';

export class RealtimeHandler {
  constructor(
    private readonly firebaseInstallations: _FirebaseInstallationsInternal,
    private readonly storage: Storage,
    private readonly sdkVersion: string,
    private readonly namespace: string,
    private readonly projectId: string,
    private readonly apiKey: string,
    private readonly appId: string,
    private readonly logger: Logger,
    private readonly storageCache: StorageCache,
    private readonly cachingClient: CachingClient
  ) {
    void this.setRetriesRemaining();
    void VisibilityMonitor.getInstance().on(
      'visible',
      this.onVisibilityChange,
      this
    );
  }

  private observers: Set<ConfigUpdateObserver> =
    new Set<ConfigUpdateObserver>();
  private isConnectionActive: boolean = false;
  private isRealtimeDisabled: boolean = false;
  private controller?: AbortController;
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  private httpRetriesRemaining: number = ORIGINAL_RETRIES;
  private isInBackground: boolean = false;
  private readonly decoder = new TextDecoder('utf-8');
  private isClosingConnection: boolean = false;

  private async setRetriesRemaining(): Promise<void> {
    // Retrieve number of remaining retries from last session. The minimum retry count being one.
    const metadata = await this.storage.getRealtimeBackoffMetadata();
    const numFailedStreams = metadata?.numFailedStreams || 0;
    this.httpRetriesRemaining = Math.max(
      ORIGINAL_RETRIES - numFailedStreams,
      1
    );
  }

  private propagateError = (e: FirebaseError): void =>
    this.observers.forEach(o => o.error?.(e));

  /**
   * Increment the number of failed stream attempts, increase the backoff duration, set the backoff
   * end time to "backoff duration" after {@code lastFailedStreamTime} and persist the new
   * values to storage metadata.
   */
  private async updateBackoffMetadataWithLastFailedStreamConnectionTime(
    lastFailedStreamTime: Date
  ): Promise<void> {
    const numFailedStreams =
      ((await this.storage.getRealtimeBackoffMetadata())?.numFailedStreams ||
        0) + 1;
    const backoffMillis = calculateBackoffMillis(numFailedStreams, 60000, 2);
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: new Date(
        lastFailedStreamTime.getTime() + backoffMillis
      ),
      numFailedStreams
    });
  }

  /**
   * Increase the backoff duration with a new end time based on Retry Interval.
   */
  private async updateBackoffMetadataWithRetryInterval(
    retryIntervalSeconds: number
  ): Promise<void> {
    const currentTime = Date.now();
    const backoffDurationInMillis = retryIntervalSeconds * 1000;
    const backoffEndTime = new Date(currentTime + backoffDurationInMillis);
    const numFailedStreams =
      (await this.storage.getRealtimeBackoffMetadata())?.numFailedStreams || 0;
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: backoffEndTime,
      numFailedStreams
    });
    await this.retryHttpConnectionWhenBackoffEnds();
  }

  /**
   * HTTP status code that the Realtime client should retry on.
   */
  private isStatusCodeRetryable = (statusCode?: number): boolean => {
    const retryableStatusCodes = [
      408, // Request Timeout
      429, // Too Many Requests
      502, // Bad Gateway
      503, // Service Unavailable
      504 // Gateway Timeout
    ];
    return !statusCode || retryableStatusCodes.includes(statusCode);
  };

  /**
   * Closes the realtime HTTP connection.
   * Note: This method is designed to be called only once at a time.
   * If a call is already in progress, subsequent calls will be ignored.
   */
  private async closeRealtimeHttpConnection(): Promise<void> {
    if (this.isClosingConnection) {
      return;
    }
    this.isClosingConnection = true;

    try {
      if (this.reader) {
        await this.reader.cancel();
      }
    } catch (e) {
      // The network connection was lost, so cancel() failed.
      // This is expected in a disconnected state, so we can safely ignore the error.
      this.logger.debug('Failed to cancel the reader, connection is gone.');
    } finally {
      this.reader = undefined;
    }

    if (this.controller) {
      await this.controller.abort();
      this.controller = undefined;
    }

    this.isClosingConnection = false;
  }

  private async resetRealtimeBackoff(): Promise<void> {
    await this.storage.setRealtimeBackoffMetadata({
      backoffEndTimeMillis: new Date(-1),
      numFailedStreams: 0
    });
  }

  private resetRetryCount(): void {
    this.httpRetriesRemaining = ORIGINAL_RETRIES;
  }

  /**
   * Assembles the request headers and body and executes the fetch request to
   * establish the real-time streaming connection. This is the "worker" method
   * that performs the actual network communication.
   */
  private async establishRealtimeConnection(
    url: URL,
    installationId: string,
    installationTokenResult: string,
    signal: AbortSignal
  ): Promise<Response> {
    const eTagValue = await this.storage.getActiveConfigEtag();
    const lastKnownVersionNumber =
      await this.storage.getActiveConfigTemplateVersion();

    const headers = {
      [API_KEY_HEADER]: this.apiKey,
      [INSTALLATIONS_AUTH_TOKEN_HEADER]: installationTokenResult,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'If-None-Match': eTagValue || '*',
      'Content-Encoding': 'gzip'
    };

    const requestBody = {
      project: this.projectId,
      namespace: this.namespace,
      lastKnownVersionNumber,
      appId: this.appId,
      sdkVersion: this.sdkVersion,
      appInstanceId: installationId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal
    });
    return response;
  }

  private getRealtimeUrl(): URL {
    const urlBase =
      window.FIREBASE_REMOTE_CONFIG_URL_BASE ||
      'https://firebaseremoteconfigrealtime.googleapis.com';

    const urlString = `${urlBase}/v1/projects/${this.projectId}/namespaces/${this.namespace}:streamFetchInvalidations?key=${this.apiKey}`;
    return new URL(urlString);
  }

  private async createRealtimeConnection(): Promise<Response> {
    const [installationId, installationTokenResult] = await Promise.all([
      this.firebaseInstallations.getId(),
      this.firebaseInstallations.getToken(false)
    ]);
    this.controller = new AbortController();
    const url = this.getRealtimeUrl();
    const realtimeConnection = await this.establishRealtimeConnection(
      url,
      installationId,
      installationTokenResult,
      this.controller.signal
    );
    return realtimeConnection;
  }

  /**
   * Retries HTTP stream connection asyncly in random time intervals.
   */
  private async retryHttpConnectionWhenBackoffEnds(): Promise<void> {
    let backoffMetadata = await this.storage.getRealtimeBackoffMetadata();
    if (!backoffMetadata) {
      backoffMetadata = {
        backoffEndTimeMillis: new Date(NO_BACKOFF_TIME_IN_MILLIS),
        numFailedStreams: NO_FAILED_REALTIME_STREAMS
      };
    }
    const backoffEndTime = new Date(
      backoffMetadata.backoffEndTimeMillis
    ).getTime();
    const currentTime = Date.now();
    const retryMillis = Math.max(0, backoffEndTime - currentTime);
    await this.makeRealtimeHttpConnection(retryMillis);
  }

  private setIsHttpConnectionRunning(connectionRunning: boolean): void {
    this.isConnectionActive = connectionRunning;
  }

  /**
   * Combines the check and set operations to prevent multiple asynchronous
   * calls from redundantly starting an HTTP connection. This ensures that
   * only one attempt is made at a time.
   */
  private checkAndSetHttpConnectionFlagIfNotRunning(): boolean {
    const canMakeConnection = this.canEstablishStreamConnection();
    if (canMakeConnection) {
      this.setIsHttpConnectionRunning(true);
    }
    return canMakeConnection;
  }

  private fetchResponseIsUpToDate(
    fetchResponse: FetchResponse,
    lastKnownVersion: number
  ): boolean {
    // If there is a config, make sure its version is >= the last known version.
    if (fetchResponse.config != null && fetchResponse.templateVersion) {
      return fetchResponse.templateVersion >= lastKnownVersion;
    }
    // If there isn't a config, return true if the fetch was successful and backend had no update.
    // Else, it returned an out of date config.
    return this.storageCache.getLastFetchStatus() === 'success';
  }

  private parseAndValidateConfigUpdateMessage(message: string): string {
    const left = message.indexOf('{');
    const right = message.indexOf('}', left);

    if (left < 0 || right < 0) {
      return '';
    }
    return left >= right ? '' : message.substring(left, right + 1);
  }

  private isEventListenersEmpty(): boolean {
    return this.observers.size === 0;
  }

  private getRandomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }

  private executeAllListenerCallbacks(configUpdate: ConfigUpdate): void {
    this.observers.forEach(observer => observer.next(configUpdate));
  }

  /**
   * Compares two configuration objects and returns a set of keys that have changed.
   * A key is considered changed if it's new, removed, or has a different value.
   */
  private getChangedParams(
    newConfig: FirebaseRemoteConfigObject,
    oldConfig: FirebaseRemoteConfigObject
  ): Set<string> {
    const changedKeys = new Set<string>();
    const newKeys = new Set(Object.keys(newConfig || {}));
    const oldKeys = new Set(Object.keys(oldConfig || {}));

    for (const key of newKeys) {
      if (!oldKeys.has(key) || newConfig[key] !== oldConfig[key]) {
        changedKeys.add(key);
      }
    }

    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        changedKeys.add(key);
      }
    }

    return changedKeys;
  }

  private async fetchLatestConfig(
    remainingAttempts: number,
    targetVersion: number
  ): Promise<void> {
    const remainingAttemptsAfterFetch = remainingAttempts - 1;
    const currentAttempt = MAXIMUM_FETCH_ATTEMPTS - remainingAttemptsAfterFetch;
    const customSignals = this.storageCache.getCustomSignals();
    if (customSignals) {
      this.logger.debug(
        `Fetching config with custom signals: ${JSON.stringify(customSignals)}`
      );
    }
    const abortSignal = new RemoteConfigAbortSignal();
    try {
      const fetchRequest: FetchRequest = {
        cacheMaxAgeMillis: 0,
        signal: abortSignal,
        customSignals,
        fetchType: 'REALTIME',
        fetchAttempt: currentAttempt
      };

      const fetchResponse: FetchResponse = await this.cachingClient.fetch(
        fetchRequest
      );
      let activatedConfigs = await this.storage.getActiveConfig();

      if (!this.fetchResponseIsUpToDate(fetchResponse, targetVersion)) {
        this.logger.debug(
          "Fetched template version is the same as SDK's current version." +
            ' Retrying fetch.'
        );
        // Continue fetching until template version number is greater than current.
        await this.autoFetch(remainingAttemptsAfterFetch, targetVersion);
        return;
      }

      if (fetchResponse.config == null) {
        this.logger.debug(
          'The fetch succeeded, but the backend had no updates.'
        );
        return;
      }

      if (activatedConfigs == null) {
        activatedConfigs = {};
      }

      const updatedKeys = this.getChangedParams(
        fetchResponse.config,
        activatedConfigs
      );

      if (updatedKeys.size === 0) {
        this.logger.debug('Config was fetched, but no params changed.');
        return;
      }

      const configUpdate: ConfigUpdate = {
        getUpdatedKeys(): Set<string> {
          return new Set(updatedKeys);
        }
      };
      this.executeAllListenerCallbacks(configUpdate);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const error = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_NOT_FETCHED, {
        originalErrorMessage: `Failed to auto-fetch config update: ${errorMessage}`
      });
      this.propagateError(error);
    }
  }

  private async autoFetch(
    remainingAttempts: number,
    targetVersion: number
  ): Promise<void> {
    if (remainingAttempts === 0) {
      const error = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_NOT_FETCHED, {
        originalErrorMessage:
          'Unable to fetch the latest version of the template.'
      });
      this.propagateError(error);
      return;
    }

    const timeTillFetchSeconds = this.getRandomInt(4);
    const timeTillFetchInMiliseconds = timeTillFetchSeconds * 1000;

    await new Promise(resolve =>
      setTimeout(resolve, timeTillFetchInMiliseconds)
    );
    await this.fetchLatestConfig(remainingAttempts, targetVersion);
  }

  /**
   * Processes a stream of real-time messages for configuration updates.
   * This method reassembles fragmented messages, validates and parses the JSON,
   * and automatically fetches a new config if a newer template version is available.
   * It also handles server-specified retry intervals and propagates errors for
   * invalid messages or when real-time updates are disabled.
   */
  private async handleNotifications(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<void> {
    if (reader == null) {
      return;
    }

    let partialConfigUpdateMessage: string;
    let currentConfigUpdateMessage = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      partialConfigUpdateMessage = this.decoder.decode(value, { stream: true });
      currentConfigUpdateMessage += partialConfigUpdateMessage;

      if (partialConfigUpdateMessage.includes('}')) {
        currentConfigUpdateMessage = this.parseAndValidateConfigUpdateMessage(
          currentConfigUpdateMessage
        );

        if (currentConfigUpdateMessage.length === 0) {
          continue;
        }

        try {
          const jsonObject = JSON.parse(currentConfigUpdateMessage);

          if (this.isEventListenersEmpty()) {
            break;
          }

          if (
            REALTIME_DISABLED_KEY in jsonObject &&
            jsonObject[REALTIME_DISABLED_KEY] === true
          ) {
            const error = ERROR_FACTORY.create(
              ErrorCode.CONFIG_UPDATE_UNAVAILABLE,
              {
                originalErrorMessage:
                  'The server is temporarily unavailable. Try again in a few minutes.'
              }
            );
            this.propagateError(error);
            break;
          }

          if (TEMPLATE_VERSION_KEY in jsonObject) {
            const oldTemplateVersion =
              await this.storage.getActiveConfigTemplateVersion();
            const targetTemplateVersion = Number(
              jsonObject[TEMPLATE_VERSION_KEY]
            );
            if (
              oldTemplateVersion &&
              targetTemplateVersion > oldTemplateVersion
            ) {
              await this.autoFetch(
                MAXIMUM_FETCH_ATTEMPTS,
                targetTemplateVersion
              );
            }
          }

          // This field in the response indicates that the realtime request should retry after the
          // specified interval to establish a long-lived connection. This interval extends the
          // backoff duration without affecting the number of retries, so it will not enter an
          // exponential backoff state.
          if (REALTIME_RETRY_INTERVAL in jsonObject) {
            const retryIntervalSeconds = Number(
              jsonObject[REALTIME_RETRY_INTERVAL]
            );
            await this.updateBackoffMetadataWithRetryInterval(
              retryIntervalSeconds
            );
          }
        } catch (e: unknown) {
          this.logger.debug('Unable to parse latest config update message.', e);
          const errorMessage = e instanceof Error ? e.message : String(e);
          this.propagateError(
            ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_MESSAGE_INVALID, {
              originalErrorMessage: errorMessage
            })
          );
        }
        currentConfigUpdateMessage = '';
      }
    }
  }

  private async listenForNotifications(
    reader: ReadableStreamDefaultReader
  ): Promise<void> {
    try {
      await this.handleNotifications(reader);
    } catch (e) {
      // If the real-time connection is at an unexpected lifecycle state when the app is
      // backgrounded, it's expected closing the connection and will throw an exception.
      if (!this.isInBackground) {
        // Otherwise, the real-time server connection was closed due to a transient issue.
        this.logger.debug(
          'Real-time connection was closed due to an exception.'
        );
      }
    }
  }

  /**
   * Open the real-time connection, begin listening for updates, and auto-fetch when an update is
   * received.
   *
   * <p>If the connection is successful, this method will block on its thread while it reads the
   * chunk-encoded HTTP body. When the connection closes, it attempts to reestablish the stream.
   */
  private async beginRealtimeHttpStream(): Promise<void> {
    if (!this.checkAndSetHttpConnectionFlagIfNotRunning()) {
      return;
    }

    let backoffMetadata = await this.storage.getRealtimeBackoffMetadata();
    if (!backoffMetadata) {
      backoffMetadata = {
        backoffEndTimeMillis: new Date(NO_BACKOFF_TIME_IN_MILLIS),
        numFailedStreams: NO_FAILED_REALTIME_STREAMS
      };
    }
    const backoffEndTime = backoffMetadata.backoffEndTimeMillis.getTime();
    if (Date.now() < backoffEndTime) {
      await this.retryHttpConnectionWhenBackoffEnds();
      return;
    }

    let response: Response | undefined;
    let responseCode: number | undefined;
    try {
      //this has been called in the try cause it throws an error if the method does not get implemented
      response = await this.createRealtimeConnection();
      responseCode = response.status;
      if (response.ok && response.body) {
        this.resetRetryCount();
        await this.resetRealtimeBackoff();
        const reader = response.body.getReader();
        this.reader = reader;
        // Start listening for realtime notifications.
        await this.listenForNotifications(reader);
      }
    } catch (error) {
      if (this.isInBackground) {
        // It's possible the app was backgrounded while the connection was open, which
        // threw an exception trying to read the response. No real error here, so treat
        // this as a success, even if we haven't read a 200 response code yet.
        this.resetRetryCount();
      } else {
        //there might have been a transient error so the client will retry the connection.
        this.logger.debug(
          'Exception connecting to real-time RC backend. Retrying the connection...:',
          error
        );
      }
    } finally {
      // Close HTTP connection and associated streams.
      await this.closeRealtimeHttpConnection();
      this.setIsHttpConnectionRunning(false);

      // Update backoff metadata if the connection failed in the foreground.
      const connectionFailed =
        !this.isInBackground &&
        (responseCode == null || this.isStatusCodeRetryable(responseCode));

      if (connectionFailed) {
        await this.updateBackoffMetadataWithLastFailedStreamConnectionTime(
          new Date()
        );
      }
      // If responseCode is null then no connection was made to server and the SDK should still retry.
      if (connectionFailed || response?.ok) {
        await this.retryHttpConnectionWhenBackoffEnds();
      } else {
        const errorMessage = `Unable to connect to the server. HTTP status code: ${responseCode}`;
        const firebaseError = ERROR_FACTORY.create(
          ErrorCode.CONFIG_UPDATE_STREAM_ERROR,
          {
            httpStatus: responseCode,
            originalErrorMessage: errorMessage
          }
        );
        this.propagateError(firebaseError);
      }
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
    const inForeground = !this.isInBackground;
    return (
      hasActiveListeners &&
      isNotDisabled &&
      isNoConnectionActive &&
      inForeground
    );
  }

  private async makeRealtimeHttpConnection(delayMillis: number): Promise<void> {
    if (!this.canEstablishStreamConnection()) {
      return;
    }
    if (this.httpRetriesRemaining > 0) {
      this.httpRetriesRemaining--;
      await new Promise(resolve => setTimeout(resolve, delayMillis));
      await this.beginRealtimeHttpStream();
    } else if (!this.isInBackground) {
      const error = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, {
        originalErrorMessage:
          'Unable to connect to the server. Check your connection and try again.'
      });
      this.propagateError(error);
    }
  }

  private async beginRealtime(): Promise<void> {
    if (this.observers.size > 0) {
      await this.makeRealtimeHttpConnection(0);
    }
  }

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
  }

  /**
   * Handles changes to the application's visibility state, managing the real-time connection.
   *
   * When the application is moved to the background, this method closes the existing
   * real-time connection to save resources. When the application returns to the
   * foreground, it attempts to re-establish the connection.
   */
  private async onVisibilityChange(visible: unknown): Promise<void> {
    this.isInBackground = !visible;
    if (!visible) {
      await this.closeRealtimeHttpConnection();
    } else if (visible) {
      await this.beginRealtime();
    }
  }
}
