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

describe('documents stage', () => {
  it('emptyRequest_isRejected', () => {
    expect(() => runPipeline(db.pipeline().documents([]), [])).to.throw();
  });

  it('duplicateKeys_isRejected', () => {
    expect(() =>
      runPipeline(
        db
          .pipeline()
          .documents([
            docRef(db, '/k/1'),
            docRef(db, '/k/2'),
            docRef(db, '/k/1')
          ]),
        []
      )
    ).to.throw();
  });

  it('emptyDatabase_returnsNoResults', () => {
    expect(runPipeline(db.pipeline().documents([docRef(db, '/users/a')]), []))
      .to.be.empty;
  });

  it('singleDocument_returnsDocument', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    expect(
      runPipeline(db.pipeline().documents([docRef(db, '/users/bob')]), [doc1])
    ).to.deep.equal([doc1]);
  });

  it('singleMissingDocument_returnsNoResults', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    expect(
      runPipeline(db.pipeline().documents([docRef(db, '/users/alice')]), [doc1])
    ).to.be.empty;
  });

  it('multipleDocuments_returnsDocuments', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(
        db
          .pipeline()
          .documents([
            docRef(db, '/users/bob'),
            docRef(db, '/users/alice'),
            docRef(db, '/users/charlie')
          ]),
        [doc1, doc2, doc3]
      )
    ).to.deep.equal([doc2, doc1, doc3]);
  });

  it('hugeDocumentCount_returnsDocuments', function () {
    this.timeout(10000); // Increase timeout for this test case to 10 seconds

    const size = 5000;
    const keys = [];
    const docs = [];
    for (let i = 0; i < size; i++) {
      keys.push(docRef(db, '/k/' + (i + 1)));
      docs.push(doc('k/' + (i + 1), 1000, { v: i }));
    }

    expect(
      runPipeline(
        db.pipeline().documents(keys).sort(field('v').ascending()),
        docs
      )
    ).to.deep.equal(docs);
  });

  it('partiallyMissingDocuments_returnsDocuments', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/diane', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(
        db
          .pipeline()
          .documents([
            docRef(db, '/users/bob'),
            docRef(db, '/users/alice'),
            docRef(db, '/users/charlie')
          ]),
        [doc1, doc2, doc3]
      )
    ).to.deep.equal([doc1, doc3]);
  });

  it('multipleCollections_returnsDocuments', () => {
    const doc1 = doc('c/1', 1000, { score: 90, rank: 1 });
    const doc2 = doc('b/2', 1000, { score: 50, rank: 3 });
    const doc3 = doc('a/3', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(
        db
          .pipeline()
          .documents([
            docRef(db, '/a/3'),
            docRef(db, '/b/2'),
            docRef(db, '/c/1')
          ])
          .sort(field(DOCUMENT_KEY_NAME).ascending()),
        [doc1, doc2, doc3]
      )
    ).to.deep.equal([doc3, doc2, doc1]);
  });

  it('sort_onPath_ascending', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    const pipeline = db
      .pipeline()
      .documents([
        docRef(db, '/users/bob'),
        docRef(db, '/users/alice'),
        docRef(db, '/users/charlie')
      ])
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1,
      doc3
    ]);
  });

  it('sort_onPath_descending', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    const pipeline = db
      .pipeline()
      .documents([
        docRef(db, '/users/bob'),
        docRef(db, '/users/alice'),
        docRef(db, '/users/charlie')
      ])
      .sort(field(DOCUMENT_KEY_NAME).descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1,
      doc2
    ]);
  });

  it('sort_onKey_ascending', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    const pipeline = db
      .pipeline()
      .documents([
        docRef(db, '/users/bob'),
        docRef(db, '/users/alice'),
        docRef(db, '/users/charlie')
      ])
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1,
      doc3
    ]);
  });

  it('sort_onKey_descending', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    const pipeline = db
      .pipeline()
      .documents([
        docRef(db, '/users/bob'),
        docRef(db, '/users/alice'),
        docRef(db, '/users/charlie')
      ])
      .sort(field(DOCUMENT_KEY_NAME).descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1,
      doc2
    ]);
  });

  it('limit', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    const pipeline = db
      .pipeline()
      .documents([
        docRef(db, '/users/bob'),
        docRef(db, '/users/alice'),
        docRef(db, '/users/charlie')
      ])
      .sort(field(DOCUMENT_KEY_NAME).ascending())
      .limit(2);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1
    ]);
  });
});
