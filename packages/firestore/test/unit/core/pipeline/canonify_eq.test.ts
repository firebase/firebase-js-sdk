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
  eq,
  Field,
  gt,
  gte,
  isNan,
  like,
  lt,
  lte,
  neq,
  notEqAny,
  arrayContainsAny,
  add,
  constant,
  field,
  or as apiOr,
  not as apiNot,
  divide,
  BooleanExpr,
  exists,
  regexMatch,
  eqAny,
  xor as ApiXor,
  arrayContains,
  Expr,
  arrayContainsAll
} from '../../../../lite/pipelines/pipelines';
import { doc as docRef } from '../../../../src';
import { isNull } from '../../../../src/lite-api/expressions';
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
describe('Pipeline Canonify', () => {
  it('works as expected for simple where clause', () => {
    const p = db.pipeline().collection('test').where(eq(`foo`, 42));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(eq,[fld(foo),cst(42)]))|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for multiple stages', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .limit(10)
      .sort(field('bar').descending());

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(eq,[fld(foo),cst(42)]))|sort(fld(__name__)ascending)|limit(10)|sort(fld(bar)descending,fld(__name__)ascending)'
    );
  });

  it('works as expected for addFields stage', () => {
    const p = db
      .pipeline()
      .collection('test')
      .addFields(field('existingField'), constant(10).as('val'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|add_fields(__create_time__=fld(__create_time__),__name__=fld(__name__),__update_time__=fld(__update_time__),existingField=fld(existingField),val=cst(10))|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for aggregate stage with grouping', () => {
    const p = db
      .pipeline()
      .collection('test')
      .aggregate({
        accumulators: [field('value').sum().as('totalValue')],
        groups: ['category']
      });

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|aggregate(totalValue=fn(sum,[fld(value)]))grouping(category=fld(category))|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for distinct stage', () => {
    const p = db.pipeline().collection('test').distinct('category', 'city');

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|distinct(category=fld(category),city=fld(city))|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for select stage', () => {
    const p = db.pipeline().collection('test').select('name', field('age'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|select(__create_time__=fld(__create_time__),__name__=fld(__name__),__update_time__=fld(__update_time__),age=fld(age),name=fld(name))|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for offset stage', () => {
    const p = db.pipeline().collection('test').offset(5);

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|offset(5)|sort(fld(__name__)ascending)'
    );
  });

  it('works as expected for FindNearest stage', () => {
    const p = db
      .pipeline()
      .collection('test')
      .findNearest({
        field: field('location'),
        vectorValue: [1, 2, 3],
        distanceMeasure: 'cosine',
        limit: 10,
        distanceField: 'distance'
      });

    // Note: The exact string representation of the mapValue might vary depending on
    // how GeoPoint is implemented. Adjust the expected string accordingly.
    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|find_nearest(fld(location),cosine,[1,2,3],10,distance)|sort(fld(__name__)ascending)'
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
      .where(field('bar').eqAny(['a', 'b']));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/foo)|where(fn(eq_any,[fld(bar),list([cst("a"),cst("b")])]))|sort(fld(__name__)ascending)'
    );
  });
});

describe('pipelineEq', () => {
  it('returns true for identical pipelines', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42));
    const p2 = db.pipeline().collection('test').where(eq(`foo`, 42));

    expect(pipelineEq(p1, p2)).to.be.true;
  });

  it('returns false for pipelines with different stages', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42));
    const p2 = db.pipeline().collection('test').limit(10);

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns false for pipelines with different parameters within a stage', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42));
    const p2 = db
      .pipeline()
      .collection('test')
      .where(eq(field(`bar`), 42));

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns false for pipelines with different order of stages', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42)).limit(10);
    const p2 = db.pipeline().collection('test').limit(10).where(eq(`foo`, 42));

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns true for for different select order', () => {
    const p1 = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .select('foo', 'bar');
    const p2 = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .select('bar', 'foo');

    expect(pipelineEq(p1, p2)).to.be.true;
  });
});
