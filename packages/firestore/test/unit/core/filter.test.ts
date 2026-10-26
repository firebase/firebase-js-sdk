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

import {
  compositeFilterIsConjunction,
  compositeFilterIsDisjunction,
  compositeFilterIsFlat,
  compositeFilterIsFlatConjunction,
  FieldFilter,
  Operator
} from '../../../src/core/filter';
import { canonifyQuery } from '../../../src/core/query';
import { andFilter, filter, orFilter, query } from '../../util/helpers';

describe('FieldFilter', () => {
  it('exposes field filter members', () => {
    const f = filter('foo', '==', 'bar');

    expect(f.field.toString()).toBe('foo');
    expect(f.value.stringValue).toBe('bar');
    expect(f.op).toBe(Operator.EQUAL);
  });
});

describe('CompositeFilter', () => {
  let a: FieldFilter;
  let b: FieldFilter;
  let c: FieldFilter;
  let d: FieldFilter;

  function nameFilter(name: string): FieldFilter {
    return filter('name', '==', name);
  }

  beforeEach(async () => {
    a = nameFilter('A');
    b = nameFilter('B');
    c = nameFilter('C');
    d = nameFilter('D');
  });

  it('exposes composite filter members for AND filter', () => {
    const f = andFilter(a, b, c);

    expect(compositeFilterIsConjunction(f)).toBe(true);
    expect(f.getFilters()).toEqual([a, b, c]);
  });

  it('exposes composite filter members for OR filter', () => {
    const f = orFilter(a, b, c);

    expect(compositeFilterIsDisjunction(f)).toBe(true);
    expect(f.getFilters()).toEqual([a, b, c]);
  });

  it('has working composite filter nested checks', () => {
    const andFilter1 = andFilter(a, b, c);
    expect(compositeFilterIsFlat(andFilter1)).toBe(true);
    expect(compositeFilterIsConjunction(andFilter1)).toBe(true);
    expect(compositeFilterIsDisjunction(andFilter1)).toBe(false);
    expect(compositeFilterIsFlatConjunction(andFilter1)).toBe(true);

    const orFilter1 = orFilter(a, b, c);
    expect(compositeFilterIsConjunction(orFilter1)).toBe(false);
    expect(compositeFilterIsDisjunction(orFilter1)).toBe(true);
    expect(compositeFilterIsFlat(orFilter1)).toBe(true);
    expect(compositeFilterIsFlatConjunction(orFilter1)).toBe(false);

    const andFilter2 = andFilter(d, andFilter1);
    expect(compositeFilterIsConjunction(andFilter2)).toBe(true);
    expect(compositeFilterIsDisjunction(andFilter2)).toBe(false);
    expect(compositeFilterIsFlat(andFilter2)).toBe(false);
    expect(compositeFilterIsFlatConjunction(andFilter2)).toBe(false);

    const orFilter2 = orFilter(d, andFilter1);
    expect(compositeFilterIsConjunction(orFilter2)).toBe(false);
    expect(compositeFilterIsDisjunction(orFilter2)).toBe(true);
    expect(compositeFilterIsFlat(orFilter2)).toBe(false);
    expect(compositeFilterIsFlatConjunction(orFilter2)).toBe(false);
  });

  it('computes canonical id of flat conjunctions', () => {
    const query1 = query('col', a, b, c);
    const query2 = query('col', andFilter(a, b, c));
    expect(canonifyQuery(query1)).toBe(canonifyQuery(query2));
  });
});
