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

/* eslint @typescript-eslint/no-explicit-any: 0 */

import { ObjectValue } from '../model/object_value';
import {
  ExecutePipelineRequest,
  StructuredPipeline,
  Stage as ProtoStage
} from '../protos/firestore_proto_api';
import { invokeExecutePipeline } from '../remote/datastore';
import {
  getEncodedDatabaseId,
  JsonProtoSerializer,
  ProtoSerializable
} from '../remote/serializer';

import { getDatastore } from './components';
import { Firestore } from './database';
import {
  Accumulator,
  AccumulatorTarget,
  Expr,
  ExprWithAlias,
  Field,
  Fields,
  FilterCondition,
  Ordering,
  Selectable
} from './expressions';
import { PipelineResult } from './pipeline-result';
import { DocumentReference } from './reference';
import {
  AddFields,
  Aggregate,
  Distinct,
  FindNearest,
  FindNearestOptions,
  GenericStage,
  Limit,
  Offset,
  Select,
  Sort,
  Stage,
  Where
} from './stage';
import {
  parseVectorValue,
  UserDataReader,
  UserDataSource
} from './user_data_reader';
import { AbstractUserDataWriter } from './user_data_writer';

interface ReadableUserData {
  _readUserData(dataReader: UserDataReader): void;
}

function isReadableUserData(value: any): value is ReadableUserData {
  return typeof (value as ReadableUserData)._readUserData === 'function';
}

/**
 * @beta
 *
 * The Pipeline class provides a flexible and expressive framework for building complex data
 * transformation and query pipelines for Firestore.
 *
 * A pipeline takes data sources, such as Firestore collections or collection groups, and applies
 * a series of stages that are chained together. Each stage takes the output from the previous stage
 * (or the data source) and produces an output for the next stage (or as the final output of the
 * pipeline).
 *
 * Expressions can be used within each stage to filter and transform data through the stage.
 *
 * NOTE: The chained stages do not prescribe exactly how Firestore will execute the pipeline.
 * Instead, Firestore only guarantees that the result is the same as if the chained stages were
 * executed in order.
 *
 * Usage Examples:
 *
 * ```typescript
 * const db: Firestore; // Assumes a valid firestore instance.
 *
 * // Example 1: Select specific fields and rename 'rating' to 'bookRating'
 * const results1 = await db.pipeline()
 *     .collection("books")
 *     .select("title", "author", Field.of("rating").as("bookRating"))
 *     .execute();
 *
 * // Example 2: Filter documents where 'genre' is "Science Fiction" and 'published' is after 1950
 * const results2 = await db.pipeline()
 *     .collection("books")
 *     .where(and(Field.of("genre").eq("Science Fiction"), Field.of("published").gt(1950)))
 *     .execute();
 *
 * // Example 3: Calculate the average rating of books published after 1980
 * const results3 = await db.pipeline()
 *     .collection("books")
 *     .where(Field.of("published").gt(1980))
 *     .aggregate(avg(Field.of("rating")).as("averageRating"))
 *     .execute();
 * ```
 */

/**
 * Base-class implementation
 */
export class Pipeline implements ProtoSerializable<ExecutePipelineRequest> {
  /**
   * @internal
   * @private
   * @param _db
   * @param userDataReader
   * @param _userDataWriter
   * @param stages
   */
  constructor(
    /**
     * @internal
     * @private
     */
    public _db: Firestore,
    readonly userDataReader: UserDataReader,
    /**
     * @internal
     * @private
     */
    public _userDataWriter: AbstractUserDataWriter,
    readonly stages: Stage[]
  ) {}

