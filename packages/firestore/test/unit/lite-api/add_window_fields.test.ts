/**
 * @license
 * Copyright 2026 Google LLC
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
  arrayAgg,
  arrayAggDistinct,
  ascending,
  average,
  constant,
  count,
  countAll,
  countDistinct,
  countIf,
  denseRank,
  descending,
  field,
  first,
  last,
  maximum,
  minimum,
  rank,
  rowNumber,
  sum,
  toLower
} from '../../../lite/pipelines/pipelines';
import { DatabaseId } from '../../../src/core/database_info';
import { Pipeline } from '../../../src/lite-api/pipeline';
import {
  newUserDataReader,
  UserDataSource
} from '../../../src/lite-api/user_data_reader';
import {
  Stage as ProtoStage,
  Value as ProtoValue
} from '../../../src/protos/firestore_proto_api';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { newTestFirestore } from '../../util/api_helpers';

const db = newTestFirestore();

/**
 * Serializes `pipeline` the same way `execute()` does, and returns the proto
 * for its (single) `add_window_fields` stage.
 */
function windowStage(pipeline: Pipeline): ProtoStage {
  const context = newUserDataReader(db).createContext(
    UserDataSource.Argument,
    'execute'
  );
  pipeline._readUserData(context);
  const proto = pipeline._toProto(
    new JsonProtoSerializer(DatabaseId.empty(), /* useProto3Json= */ false)
  );
  const stages = (proto.stages ?? []).filter(
    s => s.name === 'add_window_fields'
  );
  expect(stages).to.have.lengthOf(
    1,
    'expected exactly one add_window_fields stage'
  );
  return stages[0];
}

/** The `window_spec` argument (args[0]) of the `add_window_fields` stage. */
function windowSpecArg(pipeline: Pipeline): ProtoValue {
  const stage = windowStage(pipeline);
  expect(stage.args).to.have.lengthOf(
    2,
    'add_window_fields must have exactly 2 args'
  );
  return stage.args![0];
}

/** The `fields` argument (args[1]) of the `add_window_fields` stage. */
function fieldsArg(pipeline: Pipeline): ProtoValue {
  const stage = windowStage(pipeline);
  expect(stage.args).to.have.lengthOf(
    2,
    'add_window_fields must have exactly 2 args'
  );
  return stage.args![1];
}

function fieldRef(name: string): ProtoValue {
  return { fieldReferenceValue: name };
}

function int(value: number): ProtoValue {
  return { integerValue: `${value}` };
}

function str(value: string): ProtoValue {
  return { stringValue: value };
}

function map(fields: Record<string, ProtoValue>): ProtoValue {
  return { mapValue: { fields } };
}

function array(...values: ProtoValue[]): ProtoValue {
  return { arrayValue: { values } };
}

function fn(name: string, ...args: ProtoValue[]): ProtoValue {
  return { functionValue: { name, args } };
}

function ordering(expression: ProtoValue, direction: string): ProtoValue {
  return map({ direction: str(direction), expression });
}

function basePipeline(): Pipeline {
  return db.pipeline().collection('sales');
}

