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

import { GeoPoint } from '../../../src/api/geo_point';
import {
  expectCorrectComparisons,
  expectEqual,
  expectNotEqual
} from '../../util/helpers';

describe('GeoPoint', () => {
  function expectGeoPointEquals(
    geoPoint: GeoPoint,
    value: [number, number]
  ): void {
    expect(geoPoint.latitude).toBe(value[0]);
    expect(geoPoint.longitude).toBe(value[1]);
    expect(geoPoint.isEqual(new GeoPoint(value[0], value[1]))).toBe(true);
  }

  it('constructs values', () => {
    expectGeoPointEquals(new GeoPoint(0, 0), [0, 0]);
    expectGeoPointEquals(new GeoPoint(0, 180), [0, 180]);
    expectGeoPointEquals(new GeoPoint(0, -180), [0, -180]);
    expectGeoPointEquals(new GeoPoint(-90, 0), [-90, 0]);
    expectGeoPointEquals(new GeoPoint(0, 0), [0, 0]);
    expectGeoPointEquals(new GeoPoint(90, 0), [90, 0]);
  });

  it('GeoPoints throw on invalid values', () => {
    const invalidLats: Array<[number, number]> = [
      [-91, 0],
      [91, 0],
      [Number.NaN, 0],
      [Number.NEGATIVE_INFINITY, 0],
      [Number.POSITIVE_INFINITY, 0]
    ];
    for (const latLong of invalidLats) {
      const reason =
        'Latitude must be a number between -90 and 90, but was: ' + latLong[0];
      expect(() => new GeoPoint(latLong[0], latLong[1])).toThrow(reason);
    }

    const invalidLongs: Array<[number, number]> = [
      [0, -181],
      [0, 181],
      [0, Number.NaN],
      [0, Number.NEGATIVE_INFINITY],
      [0, Number.POSITIVE_INFINITY]
    ];
    for (const latLong of invalidLongs) {
      const reason =
        'Longitude must be a number between -180 and 180, but was: ' +
        latLong[1];
      expect(() => new GeoPoint(latLong[0], latLong[1])).toThrow(reason);
    }
  });

  it('compares correctly', () => {
    const values = [
      new GeoPoint(-90, -90),
      new GeoPoint(-90, -89),
      new GeoPoint(-89, -90),
      new GeoPoint(-89, 0),
      new GeoPoint(0, -90),
      new GeoPoint(0, -89),
      new GeoPoint(0, 0),
      new GeoPoint(0, 89),
      new GeoPoint(0, 90),
      new GeoPoint(89, -90),
      new GeoPoint(89, 0),
      new GeoPoint(89, 90),
      new GeoPoint(90, 89),
      new GeoPoint(90, 90)
    ];

    expectCorrectComparisons(values, (left: GeoPoint, right: GeoPoint) => {
      return left._compareTo(right);
    });
  });

  it('support equality checking with isEqual()', () => {
    expectEqual(new GeoPoint(1, 2), new GeoPoint(1, 2));
    expectNotEqual(new GeoPoint(1, 2), new GeoPoint(2, 2));
    expectNotEqual(new GeoPoint(1, 2), new GeoPoint(1, 1));
    expectNotEqual(new GeoPoint(1, 2), new GeoPoint(2, 1));
  });

  it('serializes to JSON', () => {
    expect(new GeoPoint(1, 2).toJSON()).toEqual({
      latitude: 1,
      longitude: 2,
      'type': GeoPoint._jsonSchemaVersion
    });
    expect(new GeoPoint(0, 0).toJSON()).toEqual({
      latitude: 0,
      longitude: 0,
      'type': GeoPoint._jsonSchemaVersion
    });
    expect(new GeoPoint(90, 180).toJSON()).toEqual({
      latitude: 90,
      longitude: 180,
      'type': GeoPoint._jsonSchemaVersion
    });
  });
  it('fromJSON does not throw', () => {
    const geoPoint = new GeoPoint(1, 2);
    expect(() => {
      GeoPoint.fromJSON(geoPoint.toJSON());
    }).to.not.throw;
  });

  it('fromJSON reconstructs seconds and nanoseconds', () => {
    const geoPoint = new GeoPoint(1, 2);
    const deserializedGeoPoint = GeoPoint.fromJSON(geoPoint.toJSON());
    expect(deserializedGeoPoint).toBeDefined();
    expect(geoPoint.latitude).toBe(deserializedGeoPoint.latitude);
    expect(geoPoint.longitude).toBe(deserializedGeoPoint.longitude);
  });

  it('toJSON -> fromJSON timestamp comparison', () => {
    const geoPoint = new GeoPoint(1, 2);
    const deserializedGeoPoint = GeoPoint.fromJSON(geoPoint.toJSON());
    expect(deserializedGeoPoint.isEqual(geoPoint)).toBe(true);
  });

  it('fromJSON parameter order does not matter', () => {
    const type = 'firestore/geopoint/1.0';
    const latitude = 90;
    const longitude = 180;
    const control = new GeoPoint(90, 180);
    expect(() => {
      expect(
        GeoPoint.fromJSON({ latitude, longitude, type }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
    expect(() => {
      expect(
        GeoPoint.fromJSON({ longitude, type, latitude }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
    expect(() => {
      expect(
        GeoPoint.fromJSON({ type, latitude, longitude }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
    expect(() => {
      expect(
        GeoPoint.fromJSON({ latitude, type, longitude }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
  });

  it('fromJSON missing fields throws', () => {
    const type = 'firestore/geopoint/1.0';
    const latitude = 90;
    const longitude = 180;

    expect(() => {
      GeoPoint.fromJSON({ type, latitude });
    }).to.throw;
    expect(() => {
      GeoPoint.fromJSON({ type, longitude });
    }).to.throw;
    expect(() => {
      GeoPoint.fromJSON({ latitude, longitude });
    }).to.throw;
  });

  it('fromJSON field errant field type throws', () => {
    const type = 'firestore/geopoint/1.0';
    const latitude = 90;
    const longitude = 180;

    expect(() => {
      GeoPoint.fromJSON({ type, latitude, longitude: 'wrong' });
    }).to.throw;
    expect(() => {
      GeoPoint.fromJSON({ type, longitude, latitude: 'wrong' });
    }).to.throw;
    expect(() => {
      GeoPoint.fromJSON({ latitude, longitude, type: 1 });
    }).to.throw;
    expect(() => {
      GeoPoint.fromJSON({ latitude, longitude, type: 'firestore/wrong/1.0' });
    }).to.throw;
  });
});
