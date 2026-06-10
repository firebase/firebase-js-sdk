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

export type AttributeValue = string | number | boolean;
export type AttributeMap = Record<string, AttributeValue>;

/**
 * Attribute keys relevant for telemetry store.
 *
 * @internal
 */
export const TELEMETRY_ATTRIBUTE_KEYS = {
  APP_SCREEN_ID: 'app.screen.id',
  ROUTE_PATH: 'route_path'
};

export interface TelemetryAttributes {
  common: AttributeMap;
  trace: AttributeMap;
  log: AttributeMap;
}

/**
 * A central, unified store for dynamic telemetry metadata.
 * It manages attributes that are added to spans and logs under segmented buckets.
 *
 * @internal
 */
export class TelemetryMetadataStore {
  private _attributes: TelemetryAttributes = {
    common: {},
    trace: {},
    log: {}
  };

  /**
   * Merges the provided attributes into the common telemetry bucket.
   *
   * @param attributes - Key-value pairs of attributes to add/update.
   */
  updateCommonAttributes(attributes: AttributeMap): void {
    Object.assign(this._attributes.common, attributes);
  }

  /**
   * Merges the provided attributes into the trace-only telemetry bucket.
   *
   * @param attributes - Key-value pairs of attributes to add/update.
   */
  updateTraceAttributes(attributes: AttributeMap): void {
    Object.assign(this._attributes.trace, attributes);
  }

  /**
   * Merges the provided attributes into the log-only telemetry bucket.
   *
   * @param attributes - Key-value pairs of attributes to add/update.
   */
  updateLogAttributes(attributes: AttributeMap): void {
    Object.assign(this._attributes.log, attributes);
  }

  /**
   * Retrieves all attributes relevant to traces (Common + Trace-only).
   *
   * @returns A merged copy of trace-relevant attributes.
   */
  getTraceAttributes(): AttributeMap {
    return { ...this._attributes.common, ...this._attributes.trace };
  }

  /**
   * Retrieves all attributes relevant to logs (Common + Log-only).
   *
   * @returns A merged copy of log-relevant attributes.
   */
  getLogAttributes(): AttributeMap {
    return { ...this._attributes.common, ...this._attributes.log };
  }

  /**
   * Deletes the specified attributes from the common telemetry bucket.
   *
   * @param keys - The keys of attributes to delete.
   */
  deleteCommonAttributes(keys: string[]): void {
    for (const key of keys) {
      delete this._attributes.common[key];
    }
  }

  /**
   * Deletes the specified attributes from the trace-only telemetry bucket.
   *
   * @param keys - The keys of attributes to delete.
   */
  deleteTraceAttributes(keys: string[]): void {
    for (const key of keys) {
      delete this._attributes.trace[key];
    }
  }

  /**
   * Deletes the specified attributes from the log-only telemetry bucket.
   *
   * @param keys - The keys of attributes to delete.
   */
  deleteLogAttributes(keys: string[]): void {
    for (const key of keys) {
      delete this._attributes.log[key];
    }
  }

  /**
   * Clears all attributes in the store.
   */
  clear(): void {
    this._attributes = {
      common: {},
      trace: {},
      log: {}
    };
  }
}
