/**
 * @license
 * Copyright 2017 Google LLC
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

import { Code, FirestoreError } from '../util/error';
// API extractor fails importing 'property' unless we also explicitly import 'Property'.
// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports-ts
import { Property, property, validateJSON } from '../util/json_validation';
import { primitiveComparator } from '../util/misc';

/**
 * An immutable object representing a geographic location in Firestore. The
 * location is represented as latitude/longitude pair.
 *
 * Latitude values are in the range of [-90, 90].
 * Longitude values are in the range of [-180, 180].
 */
export class GeoPoint {
  // Prefix with underscore to signal this is a private variable in JS and
  // prevent it showing up for autocompletion when typing latitude or longitude.
  private _lat: number;
  private _long: number;

  /**
   * Creates a new immutable `GeoPoint` object with the provided latitude and
   * longitude values.
   * @param latitude - The latitude as number between -90 and 90.
   * @param longitude - The longitude as number between -180 and 180.
   */
  constructor(latitude: number, longitude: number) {
    if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Latitude must be a number between -90 and 90, but was: ' + latitude
      );
    }
    if (!isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Longitude must be a number between -180 and 180, but was: ' + longitude
      );
    }

    this._lat = latitude;
    this._long = longitude;
  }

  /**
   * The latitude of this `GeoPoint` instance.
   */
  get latitude(): number {
    return this._lat;
  }

  /**
   * The longitude of this `GeoPoint` instance.
   */
  get longitude(): number {
    return this._long;
  }

  /**
   * Returns true if this `GeoPoint` is equal to the provided one.
   *
   * @param other - The `GeoPoint` to compare against.
   * @returns true if this `GeoPoint` is equal to the provided one.
   */
  isEqual(other: GeoPoint): boolean {
    return this._lat === other._lat && this._long === other._long;
  }

  /**
   * Actually private to JS consumers of our API, so this function is prefixed
   * with an underscore.
   */
  _compareTo(other: GeoPoint): number {
    return (
      primitiveComparator(this._lat, other._lat) ||
      primitiveComparator(this._long, other._long)
    );
  }

  static _jsonSchemaVersion: string = 'firestore/geoPoint/1.0';
  static _jsonSchema = {
    type: property('string', GeoPoint._jsonSchemaVersion),
    latitude: property('number'),
    longitude: property('number')
  };

  /** Returns a JSON-serializable representation of this GeoPoint. */
  toJSON(): { latitude: number; longitude: number; type: string } {
    return {
      latitude: this._lat,
      longitude: this._long,
      type: GeoPoint._jsonSchemaVersion
    };
  }

  /** Builds a `Timestamp` instance from a JSON serialized version of `Bytes`. */
  static fromJSON(json: object): GeoPoint {
    if (validateJSON(json, GeoPoint._jsonSchema)) {
      return new GeoPoint(json.latitude, json.longitude);
    }
    throw new FirestoreError(
      Code.INTERNAL,
      'Unexpected error creating GeoPoint from JSON.'
    );
  }
}