describe('addWindowFields() serialization', () => {
  describe('stage shape', () => {
    it('uses the add_window_fields stage name and 2 args', () => {
      const stage = windowStage(
        basePipeline().addWindowFields(
          { partition: ['product'] },
          countAll().as('c')
        )
      );

      expect(stage.name).to.equal('add_window_fields');
      expect(stage.args).to.have.lengthOf(2);
    });

    it('does not send any stage options', () => {
      const stage = windowStage(
        basePipeline().addWindowFields(
          { partition: ['product'] },
          countAll().as('c')
        )
      );

      expect(stage.options).to.deep.equal({});
    });
  });

  describe('window_spec', () => {
    it('serializes an empty window spec as an empty map', () => {
      expect(
        windowSpecArg(basePipeline().addWindowFields({}, countAll().as('c')))
      ).to.deep.equal(map({}));
    });

    it('serializes a partition of field name strings', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { partition: ['product', 'region'] },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({ partition: array(fieldRef('product'), fieldRef('region')) })
      );
    });

    it('serializes a partition of expressions', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { partition: [field('product'), toLower('region')] },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          partition: array(
            fieldRef('product'),
            fn('to_lower', fieldRef('region'))
          )
        })
      );
    });

    it('serializes a nested field path partition', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { partition: ['metadata.region'] },
            countAll().as('c')
          )
        )
      ).to.deep.equal(map({ partition: array(fieldRef('metadata.region')) }));
    });

    it('serializes a single (non array) sort ordering', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { sort: ascending('date') },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({ sort: array(ordering(fieldRef('date'), 'ascending')) })
      );
    });

    it('serializes multiple sort orderings with mixed directions', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { sort: [ascending('date'), descending('salesPrice')] },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(
            ordering(fieldRef('date'), 'ascending'),
            ordering(fieldRef('salesPrice'), 'descending')
          )
        })
      );
    });

    it('serializes partition and sort together', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { partition: ['product'], sort: ascending('date') },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          partition: array(fieldRef('product')),
          sort: array(ordering(fieldRef('date'), 'ascending'))
        })
      );
    });

    it('omits an empty partition array', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { partition: [], sort: ascending('date') },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({ sort: array(ordering(fieldRef('date'), 'ascending')) })
      );
    });

    it('omits an empty sort array', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { partition: ['product'], sort: [] },
            countAll().as('c')
          )
        )
      ).to.deep.equal(map({ partition: array(fieldRef('product')) }));
    });

    it('omits the frame when using default framing', () => {
      const spec = windowSpecArg(
        basePipeline().addWindowFields(
          { sort: ascending('date') },
          countAll().as('c')
        )
      );

      expect(spec.mapValue!.fields).to.not.have.property('documents');
      expect(spec.mapValue!.fields).to.not.have.property('range');
    });
  });

  describe('stage level documents framing', () => {
    it('serializes numeric offsets as integers', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: 2, following: 1 }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({ preceding: int(2), following: int(1) })
        })
      );
    });

    it('serializes zero offsets', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: 0, following: 0 }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({ preceding: int(0), following: int(0) })
        })
      );
    });

    it('serializes negative offsets (look ahead windows)', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: -1, following: 2 }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({ preceding: int(-1), following: int(2) })
        })
      );
    });

    it("serializes the 'unbounded' and 'current' sentinels", () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: 'unbounded', following: 'current' }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({
            preceding: str('unbounded'),
            following: str('current')
          })
        })
      );
    });

    it('serializes an unbounded to unbounded frame', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            { documents: { preceding: 'unbounded', following: 'unbounded' } },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          documents: map({
            preceding: str('unbounded'),
            following: str('unbounded')
          })
        })
      );
    });

    it('serializes constant expression bounds', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: constant(3), following: constant(0) }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({ preceding: int(3), following: int(0) })
        })
      );
    });
  });

  describe('stage level range framing', () => {
    it('serializes numeric range offsets', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('salesPrice'),
              range: { preceding: 10, following: 10 }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('salesPrice'), 'ascending')),
          range: map({ preceding: int(10), following: int(10) })
        })
      );
    });

    it('serializes fractional range offsets as doubles', () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('salesPrice'),
              range: { preceding: 2.5, following: 0 }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('salesPrice'), 'ascending')),
          range: map({ preceding: { doubleValue: 2.5 }, following: int(0) })
        })
      );
    });

    it("serializes a range frame with a 'day' time unit", () => {
      expect(
        windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              range: { preceding: 30, following: 'current', unit: 'day' }
            },
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          range: map({
            preceding: int(30),
            following: str('current'),
            unit: str('day')
          })
        })
      );
    });

    for (const unit of [
      'microsecond',
      'millisecond',
      'second',
      'minute',
      'hour',
      'day',
      'week',
      'month',
      'quarter',
      'year'
    ] as const) {
      it(`serializes the '${unit}' time unit`, () => {
        const spec = windowSpecArg(
          basePipeline().addWindowFields(
            {
              sort: ascending('date'),
              range: { preceding: 1, following: 'current', unit }
            },
            countAll().as('c')
          )
        );

        expect(spec.mapValue!.fields!.range).to.deep.equal(
          map({ preceding: int(1), following: str('current'), unit: str(unit) })
        );
      });
    }

    it("omits 'unit' when it is not specified", () => {
      const spec = windowSpecArg(
        basePipeline().addWindowFields(
          {
            sort: ascending('salesPrice'),
            range: { preceding: 'unbounded', following: 'current' }
          },
          countAll().as('c')
        )
      );

      expect(spec.mapValue!.fields!.range).to.deep.equal(
        map({ preceding: str('unbounded'), following: str('current') })
      );
    });
  });

  describe('fields', () => {
    it('maps each alias to its aggregate function', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { partition: ['product'] },
            sum('salesPrice').as('total'),
            countAll().as('c')
          )
        )
      ).to.deep.equal(
        map({
          total: fn('sum', fieldRef('salesPrice')),
          c: fn('count')
        })
      );
    });

    it('supports nested output field paths', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { partition: ['product'] },
            sum('salesPrice').as('stats.total')
          )
        )
      ).to.deep.equal(
        map({ 'stats.total': fn('sum', fieldRef('salesPrice')) })
      );
    });

    it('serializes all supported aggregate function names', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { partition: ['product'] },
            countAll().as('countAll'),
            count('salesPrice').as('count'),
            countIf(field('salesPrice').greaterThan(10)).as('countIf'),
            countDistinct('salesPrice').as('countDistinct'),
            sum('salesPrice').as('sum'),
            average('salesPrice').as('average'),
            minimum('salesPrice').as('minimum'),
            maximum('salesPrice').as('maximum'),
            first('salesPrice').as('first'),
            last('salesPrice').as('last'),
            arrayAgg('salesPrice').as('arrayAgg'),
            arrayAggDistinct('salesPrice').as('arrayAggDistinct')
          )
        )
      ).to.deep.equal(
        map({
          countAll: fn('count'),
          count: fn('count', fieldRef('salesPrice')),
          countIf: fn(
            'count_if',
            fn('greater_than', fieldRef('salesPrice'), int(10))
          ),
          countDistinct: fn('count_distinct', fieldRef('salesPrice')),
          sum: fn('sum', fieldRef('salesPrice')),
          average: fn('average', fieldRef('salesPrice')),
          minimum: fn('minimum', fieldRef('salesPrice')),
          maximum: fn('maximum', fieldRef('salesPrice')),
          first: fn('first', fieldRef('salesPrice')),
          last: fn('last', fieldRef('salesPrice')),
          arrayAgg: fn('array_agg', fieldRef('salesPrice')),
          arrayAggDistinct: fn('array_agg_distinct', fieldRef('salesPrice'))
        })
      );
    });

    it('serializes aggregates over computed expressions', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { partition: ['product'] },
            sum(field('salesPrice').multiply(2)).as('doubled')
          )
        )
      ).to.deep.equal(
        map({
          doubled: fn('sum', fn('multiply', fieldRef('salesPrice'), int(2)))
        })
      );
    });

    it('serializes the ranking window functions', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { sort: descending('salesPrice') },
            rank().as('rank'),
            denseRank().as('denseRank'),
            rowNumber().as('rowNumber')
          )
        )
      ).to.deep.equal(
        map({
          rank: fn('rank'),
          denseRank: fn('dense_rank'),
          rowNumber: fn('row_number')
        })
      );
    });

    it('rejects duplicate aliases', () => {
      expect(() =>
        basePipeline().addWindowFields(
          { partition: ['product'] },
          sum('salesPrice').as('total'),
          average('salesPrice').as('total')
        )
      ).to.throw(/Duplicate alias or field 'total'/);
    });
  });

  describe('accumulator level framing (over)', () => {
    it("wraps an aggregate in over() with a 'documents' frame", () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { sort: ascending('date') },
            average('salesPrice')
              .over({ documents: { preceding: 1, following: 1 } })
              .as('movingAverage')
          )
        )
      ).to.deep.equal(
        map({
          movingAverage: fn(
            'over',
            fn('average', fieldRef('salesPrice')),
            map({
              documents: map({ preceding: int(1), following: int(1) })
            })
          )
        })
      );
    });

    it("wraps an aggregate in over() with a 'range' frame and time unit", () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { sort: ascending('date') },
            sum('salesPrice')
              .over({
                range: { preceding: 10, following: 0, unit: 'day' }
              })
              .as('tenDayTotal')
          )
        )
      ).to.deep.equal(
        map({
          tenDayTotal: fn(
            'over',
            fn('sum', fieldRef('salesPrice')),
            map({
              range: map({
                preceding: int(10),
                following: int(0),
                unit: str('day')
              })
            })
          )
        })
      );
    });

    it('supports different frames for different accumulators', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { partition: ['product'], sort: ascending('date') },
            sum('salesPrice')
              .over({
                documents: { preceding: 'unbounded', following: 'current' }
              })
              .as('runningTotal'),
            average('salesPrice')
              .over({ documents: { preceding: 1, following: 1 } })
              .as('movingAverage')
          )
        )
      ).to.deep.equal(
        map({
          runningTotal: fn(
            'over',
            fn('sum', fieldRef('salesPrice')),
            map({
              documents: map({
                preceding: str('unbounded'),
                following: str('current')
              })
            })
          ),
          movingAverage: fn(
            'over',
            fn('average', fieldRef('salesPrice')),
            map({ documents: map({ preceding: int(1), following: int(1) }) })
          )
        })
      );
    });

    it('does not wrap in over() when no frame is provided', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { sort: ascending('date') },
            sum('salesPrice').over().as('total')
          )
        )
      ).to.deep.equal(map({ total: fn('sum', fieldRef('salesPrice')) }));
    });

    it('supports over() on a ranking window function', () => {
      expect(
        fieldsArg(
          basePipeline().addWindowFields(
            { sort: ascending('date') },
            rank()
              .over({
                documents: { preceding: 'unbounded', following: 'current' }
              })
              .as('r')
          )
        )
      ).to.deep.equal(
        map({
          r: fn(
            'over',
            fn('rank'),
            map({
              documents: map({
                preceding: str('unbounded'),
                following: str('current')
              })
            })
          )
        })
      );
    });

    // The SDK does not reject `partition`/`sort` in `over()`. They are encoded
    // into the same window spec map as the frame, and the backend responds with
    // `Window frame has unexpected fields: [partition]`. Leaving this to the
    // backend means accumulator level partitioning starts working without an
    // SDK change if the backend ever supports it.
    it('encodes a partition supplied to over()', () => {
      const fields = fieldsArg(
        basePipeline().addWindowFields(
          { sort: ascending('date') },
          sum('salesPrice')
            .over({
              partition: ['product'],
              documents: { preceding: 1, following: 1 }
            })
            .as('total')
        )
      );

      expect(fields).to.deep.equal(
        map({
          total: fn(
            'over',
            fn('sum', fieldRef('salesPrice')),
            map({
              partition: array(fieldRef('product')),
              documents: map({ preceding: int(1), following: int(1) })
            })
          )
        })
      );
    });

    it('encodes a sort supplied to over()', () => {
      const fields = fieldsArg(
        basePipeline().addWindowFields(
          { sort: ascending('date') },
          sum('salesPrice')
            .over({
              sort: ascending('date'),
              documents: { preceding: 1, following: 1 }
            })
            .as('total')
        )
      );

      expect(fields).to.deep.equal(
        map({
          total: fn(
            'over',
            fn('sum', fieldRef('salesPrice')),
            map({
              sort: array(ordering(fieldRef('date'), 'ascending')),
              documents: map({ preceding: int(1), following: int(1) })
            })
          )
        })
      );
    });
  });

  describe('options overload', () => {
    it('produces the same proto as the varargs overload', () => {
      const varargs = windowStage(
        basePipeline().addWindowFields(
          {
            partition: ['product'],
            sort: ascending('date'),
            documents: { preceding: 1, following: 1 }
          },
          average('salesPrice').as('movingAverage'),
          countAll().as('windowCount')
        )
      );

      const options = windowStage(
        basePipeline().addWindowFields({
          window: {
            partition: ['product'],
            sort: ascending('date'),
            documents: { preceding: 1, following: 1 }
          },
          fields: [
            average('salesPrice').as('movingAverage'),
            countAll().as('windowCount')
          ]
        })
      );

      expect(options).to.deep.equal(varargs);
    });

    it('does not leak window/fields into the stage options', () => {
      const stage = windowStage(
        basePipeline().addWindowFields({
          window: { partition: ['product'] },
          fields: [countAll().as('c')]
        })
      );

      expect(stage.options).to.deep.equal({});
    });
  });

  // The SDK deliberately does not validate these. Everything below is
  // encodable, so it is sent to the backend, which owns validation and returns
  // a precise error. This keeps the SDK from having to change whenever the
  // backend relaxes or extends a rule.
  describe('backend validated combinations are still encoded', () => {
    it("encodes both 'documents' and 'range' when both are supplied", () => {
      const windowSpec = windowSpecArg(
        basePipeline().addWindowFields(
          {
            sort: ascending('date'),
            // Deliberately bypassing the OneOf type. The backend replies
            // "Cannot specify both 'documents' and 'range' window frames."
            documents: { preceding: 1, following: 1 },
            range: { preceding: 2, following: 2 }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          countAll().as('c')
        )
      );

      expect(windowSpec).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({ preceding: int(1), following: int(1) }),
          range: map({ preceding: int(2), following: int(2) })
        })
      );
    });

    it('passes through an unrecognized frame bound string', () => {
      const windowSpec = windowSpecArg(
        basePipeline().addWindowFields(
          {
            sort: ascending('date'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            documents: { preceding: 'infinite' as any, following: 'current' }
          },
          countAll().as('c')
        )
      );

      expect(windowSpec).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({
            preceding: str('infinite'),
            following: str('current')
          })
        })
      );
    });

    it("encodes 'unit' even on a 'documents' frame", () => {
      const windowSpec = windowSpecArg(
        basePipeline().addWindowFields(
          {
            sort: ascending('date'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            documents: { preceding: 1, following: 1, unit: 'day' } as any
          },
          countAll().as('c')
        )
      );

      expect(windowSpec).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({
            preceding: int(1),
            following: int(1),
            unit: str('day')
          })
        })
      );
    });

    it('omits a bound that was not supplied', () => {
      const windowSpec = windowSpecArg(
        basePipeline().addWindowFields(
          {
            sort: ascending('date'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            documents: { preceding: 'unbounded' } as any
          },
          countAll().as('c')
        )
      );

      expect(windowSpec).to.deep.equal(
        map({
          sort: array(ordering(fieldRef('date'), 'ascending')),
          documents: map({ preceding: str('unbounded') })
        })
      );
    });
  });
});