  /**
   * Adds new fields to outputs from previous stages.
   *
   * This stage allows you to compute values on-the-fly based on existing data from previous
   * stages or constants. You can use this to create new fields or overwrite existing ones (if there
   * is name overlaps).
   *
   * The added fields are defined using {@link Selectable}s, which can be:
   *
   * - {@link Field}: References an existing document field.
   * - {@link Function}: Performs a calculation using functions like `add`, `multiply` with
   *   assigned aliases using {@link Expr#as}.
   *
   * Example:
   *
   * ```typescript
   * firestore.pipeline().collection("books")
   *   .addFields(
   *     Field.of("rating").as("bookRating"), // Rename 'rating' to 'bookRating'
   *     add(5, Field.of("quantity")).as("totalCost")  // Calculate 'totalCost'
   *   );
   * ```
   *
   * @param fields The fields to add to the documents, specified as {@link Selectable}s.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  addFields(...fields: Selectable[]): Pipeline {
    const copy = this.stages.map(s => s);
    copy.push(
      new AddFields(
        this.readUserData('addFields', this.selectablesToMap(fields))
      )
    );
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Selects or creates a set of fields from the outputs of previous stages.
   *
   * <p>The selected fields are defined using {@link Selectable} expressions, which can be:
   *
   * <ul>
   *   <li>{@code string}: Name of an existing field</li>
   *   <li>{@link Field}: References an existing field.</li>
   *   <li>{@link Function}: Represents the result of a function with an assigned alias name using
   *       {@link Expr#as}</li>
   * </ul>
   *
   * <p>If no selections are provided, the output of this stage is empty. Use {@link
   * com.google.cloud.firestore.Pipeline#addFields} instead if only additions are
   * desired.
   *
   * <p>Example:
   *
   * ```typescript
   * firestore.pipeline().collection("books")
   *   .select(
   *     "firstName",
   *     Field.of("lastName"),
   *     Field.of("address").toUppercase().as("upperAddress"),
   *   );
   * ```
   *
   * @param selections The fields to include in the output documents, specified as {@link
   *     Selectable} expressions or {@code string} values representing field names.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  select(...selections: Array<Selectable | string>): Pipeline {
    const copy = this.stages.map(s => s);
    let projections: Map<string, Expr> = this.selectablesToMap(selections);
    projections = this.readUserData('select', projections);
    copy.push(new Select(projections));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  protected selectablesToMap(
    selectables: Array<Selectable | string>
  ): Map<string, Expr> {
    const result = new Map<string, Expr>();
    for (const selectable of selectables) {
      if (typeof selectable === 'string') {
        result.set(selectable as string, Field.of(selectable));
      } else if (selectable instanceof Field) {
        result.set((selectable as Field).fieldName(), selectable);
      } else if (selectable instanceof Fields) {
        const fields = selectable as Fields;
        for (const field of fields.fieldList()) {
          result.set(field.fieldName(), field);
        }
      } else if (selectable instanceof ExprWithAlias) {
        const expr = selectable as ExprWithAlias<Expr>;
        result.set(expr.alias, expr.expr);
      }
    }
    return result;
  }

  /**
   * Reads user data for each expression in the expressionMap.
   * @param name Name of the calling function. Used for error messages when invalid user data is encountered.
   * @param expressionMap
   * @return the expressionMap argument.
   * @private
   */
  protected readUserData<
    T extends
      | Map<string, ReadableUserData>
      | ReadableUserData[]
      | ReadableUserData
  >(name: string, expressionMap: T): T {
    if (isReadableUserData(expressionMap)) {
      expressionMap._readUserData(this.userDataReader);
    } else if (Array.isArray(expressionMap)) {
      expressionMap.forEach(readableData =>
        readableData._readUserData(this.userDataReader)
      );
    } else {
      expressionMap.forEach(expr => expr._readUserData(this.userDataReader));
    }
    return expressionMap;
  }

  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param stages
   * @protected
   */
  protected newPipeline(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    stages: Stage[],
    converter: unknown = {}
  ): Pipeline {
    return new Pipeline(db, userDataReader, userDataWriter, stages);
  }

