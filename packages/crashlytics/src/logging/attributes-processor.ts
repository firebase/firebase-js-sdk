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

import { LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { AttributeValue, Context } from '@opentelemetry/api';
import { LogRecord } from '@opentelemetry/api-logs';
import { AttributesStore, ATTR_KEY_INSTALLATION_ID } from '../attributes-store';

/**
 * An OpenTelemetry LogRecordProcessor that enriches log records with dynamic Firebase attributes
 * (such as Installation ID, active session ID, trace context, and custom attributes) upon emission.
 *
 * @internal
 */
export class FirebaseAttributesProcessor implements LogRecordProcessor {
  constructor(private attributesStore: AttributesStore) {}

  onEmit(logRecord: LogRecord, _context?: Context): void {
    const dynamicAttributes = this.attributesStore.getLogAttributes();

    if (logRecord.attributes) {
      for (const [key, value] of Object.entries(dynamicAttributes)) {
        if (value !== undefined && logRecord.attributes[key] === undefined) {
          logRecord.attributes[key] = value as AttributeValue;
        }
      }

      const cachedIid = this.attributesStore.getCachedInstallationId();
      if (
        cachedIid &&
        logRecord.attributes[ATTR_KEY_INSTALLATION_ID] === undefined
      ) {
        logRecord.attributes[ATTR_KEY_INSTALLATION_ID] = cachedIid;
      }
    }
  }

  async forceFlush(): Promise<void> {}
  async shutdown(): Promise<void> {}
}
