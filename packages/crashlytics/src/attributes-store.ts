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

export const ATTR_KEY_INSTALLATION_ID = 'app.installation.id';
export const ATTR_KEY_ROUTE_PATH = 'route_path';
export const SESSION_STORAGE_SESSION_ID_KEY = 'firebasecrashlytics.sessionid';

export const COMMON_ATTR_KEY = {
  APP_VERSION: 'app.build_id',
  SESSION_ID: 'session.id'
};

type Attribute = Record<string, AttributeValue>;
type CommonAttributeKey =
  (typeof COMMON_ATTR_KEY)[keyof typeof COMMON_ATTR_KEY];
type CommonAttribute = Record<CommonAttributeKey, AttributeValue>;

/**
 * A store for Crashlytics specific attributes for telemetry data.
 */
export class AttributesStore {
  private commonAttributes: Partial<CommonAttribute> = {};
  private _routePathProvider?: () => string;
  private installations: _FirebaseInstallationsInternal | null;
  private _projectId: string | undefined;
  private _iid: string | undefined;

  constructor(
    firebaseOptions: FirebaseOptions,
    crashlyticsOptions?: CrashlyticsOptions,
    installationsProvider?: Provider<'installations-internal'>
  ) {
    this._projectId = firebaseOptions.projectId;
    this.updateAppVersion(crashlyticsOptions);

    // Get session id from storage, if available
    const existingSessionId = this.getSessionIdFromStorage();
    if (existingSessionId) {
      this.commonAttributes[COMMON_ATTR_KEY.SESSION_ID] = existingSessionId;
    }

    // Installations provider
    this.installations =
      installationsProvider?.getImmediate({
        optional: true
      }) ?? null;
    if (!this.installations) {
      void installationsProvider
        ?.get()
        .then(installations => (this.installations = installations))
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
    this.commonAttributes[COMMON_ATTR_KEY.APP_VERSION] = appVersion;
  }

  /**
   * Get the active session id.
   */
  get sessionId(): string | undefined {
    return this.commonAttributes[COMMON_ATTR_KEY.SESSION_ID] as
      | string
      | undefined;
  }

  /**
   * Set and persist the session id.
   */
  setSessionId(id: string): void {
    this.commonAttributes[COMMON_ATTR_KEY.SESSION_ID] = id;
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
   * Get the log attributes, including the trace context.
   * @returns The log attributes.
   */
  getLogAttributes(): AnyValueMap {
    // Trace context is dynamic, so we retrieve it at the time of logging
    const traceContextAttributes: Attributes = {};
    const activeSpanContext = trace.getActiveSpan()?.spanContext();
    if (activeSpanContext?.traceId && activeSpanContext?.spanId) {
      traceContextAttributes[
        'logging.googleapis.com/trace'
      ] = `projects/${this._projectId}/traces/${activeSpanContext.traceId}`;
      traceContextAttributes['logging.googleapis.com/spanId'] =
        activeSpanContext.spanId;
    }

    return {
      ...this.commonAttributes,
      ...this.getRoutePathAttribute(),
      ...traceContextAttributes
    } as AnyValueMap;
  }

  /**
   * Returns an attribute object with installation id.
   *
   * @returns an attribute object with installation id, or null if installation id is not available
   */
  async getInstallationIdAttribute(): Promise<Attribute | null> {
    if (!this.installations) {
      return null;
    }
    if (this._iid) {
      return {
        [ATTR_KEY_INSTALLATION_ID]: this._iid
      };
    }

    const iid = await this.installations.getId();
    if (!iid) {
      return null;
    }

    this._iid = iid;
    return {
      [ATTR_KEY_INSTALLATION_ID]: iid
    };
  }

  private getRoutePathAttribute(): Attribute {
    const path = this._routePathProvider?.();
    if (!path) {
      return {};
    }

    return { [ATTR_KEY_ROUTE_PATH]: path };
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
