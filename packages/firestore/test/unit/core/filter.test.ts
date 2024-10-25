/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect } from 'chai';

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

    expect(f.field.toString()).to.equal('foo');
    expect(f.value.stringValue).to.equal('bar');
    expect(f.op).to.equal(Operator.EQUAL);
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

    expect(compositeFilterIsConjunction(f)).to.be.true;
    expect(f.getFilters()).to.deep.equal([a, b, c]);
  });

  it('exposes composite filter members for OR filter', () => {
    const f = orFilter(a, b, c);

    expect(compositeFilterIsDisjunction(f)).to.be.true;
    expect(f.getFilters()).to.deep.equal([a, b, c]);
  });

  it('has working composite filter nested checks', () => {
    const andFilter1 = andFilter(a, b, c);
    expect(compositeFilterIsFlat(andFilter1)).true;
    expect(compositeFilterIsConjunction(andFilter1)).true;
    expect(compositeFilterIsDisjunction(andFilter1)).false;
    expect(compositeFilterIsFlatConjunction(andFilter1)).true;

    const orFilter1 = orFilter(a, b, c);
    expect(compositeFilterIsConjunction(orFilter1)).false;
    expect(compositeFilterIsDisjunction(orFilter1)).true;
    expect(compositeFilterIsFlat(orFilter1)).true;
    expect(compositeFilterIsFlatConjunction(orFilter1)).false;

    const andFilter2 = andFilter(d, andFilter1);
    expect(compositeFilterIsConjunction(andFilter2)).true;
    expect(compositeFilterIsDisjunction(andFilter2)).false;
    expect(compositeFilterIsFlat(andFilter2)).false;
    expect(compositeFilterIsFlatConjunction(andFilter2)).false;

    const orFilter2 = orFilter(d, andFilter1);
    expect(compositeFilterIsConjunction(orFilter2)).false;
    expect(compositeFilterIsDisjunction(orFilter2)).true;
    expect(compositeFilterIsFlat(orFilter2)).false;
    expect(compositeFilterIsFlatConjunction(orFilter2)).false;
  });

  it('computes canonical id of flat conjunctions', () => {
    const query1 = query('col', a, b, c);
    const query2 = query('col', andFilter(a, b, c));
    expect(canonifyQuery(query1)).to.equal(canonifyQuery(query2));
  });
});
