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

import { field } from '../../../../lite/pipelines/pipelines';
import { doc as docRef } from '../../../../src';
import { newTestFirestore } from '../../../util/api_helpers';
import { canonifyPipeline, pipelineEq } from '../../../util/pipelines';

const db = newTestFirestore();
describe('Pipeline Canonify', () => {
  it('works as expected for simple where clause', () => {
    const p = db.pipeline().collection('test').where(field(`foo`).equal(42));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(equal,[fld(foo),cst(42)]))|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for multiple stages', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(field(`foo`).equal(42))
      .limit(10)
      .sort(field('bar').descending());

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(equal,[fld(foo),cst(42)]))|sort(fld(__name__)ascending)|limit(10)|sort(fld(bar)descending,fld(__name__)ascending)'
    );
  });

  it('works as expected for CollectionGroupSource stage', () => {
    const p = db.pipeline().collectionGroup('cities');

    expect(canonifyPipeline(p)).to.equal(
      'collection_group(cities)|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for DatabaseSource stage', () => {
    const p = db.pipeline().database(); // Assuming you have a `database()` method on your `db` object

    expect(canonifyPipeline(p)).to.equal(
      'database()|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for DocumentsSource stage', () => {
    const p = db
      .pipeline()
      .documents([docRef(db, 'cities/SF'), docRef(db, 'cities/LA')]);

    expect(canonifyPipeline(p)).to.equal(
      'documents(/cities/LA,/cities/SF)|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for eqAny and arrays', () => {
    const p = db
      .pipeline()
      .collection('foo')
      .where(field('bar').equalAny(['a', 'b']));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/foo)|where(fn(equal_any,[fld(bar),list([cst("a"),cst("b")])]))|sort(fld(__name__)ascending)'
    );
  });
});

describe('pipelineEq', () => {
  it('returns true for identical pipelines', () => {
    const p1 = db.pipeline().collection('test').where(field(`foo`).equal(42));
    const p2 = db.pipeline().collection('test').where(field(`foo`).equal(42));

    expect(pipelineEq(p1, p2)).to.be.true;
  });

  it('returns false for pipelines with different stages', () => {
    const p1 = db.pipeline().collection('test').where(field(`foo`).equal(42));
    const p2 = db.pipeline().collection('test').limit(10);

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns false for pipelines with different parameters within a stage', () => {
    const p1 = db.pipeline().collection('test').where(field(`foo`).equal(42));
    const p2 = db.pipeline().collection('test').where(field(`bar`).equal(42));

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns false for pipelines with different order of stages', () => {
    const p1 = db
      .pipeline()
      .collection('test')
      .where(field(`foo`).equal(42))
      .limit(10);
    const p2 = db
      .pipeline()
      .collection('test')
      .limit(10)
      .where(field(`foo`).equal(42));

    expect(pipelineEq(p1, p2)).to.be.false;
  });
});
