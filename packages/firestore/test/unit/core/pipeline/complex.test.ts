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

describe('Complex Queries', () => {
  const COLLECTION_ID = 'test';
  let docIdCounter = 1;

  beforeEach(() => {
    docIdCounter = 1;
  });

  function seedDatabase(
    numOfDocuments: number,
    numOfFields: number,
    valueSupplier: () => any
  ): MutableDocument[] {
    const documents = [];
    for (let i = 0; i < numOfDocuments; i++) {
      const docData = {};
      for (let j = 1; j <= numOfFields; j++) {
        // @ts-ignore
        docData[`field_${j}`] = valueSupplier();
      }
      const newDoc = doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, docData);
      documents.push(newDoc);
      docIdCounter++;
    }
    return documents;
  }

  it('where_withMaxNumberOfStages', () => {
    const numOfFields = 127;
    let valueCounter = 1;
    const documents = seedDatabase(10, numOfFields, () => valueCounter++);

    // TODO(pipeline): Why do i need this hack?
    let pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(eq(constant(1), 1));
    for (let i = 1; i <= numOfFields; i++) {
      pipeline = pipeline.where(gt(field(`field_${i}`), constant(0)));
    }

    expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
  });

  it('eqAny_withMaxNumberOfElements', () => {
    const numOfDocuments = 1000;
    let valueCounter = 1;
    const documents = seedDatabase(numOfDocuments, 1, () => valueCounter++);
    // Add one more document not matching 'in' condition
    documents.push(
      doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: 3001 })
    );

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(
        eqAny(
          field('field_1'),
          Array.from({ length: 3000 }, (_, i) => constant(i + 1))
        )
      );

    expect(runPipeline(pipeline, documents)).to.have.deep.members(
      documents.slice(0, -1)
    ); // Exclude the last document
  });

  it('eqAny_withMaxNumberOfElements_onMultipleFields', () => {
    const numOfFields = 10;
    const numOfDocuments = 100;
    let valueCounter = 1;
    const documents = seedDatabase(
      numOfDocuments,
      numOfFields,
      () => valueCounter++
    );
    // Add one more document not matching 'in' condition
    documents.push(
      doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: 3001 })
    );

    const conditions = [];
    for (let i = 1; i <= numOfFields; i++) {
      conditions.push(
        eqAny(
          field(`field_${i}`),
          Array.from({ length: 3000 }, (_, j) => constant(j + 1))
        )
      );
    }

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(apiAnd(conditions[0], conditions[1], ...conditions.slice(2)));

    expect(runPipeline(pipeline, documents)).to.have.deep.members(
      documents.slice(0, -1)
    ); // Exclude the last document
  });

  it('notEqAny_withMaxNumberOfElements', () => {
    const numOfDocuments = 1000;
    let valueCounter = 1;
    const documents = seedDatabase(numOfDocuments, 1, () => valueCounter++);
    // Add one more document matching 'notEqAny' condition
    const doc1 = doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, {
      field_1: 3001
    });
    documents.push(doc1);

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(
        notEqAny(
          field('field_1'),
          Array.from({ length: 3000 }, (_, i) => constant(i + 1))
        )
      );

    expect(runPipeline(pipeline, documents)).to.have.deep.members([doc1]);
  });

  it('notEqAny_withMaxNumberOfElements_onMultipleFields', () => {
    const numOfFields = 10;
    const numOfDocuments = 100;
    let valueCounter = 1;
    const documents = seedDatabase(
      numOfDocuments,
      numOfFields,
      () => valueCounter++
    );
    // Add one more document matching 'notEqAny' condition
    const doc1 = doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, {
      field_1: 3001
    });
    documents.push(doc1);

    const conditions = [];
    for (let i = 1; i <= numOfFields; i++) {
      conditions.push(
        notEqAny(
          field(`field_${i}`),
          Array.from({ length: 3000 }, (_, j) => constant(j + 1))
        )
      );
    }

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(apiOr(conditions[0], conditions[1], ...conditions.slice(2)));

    expect(runPipeline(pipeline, documents)).to.have.deep.members([doc1]);
  });

  it('arrayContainsAny_withLargeNumberOfElements', () => {
    const numOfDocuments = 1000;
    let valueCounter = 1;
    const documents = seedDatabase(numOfDocuments, 1, () => [valueCounter++]);
    // Add one more document not matching 'arrayContainsAny' condition
    documents.push(
      doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: [3001] })
    );

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(
        arrayContainsAny(
          field('field_1'),
          Array.from({ length: 3000 }, (_, i) => constant(i + 1))
        )
      );

    expect(runPipeline(pipeline, documents)).to.have.deep.members(
      documents.slice(0, -1)
    ); // Exclude the last document
  });

  it('arrayContainsAny_withMaxNumberOfElements_onMultipleFields', () => {
    const numOfFields = 10;
    const numOfDocuments = 100;
    let valueCounter = 1;
    const documents = seedDatabase(numOfDocuments, numOfFields, () => [
      valueCounter++
    ]);
    // Add one more document not matching 'arrayContainsAny' condition
    documents.push(
      doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: [3001] })
    );

    const conditions = [];
    for (let i = 1; i <= numOfFields; i++) {
      conditions.push(
        arrayContainsAny(
          field(`field_${i}`),
          Array.from({ length: 3000 }, (_, j) => constant(j + 1))
        )
      );
    }

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(apiOr(conditions[0], conditions[1], ...conditions.slice(2)));

    expect(runPipeline(pipeline, documents)).to.have.deep.members(
      documents.slice(0, -1)
    ); // Exclude the last document
  });

  it('sortByMaxNumOfFields_withoutIndex', () => {
    const numOfFields = 31;
    const numOfDocuments = 100;
    // Passing a constant value here to reduce the complexity on result assertion.
    const documents = seedDatabase(numOfDocuments, numOfFields, () => 10);
    // sort(field_1, field_2...)
    const sortFields = [];
    for (let i = 1; i <= numOfFields; i++) {
      sortFields.push(field('field_' + i).ascending());
    }
    // add __name__ as the last field in sort.
    sortFields.push(field('__name__').ascending());

    const pipeline = db
      .pipeline()
      .collection('/' + COLLECTION_ID)
      .sort(sortFields[0], ...sortFields.slice(1));

    expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
  });

  it('where_withNestedAddFunction_maxDepth', () => {
    const numOfFields = 1;
    const numOfDocuments = 10;
    const documents = seedDatabase(numOfDocuments, numOfFields, () => 0);

    const depth = 31;
    let addFunc = add(field('field_1'), constant(1));
    for (let i = 1; i < depth; i++) {
      addFunc = add(addFunc, constant(1));
    }

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(gt(addFunc, constant(0)));

    expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
  });

  it('where_withLargeNumberOrs', () => {
    const numOfFields = 100;
    const numOfDocuments = 50;
    let valueCounter = 1;
    const documents = seedDatabase(
      numOfDocuments,
      numOfFields,
      () => valueCounter++
    );

    const orConditions = [];
    for (let i = 1; i <= numOfFields; i++) {
      orConditions.push(lte(field(`field_${i}`), constant(valueCounter)));
    }

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(apiOr(orConditions[0], orConditions[1], ...orConditions.slice(2)));

    expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
  });

  it('where_withLargeNumberOfConjunctions', () => {
    const numOfFields = 50;
    const numOfDocuments = 100;
    let valueCounter = 1;
    const documents = seedDatabase(
      numOfDocuments,
      numOfFields,
      () => valueCounter++
    );

    const andConditions1 = [];
    const andConditions2 = [];
    for (let i = 1; i <= numOfFields; i++) {
      andConditions1.push(gt(field(`field_${i}`), constant(0)));
      andConditions2.push(
        lt(field(`field_${i}`), constant(Number.MAX_SAFE_INTEGER))
      );
    }

    const pipeline = db
      .pipeline()
      .collection(`/${COLLECTION_ID}`)
      .where(
        or(
          apiAnd(
            andConditions1[0],
            andConditions1[1],
            ...andConditions1.slice(2)
          ),
          apiAnd(
            andConditions2[0],
            andConditions2[1],
            ...andConditions2.slice(2)
          )
        )
      );

    expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
  });
});
