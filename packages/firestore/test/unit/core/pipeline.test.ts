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
import {
  Field,
  eq,
  Constant,
  doc as docRef,
  lt,
  lte,
  add,
  multiply,
  gt,
  gte
} from '../../../src';
import { canonifyPipeline, pipelineEq } from '../../../src/core/pipeline-util';
import { runPipeline } from '../../../src/core/pipeline_run';

import { doc } from '../../util/helpers';
import { and, or } from '../../../src/lite-api/expressions';
import { newTestFirestore } from '../../util/api_helpers';

const db = newTestFirestore();

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
      .documents([docRef(db, 'cities/SF'), docRef(db, 'cities/LA')]);

    expect(canonifyPipeline(p)).to.equal('documents(/cities/LA,/cities/SF)');
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

describe.only('runPipeline()', () => {
  it('works with collection stage', () => {
    const p = db.pipeline().collection('test');

    expect(
      runPipeline(p, [
        doc('test/doc1', 1000, { foo: 'bar' }),
        doc('testNot/doc2', 1000, { foo: 'baz' }),
        doc('test/doc2', 1000, { foo: 'bazzzz' })
      ])
    ).to.deep.equal([
      doc('test/doc1', 1000, { foo: 'bar' }),
      doc('test/doc2', 1000, { foo: 'bazzzz' })
    ]);
  });

  it('works with collection groups', () => {
    const p = db.pipeline().collectionGroup('test');

    expect(
      runPipeline(p, [
        doc('test/doc1', 1000, { foo: 'bar' }),
        doc('testNot/doc2/test/doc2', 1000, { foo: 'baz' }),
        doc('test1/doc2', 1000, { foo: 'bazzzz' })
      ])
    ).to.deep.equal([
      doc('test/doc1', 1000, { foo: 'bar' }),
      doc('testNot/doc2/test/doc2', 1000, { foo: 'baz' })
    ]);
  });

  it('works with database', () => {
    const p = db.pipeline().database();

    expect(
      runPipeline(p, [
        doc('test/doc1', 1000, { foo: 'bar' }),
        doc('testNot/doc2/test/doc2', 1000, { foo: 'baz' }),
        doc('test1/doc2', 1000, { foo: 'bazzzz' })
      ])
    ).to.deep.equal([
      doc('test/doc1', 1000, { foo: 'bar' }),
      doc('testNot/doc2/test/doc2', 1000, { foo: 'baz' }),
      doc('test1/doc2', 1000, { foo: 'bazzzz' })
    ]);
  });

  it('works with simple wheres', () => {
    const dataset = [
      doc('test/doc1', 1000, { foo: 'bar' }),
      doc('testNot/doc2', 1000, { foo: 'baz' }),
      doc('test/doc2', 1000, { foo: 42 }),
      doc('test/doc3', 1000, { foo: '42' })
    ];

    expect(
      runPipeline(
        db.pipeline().collection('test').where(eq(`foo`, 42)),
        dataset
      )
    ).to.deep.equal([doc('test/doc2', 1000, { foo: 42 })]);

    expect(
      runPipeline(
        db
          .pipeline()
          .collection('test')
          .where(or(eq(`foo`, 42), eq('foo', 'bar'))),
        dataset
      )
    ).to.deep.equal([
      doc('test/doc1', 1000, { foo: 'bar' }),
      doc('test/doc2', 1000, { foo: 42 })
    ]);

    expect(
      runPipeline(
        db.pipeline().collection('test').where(lte(`foo`, '42')),
        dataset
      )
    ).to.deep.equal([
      doc('test/doc2', 1000, { foo: 42 }),
      doc('test/doc3', 1000, { foo: '42' })
    ]);
  });

  // a representative dataset
  const bookDataset = [
    doc('test/book0', 1000, {
      title: "The Hitchhiker's Guide to the Galaxy",
      author: 'Douglas Adams',
      genre: 'Science Fiction',
      published: 1979,
      rating: 4.2,
      tags: ['comedy', 'space', 'adventure'],
      awards: {
        hugo: true,
        nebula: false,
        others: { unknown: { year: 1980 } }
      },
      nestedField: { 'level.1': { 'level.2': true } }
    }),
    doc('test/book1', 1000, {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      genre: 'Romance',
      published: 1813,
      rating: 4.5,
      tags: ['classic', 'social commentary', 'love'],
      awards: { none: true }
    }),
    doc('test/book2', 1000, {
      title: 'One Hundred Years of Solitude',
      author: 'Gabriel García Márquez',
      genre: 'Magical Realism',
      published: 1967,
      rating: 4.3,
      tags: ['family', 'history', 'fantasy'],
      awards: { nobel: true, nebula: false }
    }),
    doc('test/book3', 1000, {
      title: 'The Lord of the Rings',
      author: 'J.R.R. Tolkien',
      genre: 'Fantasy',
      published: 1954,
      rating: 4.7,
      tags: ['adventure', 'magic', 'epic'],
      awards: { hugo: false, nebula: false }
    }),
    doc('test/book4', 1000, {
      title: "The Handmaid's Tale",
      author: 'Margaret Atwood',
      genre: 'Dystopian',
      published: 1985,
      rating: 4.1,
      tags: ['feminism', 'totalitarianism', 'resistance'],
      awards: { 'arthur c. clarke': true, 'booker prize': false }
    }),
    doc('test/book5', 1000, {
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      genre: 'Psychological Thriller',
      published: 1866,
      rating: 4.3,
      tags: ['philosophy', 'crime', 'redemption'],
      awards: { none: true }
    }),
    doc('test/book6', 1000, {
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      genre: 'Southern Gothic',
      published: 1960,
      rating: 4.2,
      tags: ['racism', 'injustice', 'coming-of-age'],
      awards: { pulitzer: true }
    }),
    doc('test/book7', 1000, {
      title: '1984',
      author: 'George Orwell',
      genre: 'Dystopian',
      published: 1949,
      rating: 4.2,
      tags: ['surveillance', 'totalitarianism', 'propaganda'],
      awards: { prometheus: true }
    }),
    doc('test/book8', 1000, {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      genre: 'Modernist',
      published: 1925,
      rating: 4.0,
      tags: ['wealth', 'american dream', 'love'],
      awards: { none: true }
    }),
    doc('test/book9', 1000, {
      title: 'Dune',
      author: 'Frank Herbert',
      genre: 'Science Fiction',
      published: 1965,
      rating: 4.6,
      tags: ['politics', 'desert', 'ecology'],
      awards: { hugo: true, nebula: true }
    })
  ];

  it('works with array contains', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(Field.of('tags').arrayContains('adventure'));

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[0],
      bookDataset[3]
    ]);
  });

  it('works with array contains all', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(Field.of('tags').arrayContainsAll('adventure', 'magic'));

    expect(runPipeline(p, bookDataset)).to.deep.equal([bookDataset[3]]);
  });

  it('works with array contains any', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(Field.of('tags').arrayContainsAny('adventure', 'classic'));

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[0],
      bookDataset[1],
      bookDataset[3]
    ]);
  });

  it('works with string queries', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(Field.of('title').startsWith('The'));

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[0],
      bookDataset[3],
      bookDataset[4],
      bookDataset[8]
    ]);

    const p2 = db
      .pipeline()
      .collection('test')
      .where(Field.of('title').endsWith('Tale'));

    expect(runPipeline(p2, bookDataset)).to.deep.equal([bookDataset[4]]);

    const p3 = db
      .pipeline()
      .collection('test')
      .where(Field.of('title').strContains('Guide'));

    expect(runPipeline(p3, bookDataset)).to.deep.equal([bookDataset[0]]);
  });

  it('works with like queries', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(Field.of('title').like('%the%'));

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[0],
      bookDataset[3]
    ]);
  });

  it('works with limit', () => {
    const p = db.pipeline().collection('test').limit(3);

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[0],
      bookDataset[1],
      bookDataset[2]
    ]);
  });

  it('works with offset', () => {
    const p = db.pipeline().collection('test').offset(3).limit(3);

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[3],
      bookDataset[4],
      bookDataset[5]
    ]);
  });

  it('works with regex operations', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(Field.of('title').regexMatch('^The.*ings'));

    expect(runPipeline(p, bookDataset)).to.deep.equal([bookDataset[3]]);

    const p2 = db
      .pipeline()
      .collection('test')
      .where(Field.of('title').regexContains('Guide'));

    expect(runPipeline(p2, bookDataset)).to.deep.equal([bookDataset[0]]);
  });

  it('works with arithmetics', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(multiply(Field.of('published'), Field.of('rating')).gte(9000));

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[3],
      bookDataset[9]
    ]);
  });

  it('works with logical operators', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(
        and(lt(Field.of('published'), 1900), gte(Field.of('rating'), 4.5))
      );

    expect(runPipeline(p, bookDataset)).to.deep.equal([bookDataset[1]]);
  });

  it('works with sort', () => {
    const p = db
      .pipeline()
      .collection('test')
      .sort(Field.of('published').ascending())
      .limit(3);

    expect(runPipeline(p, bookDataset)).to.deep.equal([
      bookDataset[1],
      bookDataset[5],
      bookDataset[8]
    ]);

    const p2 = db
      .pipeline()
      .collection('test')
      .sort(Field.of('published').descending())
      .limit(3);

    expect(runPipeline(p2, bookDataset)).to.deep.equal([
      bookDataset[4],
      bookDataset[0],
      bookDataset[2]
    ]);
  });
});
