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
  CompositeFilter,
  FieldFilter,
  Filter,
  filterEquals
} from '../../../src/core/filter';
import {
  applyAssociation,
  applyDistribution,
  computeDistributedNormalForm,
  computeInExpansion,
  getDnfTerms
} from '../../../src/util/logic_utils';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { filter, andFilter, orFilter } from '../../util/helpers';

describe('LogicUtils', () => {
  addEqualityMatcher({ equalsFn: filterEquals, forType: Filter });

  function nameFilter(name: string): FieldFilter {
    return filter('name', '==', name);
  }

  let A: FieldFilter;
  let B: FieldFilter;
  let C: FieldFilter;
  let D: FieldFilter;
  let E: FieldFilter;
  let F: FieldFilter;
  let G: FieldFilter;
  let H: FieldFilter;
  let I: FieldFilter;

  beforeEach(() => {
    A = nameFilter('A');
    B = nameFilter('B');
    C = nameFilter('C');
    D = nameFilter('D');
    E = nameFilter('E');
    F = nameFilter('F');
    G = nameFilter('G');
    H = nameFilter('H');
    I = nameFilter('I');
  });

  it('implements field filter associativity', () => {
    const f = filter('foo', '==', 'bar');
    expect(f).to.equal(applyAssociation(f));
  });

  it('implements composite filter associativity', () => {
    // AND(AND(X)) --> X
    const compositeFilter1 = andFilter(andFilter(A));
    const actualResult1 = applyAssociation(compositeFilter1);
    expect(filterEquals(A, actualResult1)).to.be.true;

    // OR(OR(X)) --> X
    const compositeFilter2 = orFilter(orFilter(A));
    const actualResult2 = applyAssociation(compositeFilter2);
    expect(filterEquals(A, actualResult2)).to.be.true;

    // (A | (B) | ((C) | (D | E)) | (F | (G & (H & I))) --> A | B | C | D | E | F | (G & H & I)
    const complexFilter = orFilter(
      A,
      andFilter(B),
      orFilter(orFilter(C), orFilter(D, E)),
      orFilter(F, andFilter(G, andFilter(H, I)))
    );
    const expectedResult = orFilter(A, B, C, D, E, F, andFilter(G, H, I));
    const actualResult3 = applyAssociation(complexFilter);
    expect(filterEquals(expectedResult, actualResult3)).to.be.true;
  });

  it('implements field filter distribution over field filter', () => {
    expect(filterEquals(applyDistribution(A, B), andFilter(A, B))).to.be.true;
    expect(filterEquals(applyDistribution(B, A), andFilter(B, A))).to.be.true;
  });

  it('implements field filter distribution over and filter', () => {
    expect(
      filterEquals(
        applyDistribution(andFilter(A, B, C), D),
        andFilter(A, B, C, D)
      )
    ).to.be.true;
  });

  it('implements field filter distribution over or filter', () => {
    // A & (B | C | D) = (A & B) | (A & C) | (A & D)
    // (B | C | D) & A = (A & B) | (A & C) | (A & D)
    const expected = orFilter(
      andFilter(A, B),
      andFilter(A, C),
      andFilter(A, D)
    );
    expect(filterEquals(applyDistribution(A, orFilter(B, C, D)), expected)).to
      .be.true;
    expect(filterEquals(applyDistribution(orFilter(B, C, D), A), expected)).to
      .be.true;
  });

  it('implements in expansion for field filters', () => {
    const input1: FieldFilter = filter('a', 'in', [1, 2, 3]);
    const input2: FieldFilter = filter('a', '<', 1);
    const input3: FieldFilter = filter('a', '<=', 1);
    const input4: FieldFilter = filter('a', '==', 1);
    const input5: FieldFilter = filter('a', '!=', 1);
    const input6: FieldFilter = filter('a', '>', 1);
    const input7: FieldFilter = filter('a', '>=', 1);
    const input8: FieldFilter = filter('a', 'array-contains', 1);
    const input9: FieldFilter = filter('a', 'array-contains-any', [1, 2]);
    const input10: FieldFilter = filter('a', 'not-in', [1, 2]);

    expect(computeInExpansion(input1)).to.deep.equal(
      orFilter(filter('a', '==', 1), filter('a', '==', 2), filter('a', '==', 3))
    );

    // Other operators should remain the same
    expect(computeInExpansion(input2)).to.deep.equal(input2);
    expect(computeInExpansion(input3)).to.deep.equal(input3);
    expect(computeInExpansion(input4)).to.deep.equal(input4);
    expect(computeInExpansion(input5)).to.deep.equal(input5);
    expect(computeInExpansion(input6)).to.deep.equal(input6);
    expect(computeInExpansion(input7)).to.deep.equal(input7);
    expect(computeInExpansion(input8)).to.deep.equal(input8);
    expect(computeInExpansion(input9)).to.deep.equal(input9);
    expect(computeInExpansion(input10)).to.deep.equal(input10);
  });

  it('implements in expansion for composite filters', () => {
    const cf1: CompositeFilter = andFilter(
      filter('a', '==', 1),
      filter('b', 'in', [2, 3, 4])
    );

    expect(computeInExpansion(cf1)).to.deep.equal(
      andFilter(
        filter('a', '==', 1),
        orFilter(
          filter('b', '==', 2),
          filter('b', '==', 3),
          filter('b', '==', 4)
        )
      )
    );

    const cf2: CompositeFilter = orFilter(
      filter('a', '==', 1),
      filter('b', 'in', [2, 3, 4])
    );

    expect(computeInExpansion(cf2)).to.deep.equal(
      orFilter(
        filter('a', '==', 1),
        orFilter(
          filter('b', '==', 2),
          filter('b', '==', 3),
          filter('b', '==', 4)
        )
      )
    );

    const cf3: CompositeFilter = andFilter(
      filter('a', '==', 1),
      orFilter(filter('b', '==', 2), filter('c', 'in', [2, 3, 4]))
    );

    expect(computeInExpansion(cf3)).to.deep.equal(
      andFilter(
        filter('a', '==', 1),
        orFilter(
          filter('b', '==', 2),
          orFilter(
            filter('c', '==', 2),
            filter('c', '==', 3),
            filter('c', '==', 4)
          )
        )
      )
    );

    const cf4: CompositeFilter = orFilter(
      filter('a', '==', 1),
      andFilter(filter('b', '==', 2), filter('c', 'in', [2, 3, 4]))
    );

    expect(computeInExpansion(cf4)).to.deep.equal(
      orFilter(
        filter('a', '==', 1),
        andFilter(
          filter('b', '==', 2),
          orFilter(
            filter('c', '==', 2),
            filter('c', '==', 3),
            filter('c', '==', 4)
          )
        )
      )
    );
  });

  it('implements field filter distribution over or filter', () => {
    // A & (B | C | D) = (A & B) | (A & C) | (A & D)
    // (B | C | D) & A = (A & B) | (A & C) | (A & D)
    const expected = orFilter(
      andFilter(A, B),
      andFilter(A, C),
      andFilter(A, D)
    );
    expect(filterEquals(applyDistribution(A, orFilter(B, C, D)), expected)).to
      .be.true;
    expect(filterEquals(applyDistribution(orFilter(B, C, D), A), expected)).to
      .be.true;
  });

  // The following four tests cover:
  // AND distribution for AND filter and AND filter.
  // AND distribution for OR filter and AND filter.
  // AND distribution for AND filter and OR filter.
  // AND distribution for OR filter and OR filter.

  it('implements and filter distribution with and filter', () => {
    // (A & B) & (C & D) --> (A & B & C & D)
    const expectedResult = andFilter(A, B, C, D);
    expect(
      filterEquals(
        applyDistribution(andFilter(A, B), andFilter(C, D)),
        expectedResult
      )
    ).to.be.true;
  });

  it('implements and filter distribution with or filter', () => {
    // (A & B) & (C | D) --> (A & B & C) | (A & B & D)
    const expectedResult = orFilter(andFilter(A, B, C), andFilter(A, B, D));
    expect(
      filterEquals(
        applyDistribution(andFilter(A, B), orFilter(C, D)),
        expectedResult
      )
    ).to.be.true;
  });

  it('implements or filter distribution with and filter', () => {
    // (A | B) & (C & D) --> (A & C & D) | (B & C & D)
    const expectedResult = orFilter(andFilter(C, D, A), andFilter(C, D, B));
    expect(
      filterEquals(
        applyDistribution(orFilter(A, B), andFilter(C, D)),
        expectedResult
      )
    ).to.be.true;
  });

  it('implements or filter distribution with or filter', () => {
    // (A | B) & (C | D) --> (A & C) | (A & D) | (B & C) | (B & D)
    const expectedResult = orFilter(
      andFilter(A, C),
      andFilter(A, D),
      andFilter(B, C),
      andFilter(B, D)
    );
    expect(
      filterEquals(
        applyDistribution(orFilter(A, B), orFilter(C, D)),
        expectedResult
      )
    ).to.be.true;
  });

  it('implements field filter compute DNF', () => {
    expect(computeDistributedNormalForm(A)).to.deep.equal(A);
    expect(getDnfTerms(andFilter(A))).to.deep.equal([A]);
    expect(getDnfTerms(orFilter(A))).to.deep.equal([A]);
  });

  it('implements compute dnf flat AND filter', () => {
    const compositeFilter = andFilter(A, B, C);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      compositeFilter
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal([compositeFilter]);
  });

  it('implements compute dnf flat OR filter', () => {
    const compositeFilter = orFilter(A, B, C);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      compositeFilter
    );
    const expectedDnfTerms = [A, B, C];
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF1', () => {
    // A & (B | C) --> (A & B) | (A & C)
    const compositeFilter = andFilter(A, orFilter(B, C));
    const expectedDnfTerms = [andFilter(A, B), andFilter(A, C)];
    const expectedResult = orFilter(...expectedDnfTerms);
    const actualResult = computeDistributedNormalForm(compositeFilter);
    expect(actualResult).to.deep.equal(expectedResult);
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF2', () => {
    // ((A)) & (B & C) --> A & B & C
    const compositeFilter = andFilter(andFilter(andFilter(A)), andFilter(B, C));
    const expectedResult = andFilter(A, B, C);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      expectedResult
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal([expectedResult]);
  });

  it('compute DNF3', () => {
    // A | (B & C)
    const compositeFilter = orFilter(A, andFilter(B, C));
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      compositeFilter
    );
    const expectedDnfTerms = [A, andFilter(B, C)];
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF4', () => {
    // A | (B & C) | ( ((D)) | (E | F) | (G & H) ) --> A | (B & C) | D | E | F | (G & H)
    const compositeFilter = orFilter(
      A,
      andFilter(B, C),
      orFilter(andFilter(orFilter(D)), orFilter(E, F), andFilter(G, H))
    );
    const expectedDnfTerms = [A, andFilter(B, C), D, E, F, andFilter(G, H)];
    const expectedResult = orFilter(...expectedDnfTerms);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      expectedResult
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF5', () => {
    //    A & (B | C) & ( ((D)) & (E | F) & (G & H) )
    // -> A & (B | C) & D & (E | F) & G & H
    // -> ((A & B) | (A & C)) & D & (E | F) & G & H
    // -> ((A & B & D) | (A & C & D)) & (E|F) & G & H
    // -> ((A & B & D & E) | (A & B & D & F) | (A & C & D & E) | (A & C & D & F)) & G & H
    // -> ((A&B&D&E&G) | (A & B & D & F & G) | (A & C & D & E & G) | (A & C & D & F & G)) & H
    // -> (A&B&D&E&G&H) | (A&B&D&F&G&H) | (A & C & D & E & G & H) | (A & C & D & F & G & H)
    const compositeFilter = andFilter(
      A,
      orFilter(B, C),
      andFilter(andFilter(orFilter(D)), orFilter(E, F), andFilter(G, H))
    );
    const expectedDnfTerms = [
      andFilter(D, E, G, H, A, B),
      andFilter(D, F, G, H, A, B),
      andFilter(D, E, G, H, A, C),
      andFilter(D, F, G, H, A, C)
    ];
    const expectedResult = orFilter(...expectedDnfTerms);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      expectedResult
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF6', () => {
    // A & (B | (C & (D | (E & F))))
    // -> A & (B | (C & D) | (C & E & F))
    // -> (A & B) | (A & C & D) | (A & C & E & F)
    const compositeFilter = andFilter(
      A,
      orFilter(B, andFilter(C, orFilter(D, andFilter(E, F))))
    );
    const expectedDnfTerms = [
      andFilter(A, B),
      andFilter(C, D, A),
      andFilter(E, F, C, A)
    ];
    const expectedResult = orFilter(...expectedDnfTerms);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      expectedResult
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF7', () => {
    // ( (A|B) & (C|D) ) | ( (E|F) & (G|H) )
    // -> (A&C)|(A&D)|(B&C)(B&D)|(E&G)|(E&H)|(F&G)|(F&H)
    const compositeFilter = orFilter(
      andFilter(orFilter(A, B), orFilter(C, D)),
      andFilter(orFilter(E, F), orFilter(G, H))
    );
    const expectedDnfTerms = [
      andFilter(A, C),
      andFilter(A, D),
      andFilter(B, C),
      andFilter(B, D),
      andFilter(E, G),
      andFilter(E, H),
      andFilter(F, G),
      andFilter(F, H)
    ];
    const expectedResult = orFilter(...expectedDnfTerms);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      expectedResult
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });

  it('compute DNF8', () => {
    // ( (A&B) | (C&D) ) & ( (E&F) | (G&H) )
    // -> A&B&E&F | A&B&G&H | C&D&E&F | C&D&G&H
    const compositeFilter = andFilter(
      orFilter(andFilter(A, B), andFilter(C, D)),
      orFilter(andFilter(E, F), andFilter(G, H))
    );
    const expectedDnfTerms = [
      andFilter(E, F, A, B),
      andFilter(G, H, A, B),
      andFilter(E, F, C, D),
      andFilter(G, H, C, D)
    ];
    const expectedResult = orFilter(...expectedDnfTerms);
    expect(computeDistributedNormalForm(compositeFilter)).to.deep.equal(
      expectedResult
    );
    expect(getDnfTerms(compositeFilter)).to.deep.equal(expectedDnfTerms);
  });
});
