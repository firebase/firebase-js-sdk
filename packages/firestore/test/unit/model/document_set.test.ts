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

import { expect } from 'chai';

import { Document } from '../../../src/model/document';
import { DocumentSet } from '../../../src/model/document_set';
import {
  doc,
  DocComparator,
  documentSet,
  expectEqual,
  expectNotEqual
} from '../../util/helpers';

const d1 = doc('docs/1', 1, { sort: 2 });
const d2 = doc('docs/2', 1, { sort: 3 });
const d3 = doc('docs/3', 1, { sort: 1 });

describe('DocumentSet', () => {
  it('keeps documents in the right order', () => {
    const comp = DocComparator.byField('sort');
    const set = documentSet(comp, d1, d2, d3);

    expect(set.size).to.equal(3);

    expect(set.has(d1.key)).to.equal(true);
    expect(set.has(d2.key)).to.equal(true);
    expect(set.has(d3.key)).to.equal(true);

    expect(set.get(d1.key)).to.equal(d1);
    expect(set.get(d2.key)).to.equal(d2);
    expect(set.get(d3.key)).to.equal(d3);

    expect(set.first()).to.deep.equal(d3);
    expect(set.last()).to.deep.equal(d2);

    const results: Document[] = [];
    set.forEach((d: Document) => results.push(d));
    expect(results).to.deep.equal([d3, d1, d2]);
  });

  it('adds and deletes elements', () => {
    const set = new DocumentSet() // Compares by key by default
      .add(d1)
      .add(d2)
      .add(d3)
      .delete(d1.key)
      .delete(d3.key);
    expect(set.size).to.equal(1);
    expect(set.first()).to.equal(d2);
    expect(set.last()).to.equal(d2);
  });

  it('updates documents', () => {
    const comp = DocComparator.byField('sort');
    let set = new DocumentSet(comp)
      .add(d1)
      .add(d2)
      .add(d3);
    expect(set.size).to.equal(3);

    const d2prime = doc('docs/2', 2, { sort: 9 });
    set = set.add(d2prime);
    expect(set.size).to.equal(3);
    expect(set.get(d2prime.key)).to.deep.equal(d2prime);
  });

  it('adds docs equal to comparator with different keys', () => {
    const comp = DocComparator.byField('sort');
    const doc1 = doc('docs/1', 1, { sort: 1 });
    const doc2 = doc('docs/2', 1, { sort: 1 });

    const set = documentSet(comp, doc1, doc2);
    expect(set.has(doc1.key)).to.equal(true);
    expect(set.has(doc2.key)).to.equal(true);
  });

  it('equals to other document set with the same elements and order', () => {
    const comp = DocComparator.byField('sort');

    expectEqual(documentSet(d1, d2, d3), documentSet(d1, d2, d3));
    expectEqual(documentSet(comp, d1, d2, d3), documentSet(comp, d1, d2, d3));

    expect(documentSet(d1, d2, d3).isEqual(null)).to.equal(false);
    expectNotEqual(documentSet(d1, d2, d3), documentSet(d1, d2));
    expectNotEqual(documentSet(d1, d2, d3), documentSet(comp, d1, d2, d3));
  });
});
