/**
 * @license
 * Copyright 2024 Google LLC
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

import { Firestore } from '../../../src/api/database';
import { CredentialsProvider } from '../../../src/api/credentials';
import { User } from '../../../src/auth/user';
import { DatabaseId } from '../../../src/core/database_info';
import { Field, eq, Constant, doc } from '../../../src';
import { canonifyPipeline, pipelineEq } from '../../../src/core/pipeline-util';

const fakeAuthProvider: CredentialsProvider<User> =
  {} as unknown as CredentialsProvider<User>;
const fakeAppCheckProvider: CredentialsProvider<string> =
  {} as unknown as CredentialsProvider<string>;
const db = new Firestore(
  fakeAuthProvider,
  fakeAppCheckProvider,
  DatabaseId.empty()
);

describe('Pipeline Canonify', () => {
  it('works as expected for simple where clause', () => {
    const p = db.pipeline().collection('test').where(eq(`foo`, 42));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(eq,[fld(foo),cst(42)]))'
    );
  });

  it('works as expected for multiple stages', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .limit(10)
      .sort(Field.of('bar').descending());

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(eq,[fld(foo),cst(42)]))|limit(10)|sort(fld(bar) descending)'
    );
  });

  it('works as expected for addFields stage', () => {
    const p = db
      .pipeline()
      .collection('test')
      .addFields(Field.of('existingField'), Constant.of(10).as('val'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|add_fields(existingField=fld(existingField),val=cst(10))'
    );
  });

  it('works as expected for aggregate stage with grouping', () => {
    const p = db
      .pipeline()
      .collection('test')
      .aggregate({
        accumulators: [Field.of('value').sum().as('totalValue')],
        groups: ['category']
      });

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|aggregate(totalValue=fn(sum,[fld(value)]))grouping(category=fld(category))'
    );
  });

  it('works as expected for distinct stage', () => {
    const p = db.pipeline().collection('test').distinct('category', 'city');

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|distinct(category=fld(category),city=fld(city))'
    );
  });

  it('works as expected for select stage', () => {
    const p = db.pipeline().collection('test').select('name', Field.of('age'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|select(age=fld(age),name=fld(name))'
    );
  });

  it('works as expected for offset stage', () => {
    const p = db.pipeline().collection('test').offset(5);

    expect(canonifyPipeline(p)).to.equal('collection(/test)|offset(5)');
  });

  it('works as expected for FindNearest stage', () => {
    const p = db
      .pipeline()
      .collection('test')
      .findNearest({
        field: Field.of('location'),
        vectorValue: [1, 2, 3],
        distanceMeasure: 'cosine',
        limit: 10,
        distanceField: 'distance'
      });

    // Note: The exact string representation of the mapValue might vary depending on
    // how GeoPoint is implemented. Adjust the expected string accordingly.
    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|find_nearest(fld(location),cosine,[1,2,3],10,distance)'
    );
  });

  it('works as expected for CollectionGroupSource stage', () => {
    const p = db.pipeline().collectionGroup('cities');

    expect(canonifyPipeline(p)).to.equal('collection_group(cities)');
  });

  it('works as expected for DatabaseSource stage', () => {
    const p = db.pipeline().database(); // Assuming you have a `database()` method on your `db` object

    expect(canonifyPipeline(p)).to.equal('database()');
  });

  it('works as expected for DocumentsSource stage', () => {
    const p = db
      .pipeline()
      .documents([doc(db, 'cities/SF'), doc(db, 'cities/LA')]);

    expect(canonifyPipeline(p)).to.equal('documents(/cities/LA,/cities/SF)');
  });
});

describe.only('pipelineEq', () => {
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
      .where(eq(Field.of(`bar`), 42));

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