  /**
   * Filters the documents from previous stages to only include those matching the specified {@link
   * FilterCondition}.
   *
   * <p>This stage allows you to apply conditions to the data, similar to a "WHERE" clause in SQL.
   * You can filter documents based on their field values, using implementations of {@link
   * FilterCondition}, typically including but not limited to:
   *
   * <ul>
   *   <li>field comparators: {@link Function#eq}, {@link Function#lt} (less than), {@link
   *       Function#gt} (greater than), etc.</li>
   *   <li>logical operators: {@link Function#and}, {@link Function#or}, {@link Function#not}, etc.</li>
   *   <li>advanced functions: {@link Function#regexMatch}, {@link
   *       Function#arrayContains}, etc.</li>
   * </ul>
   *
   * <p>Example:
   *
   * ```typescript
   * firestore.pipeline().collection("books")
   *   .where(
   *     and(
   *         gt(Field.of("rating"), 4.0),   // Filter for ratings greater than 4.0
   *         Field.of("genre").eq("Science Fiction") // Equivalent to gt("genre", "Science Fiction")
   *     )
   *   );
   * ```
   *
   * @param condition The {@link FilterCondition} to apply.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  where(condition: FilterCondition): Pipeline {
    const copy = this.stages.map(s => s);
    this.readUserData('where', condition);
    copy.push(new Where(condition));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Skips the first `offset` number of documents from the results of previous stages.
   *
   * <p>This stage is useful for implementing pagination in your pipelines, allowing you to retrieve
   * results in chunks. It is typically used in conjunction with {@link #limit} to control the
   * size of each page.
   *
   * <p>Example:
   *
   * ```typescript
   * // Retrieve the second page of 20 results
   * firestore.pipeline().collection("books")
   *     .sort(Field.of("published").descending())
   *     .offset(20)  // Skip the first 20 results
   *     .limit(20);   // Take the next 20 results
   * ```
   *
   * @param offset The number of documents to skip.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  offset(offset: number): Pipeline {
    const copy = this.stages.map(s => s);
    copy.push(new Offset(offset));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Limits the maximum number of documents returned by previous stages to `limit`.
   *
   * <p>This stage is particularly useful when you want to retrieve a controlled subset of data from
   * a potentially large result set. It's often used for:
   *
   * <ul>
   *   <li>**Pagination:** In combination with {@link #offset} to retrieve specific pages of
   *       results.</li>
   *   <li>**Limiting Data Retrieval:** To prevent excessive data transfer and improve performance,
   *       especially when dealing with large collections.</li>
   * </ul>
   *
   * <p>Example:
   *
   * ```typescript
   * // Limit the results to the top 10 highest-rated books
   * firestore.pipeline().collection("books")
   *     .sort(Field.of("rating").descending())
   *     .limit(10);
   * ```
   *
   * @param limit The maximum number of documents to return.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  limit(limit: number): Pipeline {
    const copy = this.stages.map(s => s);
    copy.push(new Limit(limit));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  _limit(limit: number, convertedFromLimitTolast: boolean): Pipeline {
    const copy = this.stages.map(s => s);
    copy.push(new Limit(limit, convertedFromLimitTolast));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Returns a set of distinct {@link Expr} values from the inputs to this stage.
   *
   * <p>This stage run through the results from previous stages to include only results with unique
   * combinations of {@link Expr} values ({@link Field}, {@link Function}, etc).
   *
   * <p>The parameters to this stage are defined using {@link Selectable} expressions or {@code string}s:
   *
   * <ul>
   *   <li>{@code string}: Name of an existing field</li>
   *   <li>{@link Field}: References an existing document field.</li>
   *   <li>{@link Function}: Represents the result of a function with an assigned alias name using
   *       {@link Expr#as}</li>
   * </ul>
   *
   * <p>Example:
   *
   * ```typescript
   * // Get a list of unique author names in uppercase and genre combinations.
   * firestore.pipeline().collection("books")
   *     .distinct(toUppercase(Field.of("author")).as("authorName"), Field.of("genre"), "publishedAt")
   *     .select("authorName");
   * ```
   *
   * @param selectables The {@link Selectable} expressions to consider when determining distinct
   *     value combinations or {@code string}s representing field names.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  distinct(...groups: Array<string | Selectable>): Pipeline {
    const copy = this.stages.map(s => s);
    copy.push(
      new Distinct(
        this.readUserData('distinct', this.selectablesToMap(groups || []))
      )
    );
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Performs aggregation operations on the documents from previous stages.
   *
   * <p>This stage allows you to calculate aggregate values over a set of documents. You define the
   * aggregations to perform using {@link AccumulatorTarget} expressions which are typically results of
   * calling {@link Expr#as} on {@link Accumulator} instances.
   *
   * <p>Example:
   *
   * ```typescript
   * // Calculate the average rating and the total number of books
   * firestore.pipeline().collection("books")
   *     .aggregate(
   *         Field.of("rating").avg().as("averageRating"),
   *         countAll().as("totalBooks")
   *     );
   * ```
   *
   * @param accumulators The {@link AccumulatorTarget} expressions, each wrapping an {@link Accumulator}
   *     and provide a name for the accumulated results.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  aggregate(...accumulators: AccumulatorTarget[]): Pipeline;
  /**
   * Performs optionally grouped aggregation operations on the documents from previous stages.
   *
   * <p>This stage allows you to calculate aggregate values over a set of documents, optionally
   * grouped by one or more fields or functions. You can specify:
   *
   * <ul>
   *   <li>**Grouping Fields or Functions:** One or more fields or functions to group the documents
   *       by. For each distinct combination of values in these fields, a separate group is created.
   *       If no grouping fields are provided, a single group containing all documents is used. Not
   *       specifying groups is the same as putting the entire inputs into one group.</li>
   *   <li>**Accumulators:** One or more accumulation operations to perform within each group. These
   *       are defined using {@link AccumulatorTarget} expressions, which are typically created by
   *       calling {@link Expr#as} on {@link Accumulator} instances. Each aggregation
   *       calculates a value (e.g., sum, average, count) based on the documents within its group.</li>
   * </ul>
   *
   * <p>Example:
   *
   * ```typescript
   * // Calculate the average rating for each genre.
   * firestore.pipeline().collection("books")
   *   .aggregate({
   *       accumulators: [avg(Field.of("rating")).as("avg_rating")]
   *       groups: ["genre"]
   *       });
   * ```
   *
   * @param aggregate An {@link Aggregate} object that specifies the grouping fields (if any) and
   *     the aggregation operations to perform.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  aggregate(options: {
    accumulators: AccumulatorTarget[];
    groups?: Array<string | Selectable>;
  }): Pipeline;
  aggregate(
    optionsOrTarget:
      | AccumulatorTarget
      | {
          accumulators: AccumulatorTarget[];
          groups?: Array<string | Selectable>;
        },
    ...rest: AccumulatorTarget[]
  ): Pipeline {
    const copy = this.stages.map(s => s);
    if ('accumulators' in optionsOrTarget) {
      copy.push(
        new Aggregate(
          new Map<string, Accumulator>(
            optionsOrTarget.accumulators.map((target: AccumulatorTarget) => [
              (target as unknown as AccumulatorTarget).alias,
              this.readUserData(
                'aggregate',
                (target as unknown as AccumulatorTarget).expr
              )
            ])
          ),
          this.readUserData(
            'aggregate',
            this.selectablesToMap(optionsOrTarget.groups || [])
          )
        )
      );
    } else {
      copy.push(
        new Aggregate(
          new Map<string, Accumulator>(
            [optionsOrTarget, ...rest].map(target => [
              (target as unknown as AccumulatorTarget).alias,
              this.readUserData(
                'aggregate',
                (target as unknown as AccumulatorTarget).expr
              )
            ])
          ),
          new Map<string, Expr>()
        )
      );
    }
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  findNearest(options: FindNearestOptions): Pipeline {
    const copy = this.stages.map(s => s);
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'findNearest'
    );
    const value = parseVectorValue(options.vectorValue, parseContext);
    const vectorObjectValue = new ObjectValue(value);
    copy.push(
      new FindNearest(
        options.field,
        vectorObjectValue,
        options.distanceMeasure,
        options.limit,
        options.distanceField
      )
    );
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Sorts the documents from previous stages based on one or more {@link Ordering} criteria.
   *
   * <p>This stage allows you to order the results of your pipeline. You can specify multiple {@link
   * Ordering} instances to sort by multiple fields in ascending or descending order. If documents
   * have the same value for a field used for sorting, the next specified ordering will be used. If
   * all orderings result in equal comparison, the documents are considered equal and the order is
   * unspecified.
   *
   * <p>Example:
   *
   * ```typescript
   * // Sort books by rating in descending order, and then by title in ascending order for books
   * // with the same rating
   * firestore.pipeline().collection("books")
   *     .sort(
   *         Ordering.of(Field.of("rating")).descending(),
   *         Ordering.of(Field.of("title"))  // Ascending order is the default
   *     );
   * ```
   *
   * @param orders One or more {@link Ordering} instances specifying the sorting criteria.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sort(...orderings: Ordering[]): Pipeline;
  sort(
    optionsOrOrderings:
      | Ordering
      | {
          orderings: Ordering[];
        },
    ...rest: Ordering[]
  ): Pipeline {
    const copy = this.stages.map(s => s);
    // Option object
    if ('orderings' in optionsOrOrderings) {
      copy.push(
        new Sort(
          this.readUserData(
            'sort',
            this.readUserData('sort', optionsOrOrderings.orderings)
          )
        )
      );
    } else {
      // Ordering object
      copy.push(
        new Sort(this.readUserData('sort', [optionsOrOrderings, ...rest]))
      );
    }

    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Adds a generic stage to the pipeline.
   *
   * <p>This method provides a flexible way to extend the pipeline's functionality by adding custom
   * stages. Each generic stage is defined by a unique `name` and a set of `params` that control its
   * behavior.
   *
   * <p>Example (Assuming there is no "where" stage available in SDK):
   *
   * ```typescript
   * // Assume we don't have a built-in "where" stage
   * firestore.pipeline().collection("books")
   *     .genericStage("where", [Field.of("published").lt(1900)]) // Custom "where" stage
   *     .select("title", "author");
   * ```
   *
   * @param name The unique name of the generic stage to add.
   * @param params A list of parameters to configure the generic stage's behavior.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  genericStage(name: string, params: any[]): Pipeline {
    const copy = this.stages.map(s => s);
    params.forEach(param => {
      if (isReadableUserData(param)) {
        param._readUserData(this.userDataReader);
      }
    });
    copy.push(new GenericStage(name, params));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  /**
   * Executes this pipeline and returns a Promise to represent the asynchronous operation.
   *
   * <p>The returned Promise can be used to track the progress of the pipeline execution
   * and retrieve the results (or handle any errors) asynchronously.
   *
   * <p>The pipeline results are returned as a list of {@link PipelineResult} objects. Each {@link
   * PipelineResult} typically represents a single key/value map that has passed through all the
   * stages of the pipeline, however this might differ depending on the stages involved in the
   * pipeline. For example:
   *
   * <ul>
   *   <li>If there are no stages or only transformation stages, each {@link PipelineResult}
   *       represents a single document.</li>
   *   <li>If there is an aggregation, only a single {@link PipelineResult} is returned,
   *       representing the aggregated results over the entire dataset .</li>
   *   <li>If there is an aggregation stage with grouping, each {@link PipelineResult} represents a
   *       distinct group and its associated aggregated values.</li>
   * </ul>
   *
   * <p>Example:
   *
   * ```typescript
   * const futureResults = await firestore.pipeline().collection("books")
   *     .where(gt(Field.of("rating"), 4.5))
   *     .select("title", "author", "rating")
   *     .execute();
   * ```
   *
   * @return A Promise representing the asynchronous pipeline execution.
   */
  execute(): Promise<PipelineResult[]> {
    const datastore = getDatastore(this._db);
    return invokeExecutePipeline(datastore, this).then(result => {
      const docs = result
        // Currently ignore any response from ExecutePipeline that does
        // not contain any document data in the `fields` property.
        .filter(element => !!element.fields)
        .map(
          element =>
            new PipelineResult(
              this._userDataWriter,
              element.key?.path
                ? new DocumentReference(this._db, null, element.key)
                : undefined,
              element.fields,
              element.executionTime?.toTimestamp(),
              element.createTime?.toTimestamp(),
              element.updateTime?.toTimestamp()
            )
        );

      return docs;
    });
  }

  /**
   * @internal
   * @private
   */
  _toProto(jsonProtoSerializer: JsonProtoSerializer): ExecutePipelineRequest {
    return {
      database: getEncodedDatabaseId(jsonProtoSerializer),
      structuredPipeline: this._toStructuredPipeline(jsonProtoSerializer)
    };
  }

  /**
   * @internal
   * @private
   */
  _toStructuredPipeline(
    jsonProtoSerializer: JsonProtoSerializer
  ): StructuredPipeline {
    const stages: ProtoStage[] = this.stages.map(stage =>
      stage._toProto(jsonProtoSerializer)
    );
    return { pipeline: { stages } };
  }
}
