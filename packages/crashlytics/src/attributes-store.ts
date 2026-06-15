/**
 * @license
 * Copyright 2026 Google LLC
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

import { Provider } from '@firebase/component';
import { Attributes, AttributeValue, trace } from '@opentelemetry/api';
import { AnyValueMap } from '@opentelemetry/api-logs';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { CrashlyticsOptions } from './public-types';
import { AUTO_CONSTANTS } from './auto-constants';
import { FirebaseOptions } from '@firebase/app-types';
import { DEFAULT_TELEMETRY_REGION } from './constants';

export const ATTR_KEY_INSTALLATION_ID = 'app.installation.id';
export const SESSION_STORAGE_SESSION_ID_KEY = 'firebasecrashlytics.sessionid';

export const LOG_ATTR_KEY = {
  APP_VERSION: 'app.build_id',
  SESSION_ID: 'session.id',
  ROUTE_PATH: 'route_path',
  TRACE: 'logging.googleapis.com/trace',
  SPAN_ID: 'logging.googleapis.com/spanId'
};

export const SPAN_ATTR_KEY = {
  GCP_RESOURCE_NAME: 'gcp.resource.name',
  GCP_FIREBASE_SESSION_ID: 'gcp.firebase.session_id',
  GCP_FIREBASE_APP_VERSION: 'gcp.firebase.app_version',
  APP_SCREEN_ID: 'app.screen.id'
};

type Attribute = Record<string, AttributeValue>;

/**
 * A store for Crashlytics specific attributes for telemetry data.
 */
export class AttributesStore {
  private _projectId: string | undefined;
  private _appVersion: string | undefined;
  private _sessionId: string | undefined;
  private _installations: _FirebaseInstallationsInternal | null;
  private _iid: string | undefined;
  private _routePathProvider?: () => string;
  private _region: string;

  constructor(
    firebaseOptions: FirebaseOptions,
    crashlyticsOptions?: CrashlyticsOptions,
    installationsProvider?: Provider<'installations-internal'>
  ) {
    this._projectId = firebaseOptions.projectId;
    this._region = crashlyticsOptions?.region || DEFAULT_TELEMETRY_REGION;
    this.updateAppVersion(crashlyticsOptions);

    // Get session id from storage, if available
    const existingSessionId = this.getSessionIdFromStorage();
    if (existingSessionId) {
      this._sessionId = existingSessionId;
    }

    // Installations provider
    this._installations =
      installationsProvider?.getImmediate({
        optional: true
      }) ?? null;
    if (!this._installations) {
      void installationsProvider
        ?.get()
        .then(installations => (this._installations = installations))
        .catch(() => {});
    }
  }

  /**
   * Update the app version inside the store based on new Crashlytics options.
   */
  updateAppVersion(options?: CrashlyticsOptions): void {
    const appVersion = options?.appVersion
      ? options.appVersion
      : AUTO_CONSTANTS?.appVersion
      ? AUTO_CONSTANTS.appVersion
      : 'unset';
    this._appVersion = appVersion;
  }

  /**
   * Get the active session id.
   */
  get sessionId(): string | undefined {
    return this._sessionId;
  }

  /**
   * Set and persist the session id.
   */
  setSessionId(id: string): void {
    this._sessionId = id;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_STORAGE_SESSION_ID_KEY, id);
      } catch (e) {
        // Ignore errors accessing sessionStorage (e.g. security restrictions)
      }
    }
  }

  /**
   * Sets the route path provider, which is used to get the current route path.
   * @param provider The route path provider.
   */
  setRoutePathProvider(provider: (() => string) | undefined): void {
    this._routePathProvider = provider;
  }

  /**
   * Get the log attributes.
   * @returns The log attributes.
   */
  getLogAttributes(): AnyValueMap {
    const attributes: AnyValueMap = {};
    if (this._appVersion) {
      attributes[LOG_ATTR_KEY.APP_VERSION] = this._appVersion;
    }
    if (this._sessionId) {
      attributes[LOG_ATTR_KEY.SESSION_ID] = this._sessionId;
    }

    const activeSpanContext = trace.getActiveSpan()?.spanContext();
    if (
      activeSpanContext?.traceId &&
      activeSpanContext?.spanId &&
      this._projectId
    ) {
      attributes[
        LOG_ATTR_KEY.TRACE
      ] = `projects/${this._projectId}/traces/${activeSpanContext.traceId}`;
      attributes[LOG_ATTR_KEY.SPAN_ID] = activeSpanContext.spanId;
    }

    const path = this._routePathProvider?.();
    if (path) {
      attributes[LOG_ATTR_KEY.ROUTE_PATH] = path;
    }

    return attributes;
  }

  /**
   * Get the span attributes.
   * @returns The span attributes.
   */
  getSpanAttributes(): Attributes {
    const attributes: Attributes = {};
    if (this._projectId) {
      attributes[
        SPAN_ATTR_KEY.GCP_RESOURCE_NAME
      ] = `//firebasetelemetry.googleapis.com/projects/${this._projectId}/locations/${this._region}/`;
    }

    if (this._appVersion) {
      attributes[SPAN_ATTR_KEY.GCP_FIREBASE_APP_VERSION] = this._appVersion;
    }
    if (this._sessionId) {
      attributes[SPAN_ATTR_KEY.GCP_FIREBASE_SESSION_ID] = this._sessionId;
    }

    const path = this._routePathProvider?.();
    if (path) {
      attributes[SPAN_ATTR_KEY.APP_SCREEN_ID] = path;
    }

    return attributes;
  }

  /**
   * Returns an attribute object with installation id.
   *
   * @returns an attribute object with installation id, or null if installation id is not available
   */
  async getInstallationIdAttribute(): Promise<Attribute | null> {
    if (!this._installations) {
      return null;
    }
    if (this._iid) {
      return {
        [ATTR_KEY_INSTALLATION_ID]: this._iid
      };
    }

    const iid = await this._installations.getId();
    if (!iid) {
      return null;
    }

    this._iid = iid;
    return {
      [ATTR_KEY_INSTALLATION_ID]: iid
    };
  }

  private getSessionIdFromStorage(): string | undefined {
    if (typeof sessionStorage !== 'undefined') {
      try {
        return (
          sessionStorage.getItem(SESSION_STORAGE_SESSION_ID_KEY) || undefined
        );
      } catch (e) {
        // Ignore errors accessing sessionStorage (e.g. security restrictions)
      }
    }
  }
}
