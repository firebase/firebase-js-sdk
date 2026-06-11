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
import { AnyValueMap } from '@opentelemetry/api-logs';
import { trace } from '@opentelemetry/api';
import { Provider } from '@firebase/component';
import { CrashlyticsOptions } from './public-types';
import { getAppVersion } from './helpers';
import { DEFAULT_TELEMETRY_REGION } from './constants';
import { FirebaseOptions } from '@firebase/app-types';

export const ATTR = {
  COMMON: {
    APP_VERSION: 'app.build_id',
    SESSION_ID: 'session.id',
    APP_SCREEN_ID: 'app.screen.id',
  },
  SPAN: {
    GCP_RESOURCE_NAME: 'gcp.resource.name',
    GCP_FIREBASE_SESSION_ID: 'gcp.firebase.session_id',
    GCP_FIREBASE_APP_VERSION: 'gcp.firebase.app_version',
  }
} as const;

export type CommonAttributeKey = typeof ATTR.COMMON[keyof typeof ATTR.COMMON];
export type SpanAttributeKey = typeof ATTR.SPAN[keyof typeof ATTR.SPAN];

// TODO(rebeccahe): Should we use Attribute from the otel api lib?
export class AttributesStore {
  // Use Partial Records so keys are optional at runtime and more performant
  private commonAttributes: Partial<Record<CommonAttributeKey, string>> = {};
  private spanAttributes: Partial<Record<SpanAttributeKey, string>> = {};
  private iidPromise: Promise<string | null> | null = null;

  constructor(
    private firebaseOptions: FirebaseOptions,
    private crashlyticsOptions: CrashlyticsOptions,
    installationsProvider?: Provider<'installations-internal'>
  ) {
    const appVersion = getAppVersion(crashlyticsOptions);
    if (appVersion !== 'unset') {
      this.commonAttributes[ATTR.COMMON.APP_VERSION] = appVersion;
      this.spanAttributes[ATTR.SPAN.GCP_FIREBASE_APP_VERSION] = appVersion;
    }

    const region = this.crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
    this.spanAttributes[ATTR.SPAN.GCP_RESOURCE_NAME] =
      `//firebasetelemetry.googleapis.com/projects/${this.firebaseOptions.projectId}/locations/${region}/`;

    if (installationsProvider) {
      this.iidPromise = installationsProvider.get()
        .then(inst => inst.getId())
        .catch(() => null);
    }
  }

  setCommonAttribute(key: CommonAttributeKey, value: string): void {
    this.commonAttributes[key] = value;
  }

  setSpanAttribute(key: SpanAttributeKey, value: string): void {
    this.spanAttributes[key] = value;
  }

  getLogAttributes(): Record<string, string> {
    // Trace context is dynamic, so we retrieve it at the time of logging
    const traceContextAttributes: Record<string, string> = {};
    const activeSpanContext = trace.getActiveSpan()?.spanContext();
    if (activeSpanContext?.traceId && activeSpanContext?.spanId) {
      traceContextAttributes['logging.googleapis.com/trace'] = activeSpanContext.traceId;
      traceContextAttributes['logging.googleapis.com/spanId'] = activeSpanContext.spanId;
    }

    return {
      ...this.commonAttributes,
      ...traceContextAttributes,
    };
  }

  getLogAttributesAsMap(): AnyValueMap {
    return this.getLogAttributes() as AnyValueMap;
  }

  getSpanAttributes(): Record<string, string> {
    return {
      ...this.commonAttributes,
      ...this.spanAttributes,
    };
  }

  async getInstallationIdAttribute(): Promise<Record<string, string>> {
    if (this.iidPromise) {
      const iid = await this.iidPromise;
      if (iid) {
        return {
          ['app.installation.id']: iid
        };
      }
    }
    return {};
  }
}