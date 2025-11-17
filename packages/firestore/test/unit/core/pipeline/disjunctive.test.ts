/**
 * @license
 * Copyright 2025 Google LLC
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
  and as apiAnd,
  equal,
  Field,
  greaterThan,
  greaterThanOrEqual,
  like,
  lessThan,
  lessThanOrEqual,
  notEqual,
  notEqualAny,
  arrayContainsAny,
  add,
  constant,
  field,
  or as apiOr,
  not as apiNot,
  divide,
  BooleanExpression,
  exists,
  regexMatch,
  equalAny,
  xor as ApiXor,
  arrayContains,
  Expression,
  arrayContainsAll
} from '../../../../lite/pipelines/pipelines';
import { doc as docRef } from '../../../../src';
import { MutableDocument } from '../../../../src/model/document';
import { DOCUMENT_KEY_NAME, FieldPath } from '../../../../src/model/path';
import { newTestFirestore } from '../../../util/api_helpers';
import { doc } from '../../../util/helpers';
import {
  canonifyPipeline,
  constantArray,
  constantMap,
  pipelineEq,
  runPipeline
} from '../../../util/pipelines';
import { and, or, not, xor } from './util';

const db = newTestFirestore();

describe('Disjunctive Queries', () => {
  it('basicEqAny', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        equalAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('charlie'),
          constant('diane'),
          constant('eric')
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4, doc5]
    );
  });

  it('multipleEqAny', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane'),
            constant('eric')
          ]),
          equalAny(field('age'), [constant(10), constant(25)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc2, doc4, doc5]
    );
  });

  it('eqAny_multipleStages', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        equalAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('charlie'),
          constant('diane'),
          constant('eric')
        ])
      )
      .where(equalAny(field('age'), [constant(10), constant(25)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc2, doc4, doc5]
    );
  });

  it('multipleEqAnys_withOr', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equalAny(field('name'), [constant('alice'), constant('bob')]),
          equalAny(field('age'), [constant(10), constant(25)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc4, doc5]
    );
  });

  it('eqAny_onCollectionGroup', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('other_users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('root/child/users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('root/child/other_users/e', 1000, {
      name: 'eric',
      age: 10
    });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(
        equalAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('diane'),
          constant('eric')
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc4, doc1]
    );
  });

  it('eqAny_withSortOnDifferentField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        equalAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('diane'),
          constant('eric')
        ])
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.members([doc4, doc5, doc2, doc1]);
  });

  it('eqAny_withSortOnEqAnyField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        equalAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('diane'),
          constant('eric')
        ])
      )
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc1, doc2, doc4, doc5]);
  });

  it('eqAny_withAdditionalEquality_differentFields', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane'),
            constant('eric')
          ]),
          equal(field('age'), constant(10))
        )
      )
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('eqAny_withAdditionalEquality_sameField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('diane'),
            constant('eric')
          ]),
          equal(field('name'), constant('eric'))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc5]
    );
  });

  it('eqAny_withAdditionalEquality_sameField_emptyResult', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [constant('alice'), constant('bob')]),
          equal(field('name'), constant('other'))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('eqAny_withInequalities_exclusiveRange', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane')
          ]),
          greaterThan(field('age'), constant(10)),
          lessThan(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2]
    );
  });

  it('eqAny_withInequalities_inclusiveRange', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane')
          ]),
          greaterThanOrEqual(field('age'), constant(10)),
          lessThanOrEqual(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4]
    );
  });

  it('eqAny_withInequalitiesAndSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane')
          ]),
          greaterThan(field('age'), constant(10)),
          lessThan(field('age'), constant(100))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc2, doc1]);
  });

  it('eqAny_withNotEqual', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane')
          ]),
          notEqual(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc4]
    );
  });

  it('eqAny_sortOnEqAnyField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        equalAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('charlie'),
          constant('diane')
        ])
      )
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc1, doc2, doc3, doc4]);
  });

  it('eqAny_singleValue_sortOnInField_ambiguousOrder', () => {
    const doc1 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc2 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc3 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(equalAny(field('age'), [constant(10)]))
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc3
    ]);
  });

  it('eqAny_withExtraEquality_sortOnEqAnyField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane'),
            constant('eric')
          ]),
          equal(field('age'), constant(10))
        )
      )
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('eqAny_withExtraEquality_sortOnEquality', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane'),
            constant('eric')
          ]),
          equal(field('age'), constant(10))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('eqAny_withInequality_onSameField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('age'), [constant(10), constant(25), constant(100)]),
          greaterThan(field('age'), constant(20))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc2, doc3]
    );
  });

  it('eqAny_withDifferentInequality_sortOnEqAnyField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          equalAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('charlie'),
            constant('diane')
          ]),
          greaterThan(field('age'), constant(20))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc2, doc1, doc3]);
  });

  it('eqAny_containsNull', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: null, age: 25 });
    const doc3 = doc('users/c', 1000, { age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(equalAny(field('name'), [constant(null), constant('alice')]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('arrayContains_null', () => {
    const doc1 = doc('users/a', 1000, { field: [null, 42] });
    const doc2 = doc('users/b', 1000, { field: [101, null] });
    const doc3 = doc('users/b', 1000, { field: [null] });
    const doc4 = doc('users/c', 1000, { field: ['foo', 'bar'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        arrayContains(field('field'), constant(null)) as BooleanExpression
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([]);
  });

  it('arrayContainsAny_null', () => {
    const doc1 = doc('users/a', 1000, { field: [null, 42] });
    const doc2 = doc('users/b', 1000, { field: [101, null] });
    const doc3 = doc('users/c', 1000, { field: ['foo', 'bar'] });
    const doc4 = doc('users/c', 1000, { not_field: ['foo', 'bar'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        arrayContainsAny(field('field'), [constant(null), constant('foo')])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc3
    ]);
  });

  it('eqAny_containsNullOnly', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: null });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(equalAny(field('age'), [constant(null)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([]);
  });

  it('basicArrayContainsAny', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', groups: [1, 2, 3] });
    const doc2 = doc('users/b', 1000, { name: 'bob', groups: [1, 2, 4] });
    const doc3 = doc('users/c', 1000, { name: 'charlie', groups: [2, 3, 4] });
    const doc4 = doc('users/d', 1000, { name: 'diane', groups: [2, 3, 5] });
    const doc5 = doc('users/e', 1000, { name: 'eric', groups: [3, 4, 5] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(arrayContainsAny(field('groups'), [constant(1), constant(5)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc4, doc5]
    );
  });

  it('multipleArrayContainsAny', () => {
    const doc1 = doc('users/a', 1000, {
      name: 'alice',
      groups: [1, 2, 3],
      records: ['a', 'b', 'c']
    });
    const doc2 = doc('users/b', 1000, {
      name: 'bob',
      groups: [1, 2, 4],
      records: ['b', 'c', 'd']
    });
    const doc3 = doc('users/c', 1000, {
      name: 'charlie',
      groups: [2, 3, 4],
      records: ['b', 'c', 'e']
    });
    const doc4 = doc('users/d', 1000, {
      name: 'diane',
      groups: [2, 3, 5],
      records: ['c', 'd', 'e']
    });
    const doc5 = doc('users/e', 1000, {
      name: 'eric',
      groups: [3, 4, 5],
      records: ['c', 'd', 'f']
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          arrayContainsAny(field('groups'), [constant(1), constant(5)]),
          arrayContainsAny(field('records'), [constant('a'), constant('e')])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc4]
    );
  });

  it('arrayContainsAny_withInequality', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', groups: [1, 2, 3] });
    const doc2 = doc('users/b', 1000, { name: 'bob', groups: [1, 2, 4] });
    const doc3 = doc('users/c', 1000, { name: 'charlie', groups: [2, 3, 4] });
    const doc4 = doc('users/d', 1000, { name: 'diane', groups: [2, 3, 5] });
    const doc5 = doc('users/e', 1000, { name: 'eric', groups: [3, 4, 5] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          arrayContainsAny(field('groups'), [constant(1), constant(5)]),
          lessThan(field('groups'), constantArray(3, 4, 5))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc4]
    );
  });

  it('arrayContainsAny_withIn', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', groups: [1, 2, 3] });
    const doc2 = doc('users/b', 1000, { name: 'bob', groups: [1, 2, 4] });
    const doc3 = doc('users/c', 1000, { name: 'charlie', groups: [2, 3, 4] });
    const doc4 = doc('users/d', 1000, { name: 'diane', groups: [2, 3, 5] });
    const doc5 = doc('users/e', 1000, { name: 'eric', groups: [3, 4, 5] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          arrayContainsAny(field('groups'), [constant(1), constant(5)]),
          equalAny(field('name'), [constant('alice'), constant('bob')])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2]
    );
  });

  it('basicOr', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equal(field('name'), constant('bob')),
          equal(field('age'), constant(10))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2,
      doc4
    ]);
  });

  it('multipleOr', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiOr(
          equal(field('name'), constant('bob')),
          equal(field('name'), constant('diane')),
          equal(field('age'), constant(25)),
          equal(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2,
      doc3,
      doc4
    ]);
  });

  it('or_multipleStages', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equal(field('name'), constant('bob')),
          equal(field('age'), constant(10))
        )
      )
      .where(
        or(
          equal(field('name'), constant('diane')),
          equal(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc4
    ]);
  });

  it('or_twoConjunctions', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          and(
            equal(field('name'), constant('bob')),
            equal(field('age'), constant(25))
          ),
          and(
            equal(field('name'), constant('diane')),
            equal(field('age'), constant(10))
          )
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2,
      doc4
    ]);
  });

  it('or_withInAnd', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          or(
            equal(field('name'), constant('bob')),
            equal(field('age'), constant(10))
          ),
          lessThan(field('age'), constant(80))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2,
      doc4
    ]);
  });

  it('andOfTwoOrs', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          or(
            equal(field('name'), constant('bob')),
            equal(field('age'), constant(10))
          ),
          or(
            equal(field('name'), constant('diane')),
            equal(field('age'), constant(100))
          )
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc4
    ]);
  });

  it('orOfTwoOrs', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          or(
            equal(field('name'), constant('bob')),
            equal(field('age'), constant(10))
          ),
          or(
            equal(field('name'), constant('diane')),
            equal(field('age'), constant(100))
          )
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2,
      doc3,
      doc4
    ]);
  });

  it('or_withEmptyRangeInOneDisjunction', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equal(field('name'), constant('bob')),
          and(
            equal(field('age'), constant(10)),
            greaterThan(field('age'), constant(20))
          )
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2
    ]);
  });

  it('or_withSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equal(field('name'), constant('diane')),
          greaterThan(field('age'), constant(20))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc4, doc2, doc1, doc3]);
  });

  it('or_withInequalityAndSort_sameField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          lessThan(field('age'), constant(20)),
          greaterThan(field('age'), constant(50))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc4, doc1, doc3]);
  });

  it('or_withInequalityAndSort_differentFields', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          lessThan(field('age'), constant(20)),
          greaterThan(field('age'), constant(50))
        )
      )
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc1, doc3, doc4]);
  });

  it('or_withInequalityAndSort_multipleFields', () => {
    const doc1 = doc('users/a', 1000, {
      name: 'alice',
      age: 25,
      height: 170
    });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25, height: 180 });
    const doc3 = doc('users/c', 1000, {
      name: 'charlie',
      age: 100,
      height: 155
    });
    const doc4 = doc('users/d', 1000, {
      name: 'diane',
      age: 10,
      height: 150
    });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 25, height: 170 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          lessThan(field('age'), constant(80)),
          greaterThan(field('height'), constant(160))
        )
      )
      .sort(
        field('age').ascending(),
        field('height').descending(),
        field('name').ascending()
      );

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc2, doc1, doc5]);
  });

  it('or_withSortOnPartialMissingField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'diane' });
    const doc4 = doc('users/d', 1000, { name: 'diane', height: 150 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equal(field('name'), constant('diane')),
          greaterThan(field('age'), constant(20))
        )
      )
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.members([
      doc3,
      doc4,
      doc2,
      doc1
    ]);
  });

  it('or_withLimit', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          equal(field('name'), constant('diane')),
          greaterThan(field('age'), constant(20))
        )
      )
      .sort(field('age').ascending())
      .limit(2);

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc4, doc2]);
  });

  // TODO(pipeline): uncomment when we have isNot implemented
  it('or_isNullAndEqOnSameField', () => {
    const doc1 = doc('users/a', 1000, { a: 1 });
    const doc2 = doc('users/b', 1000, { a: 1.0 });
    const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
    const doc4 = doc('users/d', 1000, { a: null });
    const doc5 = doc('users/e', 1000, { a: NaN });
    const doc6 = doc('users/f', 1000, { b: 'abc' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(or(equal(field('a'), constant(1)), field('a').equal(null)));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
    ).to.deep.equal([doc1, doc2, doc3, doc4]);
  });

  it('or_isNullAndEqOnDifferentField', () => {
    const doc1 = doc('users/a', 1000, { a: 1 });
    const doc2 = doc('users/b', 1000, { a: 1.0 });
    const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
    const doc4 = doc('users/d', 1000, { a: null });
    const doc5 = doc('users/e', 1000, { a: NaN });
    const doc6 = doc('users/f', 1000, { b: 'abc' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(or(equal(field('b'), constant(1)), equal(field('a'), null)));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
    ).to.deep.equal([doc3, doc4]);
  });

  it('or_isNotNullAndEqOnSameField', () => {
    const doc1 = doc('users/a', 1000, { a: 1 });
    const doc2 = doc('users/b', 1000, { a: 1.0 });
    const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
    const doc4 = doc('users/d', 1000, { a: null });
    const doc5 = doc('users/e', 1000, { a: NaN });
    const doc6 = doc('users/f', 1000, { b: 'abc' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(greaterThan(field('a'), constant(1)), not(equal(field('a'), null)))
      );

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
    ).to.deep.equal([doc1, doc2, doc3, doc5]);
  });

  it('or_isNotNullAndEqOnDifferentField', () => {
    const doc1 = doc('users/a', 1000, { a: 1 });
    const doc2 = doc('users/b', 1000, { a: 1.0 });
    const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
    const doc4 = doc('users/d', 1000, { a: null });
    const doc5 = doc('users/e', 1000, { a: NaN });
    const doc6 = doc('users/f', 1000, { b: 'abc' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(or(equal(field('b'), constant(1)), not(equal(field('a'), null))));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
    ).to.deep.equal([doc1, doc2, doc3, doc5]);
  });

  it('or_isNullAndIsNaNOnSameField', () => {
    const doc1 = doc('users/a', 1000, { a: null });
    const doc2 = doc('users/b', 1000, { a: NaN });
    const doc3 = doc('users/c', 1000, { a: 'abc' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(or(equal(field('a'), null), equal(field('a'), NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc2
    ]);
  });

  it('or_isNullAndIsNaNOnDifferentField', () => {
    const doc1 = doc('users/a', 1000, { a: null });
    const doc2 = doc('users/b', 1000, { a: NaN });
    const doc3 = doc('users/c', 1000, { a: 'abc' });
    const doc4 = doc('users/d', 1000, { b: null });
    const doc5 = doc('users/e', 1000, { b: NaN });
    const doc6 = doc('users/f', 1000, { b: 'abc' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(or(equal(field('a'), null), equal(field('b'), NaN)));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
    ).to.deep.equal([doc1, doc5]);
  });

  it('basicNotEqAny', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(notEqualAny(field('name'), [constant('alice'), constant('bob')]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4, doc5]
    );
  });

  it('multipleNotEqAnys', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('bob')]),
          notEqualAny(field('age'), [constant(10), constant(25)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3]
    );
  });

  it('multipileNotEqAnys_withOr', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(
          notEqualAny(field('name'), [constant('alice'), constant('bob')]),
          notEqualAny(field('age'), [constant(10), constant(25)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc3, doc4, doc5]
    );
  });

  it('notEqAny_onCollectionGroup', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('other_users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('root/child/users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('root/child/other_users/e', 1000, {
      name: 'eric',
      age: 10
    });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(
        notEqualAny(field('name'), [
          constant('alice'),
          constant('bob'),
          constant('diane')
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3]
    );
  });

  it('notEqAny_withSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(notEqualAny(field('name'), [constant('alice'), constant('diane')]))
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc5, doc2, doc3]);
  });

  it('notEqAny_withAdditionalEquality_differentFields', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('bob')]),
          equal(field('age'), constant(10))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc4, doc5]
    );
  });

  it('notEqAny_withAdditionalEquality_sameField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('diane')]),
          equal(field('name'), constant('eric'))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc5]
    );
  });

  it('notEqAny_withInequalities_exclusiveRange', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          notEqualAny(field('name'), [constant('alice'), constant('charlie')]),
          greaterThan(field('age'), constant(10)),
          lessThan(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc2]
    );
  });

  it('notEqAny_withInequalities_inclusiveRange', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          notEqualAny(field('name'), [
            constant('alice'),
            constant('bob'),
            constant('eric')
          ]),
          greaterThanOrEqual(field('age'), constant(10)),
          lessThanOrEqual(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4]
    );
  });

  it('notEqAny_withInequalitiesAndSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          notEqualAny(field('name'), [constant('alice'), constant('diane')]),
          greaterThan(field('age'), constant(10)),
          lessThanOrEqual(field('age'), constant(100))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc2, doc3]);
  });

  it('notEqAny_withNotEqual', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('bob')]),
          notEqual(field('age'), constant(100))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc4, doc5]
    );
  });

  it('notEqAny_sortOnNotEqAnyField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(notEqualAny(field('name'), [constant('alice'), constant('bob')]))
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc4, doc5]);
  });

  it('notEqAny_singleValue_sortOnNotEqAnyField_ambiguousOrder', () => {
    const doc1 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc2 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc3 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(notEqualAny(field('age'), [constant(100)]))
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.members([
      doc2,
      doc3
    ]);
  });

  it('notEqAny_withExtraEquality_sortOnNotEqAnyField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('bob')]),
          equal(field('age'), constant(10))
        )
      )
      .sort(field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('notEqAny_withExtraEquality_sortOnEquality', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('bob')]),
          equal(field('age'), constant(10))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.members([doc4, doc5]);
  });

  it('notEqAny_withInequality_onSameField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('age'), [constant(10), constant(100)]),
          greaterThan(field('age'), constant(20))
        )
      )
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc2, doc1]
    );
  });

  it('notEqAny_withDifferentInequality_sortOnInField', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          notEqualAny(field('name'), [constant('alice'), constant('diane')]),
          greaterThan(field('age'), constant(20))
        )
      )
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc2, doc3]);
  });

  it('noLimitOnNumOfDisjunctions', () => {
    const doc1 = doc('users/a', 1000, {
      name: 'alice',
      age: 25,
      height: 170
    });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25, height: 180 });
    const doc3 = doc('users/c', 1000, {
      name: 'charlie',
      age: 100,
      height: 155
    });
    const doc4 = doc('users/d', 1000, {
      name: 'diane',
      age: 10,
      height: 150
    });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 25, height: 170 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiOr(
          equal(field('name'), constant('alice')),
          equal(field('name'), constant('bob')),
          equal(field('name'), constant('charlie')),
          equal(field('name'), constant('diane')),
          equal(field('age'), constant(10)),
          equal(field('age'), constant(25)),
          equal(field('age'), constant(40)),
          equal(field('age'), constant(100)),
          equal(field('height'), constant(150)),
          equal(field('height'), constant(160)),
          equal(field('height'), constant(170)),
          equal(field('height'), constant(180))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4, doc5]
    );
  });

  it('eqAny_duplicateValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        equalAny(field('score'), [
          constant(50),
          constant(97),
          constant(97),
          constant(97)
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc3
    ]);
  });

  it('notEqAny_duplicateValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        notEqualAny(field('score'), [
          constant(50),
          constant(50),
          constant(true)
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('arrayContainsAny_duplicateValues', () => {
    const doc1 = doc('users/a', 1000, { scores: [1, 2, 3] });
    const doc2 = doc('users/b', 1000, { scores: [4, 5, 6] });
    const doc3 = doc('users/c', 1000, { scores: [7, 8, 9] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        arrayContainsAny(field('scores'), [
          constant(1),
          constant(2),
          constant(2),
          constant(2)
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('arrayContainsAll_duplicateValues', () => {
    const doc1 = doc('users/a', 1000, { scores: [1, 2, 3] });
    const doc2 = doc('users/b', 1000, { scores: [1, 2, 2, 2, 3] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        arrayContainsAny(field('scores'), [
          constant(1),
          constant(2),
          constant(2),
          constant(2),
          constant(3)
        ])
      );

    expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc1, doc2]);
  });
});
