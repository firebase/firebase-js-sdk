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

describe('Nested Properties', () => {
  it('where_equality_deeplyNested', () => {
    const doc1 = doc('users/a', 1000, {
      a: {
        b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 42 } } } } } } } } }
      }
    });
    const doc2 = doc('users/b', 1000, {
      a: {
        b: { c: { d: { e: { f: { g: { h: { i: { j: { k: '42' } } } } } } } } }
      }
    });
    const doc3 = doc('users/c', 1000, {
      a: {
        b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 0 } } } } } } } } }
      }
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('a.b.c.d.e.f.g.h.i.j.k'), constant(42)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('where_inequality_deeplyNested', () => {
    const doc1 = doc('users/a', 1000, {
      a: {
        b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 42 } } } } } } } } }
      }
    });
    const doc2 = doc('users/b', 1000, {
      a: {
        b: { c: { d: { e: { f: { g: { h: { i: { j: { k: '42' } } } } } } } } }
      }
    });
    const doc3 = doc('users/c', 1000, {
      a: {
        b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 0 } } } } } } } } }
      }
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gte(field('a.b.c.d.e.f.g.h.i.j.k'), constant(0)))
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('where_equality', () => {
    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('address.street'), constant('76')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2
    ]);
  });

  it('multipleFilters', () => {
    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('address.city'), constant('San Francisco')))
      .where(gt(field('address.zip'), constant(90000)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1
    ]);
  });

  it('multipleFilters_redundant', () => {
    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        eq(
          field('address'),
          constantMap({ city: 'San Francisco', state: 'CA', zip: 94105 })
        )
      )
      .where(gt(field('address.zip'), constant(90000)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1
    ]);
  });

  it('multipleFilters_withCompositeIndex', async () => {
    // Assuming a similar setup for creating composite indexes in your environment.
    // This part will need adaptation based on your specific index creation mechanism.

    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('address.city'), constant('San Francisco')))
      .where(gt(field('address.zip'), constant(90000)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1
    ]);
  });

  // it('multipleFilters_redundant_withCompositeIndex', async () => {
  //   const doc1 = doc('users/a', 1000, {
  //     address: { city: 'San Francisco', state: 'CA', zip: 94105 },
  //   });
  //   const doc2 = doc('users/b', 1000, {
  //     address: { street: '76', city: 'New York', state: 'NY', zip: 10011 },
  //   });
  //   const doc3 = doc('users/c', 1000, {
  //     address: { city: 'Mountain View', state: 'CA', zip: 94043 },
  //   });
  //   const doc4 = doc('users/d', 1000, {});
  //
  //   const pipeline = db.pipeline().collection('/users')
  //     .where(eq(field('address'), constant({ city: 'San Francisco', state: 'CA', zip: 94105 })))
  //     .where(gt(field('address.zip'), constant(90000)));
  //
  //   expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([doc1]);
  // });

  // it('multipleFilters_redundant_withCompositeIndex_nestedPropertyFirst', async () => {
  //   const doc1 = doc('users/a', 1000, {
  //     address: { city: 'San Francisco', state: 'CA', zip: 94105 },
  //   });
  //   const doc2 = doc('users/b', 1000, {
  //     address: { street: '76', city: 'New York', state: 'NY', zip: 10011 },
  //   });
  //   const doc3 = doc('users/c', 1000, {
  //     address: { city: 'Mountain View', state: 'CA', zip: 94043 },
  //   });
  //   const doc4 = doc('users/d', 1000, {});
  //
  //   const pipeline = db.pipeline().collection('/users')
  //     .where(eq(field('address'), constant({ city: 'San Francisco', state: 'CA', zip: 94105 })))
  //     .where(gt(field('address.zip'), constant(90000)));
  //
  //   expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([doc1]);
  // });

  it('where_inequality', () => {
    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline1 = db
      .pipeline()
      .collection('/users')
      .where(gt(field('address.zip'), constant(90000)));
    expect(runPipeline(pipeline1, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1,
      doc3
    ]);

    const pipeline2 = db
      .pipeline()
      .collection('/users')
      .where(lt(field('address.zip'), constant(90000)));
    expect(runPipeline(pipeline2, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2
    ]);

    const pipeline3 = db
      .pipeline()
      .collection('/users')
      .where(lt(field('address.zip'), constant(0)));
    expect(runPipeline(pipeline3, [doc1, doc2, doc3, doc4])).to.be.empty;

    const pipeline4 = db
      .pipeline()
      .collection('/users')
      .where(neq(field('address.zip'), constant(10011)));
    expect(runPipeline(pipeline4, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('where_exists', () => {
    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('address.street')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc2
    ]);
  });

  it('where_notExists', () => {
    const doc1 = doc('users/a', 1000, {
      address: { city: 'San Francisco', state: 'CA', zip: 94105 }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('address.street'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1,
      doc3,
      doc4
    ]);
  });

  it('where_isNull', () => {
    const doc1 = doc('users/a', 1000, {
      address: {
        city: 'San Francisco',
        state: 'CA',
        zip: 94105,
        street: null
      }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('address.street').isNull());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('where_isNotNull', () => {
    const doc1 = doc('users/a', 1000, {
      address: {
        city: 'San Francisco',
        state: 'CA',
        zip: 94105,
        street: null
      }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(field('address.street').isNull()));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
  });

  it('sort_withExists', () => {
    const doc1 = doc('users/a', 1000, {
      address: {
        street: '41',
        city: 'San Francisco',
        state: 'CA',
        zip: 94105
      }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('address.street')))
      .sort(field('address.street').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc1, doc2]);
  });

  it('sort_withoutExists', () => {
    const doc1 = doc('users/a', 1000, {
      address: {
        street: '41',
        city: 'San Francisco',
        state: 'CA',
        zip: 94105
      }
    });
    const doc2 = doc('users/b', 1000, {
      address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
    });
    const doc3 = doc('users/c', 1000, {
      address: { city: 'Mountain View', state: 'CA', zip: 94043 }
    });
    const doc4 = doc('users/d', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('address.street').ascending());

    const results = runPipeline(pipeline, [doc1, doc2, doc3, doc4]);
    expect(results).to.have.lengthOf(4);
    expect(results[2]).to.deep.equal(doc1);
    expect(results[3]).to.deep.equal(doc2);
  });

  it('quotedNestedProperty_filterNested', () => {
    const doc1 = doc('users/a', 1000, { 'address.city': 'San Francisco' });
    const doc2 = doc('users/b', 1000, { address: { city: 'San Francisco' } });
    const doc3 = doc('users/c', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('address.city'), constant('San Francisco')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
  });

  it('quotedNestedProperty_filterQuotedNested', () => {
    const doc1 = doc('users/a', 1000, { 'address.city': 'San Francisco' });
    const doc2 = doc('users/b', 1000, { address: { city: 'San Francisco' } });
    const doc3 = doc('users/c', 1000, {});

    const pipeline = db
      .pipeline()
      .collection('/users')
      // TODO(pipeline): Replace below with field('`address.city`') once we support it.
      .where(
        eq(
          new Field(new FieldPath(['address.city'])),
          constant('San Francisco')
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });
});
