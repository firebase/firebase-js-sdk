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
  Pipeline as ProtoPipeline,
  Stage as ProtoStage
} from '../protos/firestore_proto_api';
import { JsonProtoSerializer, ProtoSerializable } from '../remote/serializer';
import { isPlainObject } from '../util/input_validation';

import { Firestore } from './database';
import {
  _mapValue,
  AggregateFunction,
  AggregateWithAlias,
  Constant,
  Expr,
  ExprWithAlias,
  Field,
  BooleanExpr,
  Ordering,
  Selectable,
  field
} from './expressions';
import {
  AddFields,
  Aggregate,
  Distinct,
  FindNearest,
  FindNearestOptions,
  GenericStage,
  Limit,
  Offset,
  RemoveFields,
  Replace,
  Select,
  Sort,
  Sample,
  Union,
  Unnest,
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
 * const results1 = await execute(db.pipeline()
 *     .collection("books")
 *     .select("title", "author", field("rating").as("bookRating")));
 *
 * // Example 2: Filter documents where 'genre' is "Science Fiction" and 'published' is after 1950
 * const results2 = await execute(db.pipeline()
 *     .collection("books")
 *     .where(and(field("genre").eq("Science Fiction"), field("published").gt(1950))));
 *
 * // Example 3: Calculate the average rating of books published after 1980
 * const results3 = await execute(db.pipeline()
 *     .collection("books")
 *     .where(field("published").gt(1980))
 *     .aggregate(avg(field("rating")).as("averageRating")));
 * ```
 */

/**
 * Base-class implementation
 */
export class Pipeline implements ProtoSerializable<ProtoPipeline> {
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
    private userDataReader: UserDataReader,
    /**
     * @internal
     * @private
     */
    public _userDataWriter: AbstractUserDataWriter,
    private stages: Stage[]
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
   *     field("rating").as("bookRating"), // Rename 'rating' to 'bookRating'
   *     add(5, field("quantity")).as("totalCost")  // Calculate 'totalCost'
   *   );
   * ```
   *
   * @param field The first field to add to the documents, specified as a {@link Selectable}.
   * @param additionalFields Optional additional fields to add to the documents, specified as {@link Selectable}s.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  addFields(field: Selectable, ...additionalFields: Selectable[]): Pipeline {
    return this._addStage(
      new AddFields(
        this.readUserData(
          'addFields',
          this.selectablesToMap([field, ...additionalFields])
        )
      )
    );
  }

  /**
   * Remove fields from outputs of previous stages.
   *
   * Example:
   *
   * ```typescript
   * firestore.pipeline().collection('books')
   *   // removes field 'rating' and 'cost' from the previous stage outputs.
   *   .removeFields(
   *     field('rating'),
   *     'cost'
   *   );
   * ```
   *
   * @param fieldValue The first field to remove.
   * @param additionalFields Optional additional fields to remove.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  removeFields(
    fieldValue: Field | string,
    ...additionalFields: Array<Field | string>
  ): Pipeline {
    const fieldExpressions = [fieldValue, ...additionalFields].map(f =>
      typeof f === 'string' ? field(f) : (f as Field)
    );
    this.readUserData('removeFields', fieldExpressions);
    return this._addStage(new RemoveFields(fieldExpressions));
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
   * Pipeline#addFields} instead if only additions are
   * desired.
   *
   * <p>Example:
   *
   * ```typescript
   * firestore.pipeline().collection("books")
   *   .select(
   *     "firstName",
   *     field("lastName"),
   *     field("address").toUppercase().as("upperAddress"),
   *   );
   * ```
   *
   * @param selection The first field to include in the output documents, specified as {@link
   *     Selectable} expression or string value representing the field name.
   * @param additionalSelections Optional additional fields to include in the output documents, specified as {@link
   *     Selectable} expressions or {@code string} values representing field names.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  select(
    selection: Selectable | string,
    ...additionalSelections: Array<Selectable | string>
  ): Pipeline {
    let projections: Map<string, Expr> = this.selectablesToMap([
      selection,
      ...additionalSelections
    ]);
    projections = this.readUserData('select', projections);
    return this._addStage(new Select(projections));
  }

  /**
   * Filters the documents from previous stages to only include those matching the specified {@link
   * BooleanExpr}.
   *
   * <p>This stage allows you to apply conditions to the data, similar to a "WHERE" clause in SQL.
   * You can filter documents based on their field values, using implementations of {@link
   * BooleanExpr}, typically including but not limited to:
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
   *         gt(field("rating"), 4.0),   // Filter for ratings greater than 4.0
   *         field("genre").eq("Science Fiction") // Equivalent to gt("genre", "Science Fiction")
   *     )
   *   );
   * ```
   *
   * @param condition The {@link BooleanExpr} to apply.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  where(condition: BooleanExpr): Pipeline {
    this.readUserData('where', condition);
    return this._addStage(new Where(condition));
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
   *     .sort(field("published").descending())
   *     .offset(20)  // Skip the first 20 results
   *     .limit(20);   // Take the next 20 results
   * ```
   *
   * @param offset The number of documents to skip.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  offset(offset: number): Pipeline {
    return this._addStage(new Offset(offset));
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
   *     .sort(field("rating").descending())
   *     .limit(10);
   * ```
   *
   * @param limit The maximum number of documents to return.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  limit(limit: number): Pipeline {
    return this._addStage(new Limit(limit));
  }

  /**
   * Internal use only.
   * Helper to add a limit stage when converting from a Query.
   *
   * @internal
   * @private
   *
   * @param limit
   * @param convertedFromLimitTolast
   */
  _limit(limit: number, convertedFromLimitTolast: boolean): Pipeline {
    return this._addStage(new Limit(limit, convertedFromLimitTolast));
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
   *     .distinct(toUppercase(field("author")).as("authorName"), field("genre"), "publishedAt")
   *     .select("authorName");
   * ```
   *
   * @param group The first {@link Selectable} expression to consider when determining distinct
   *     value combinations or strings representing field names.
   * @param additionalGroups Optional additional {@link Selectable} expressions to consider when determining distinct
   *     value combinations or strings representing field names.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  distinct(
    group: string | Selectable,
    ...additionalGroups: Array<string | Selectable>
  ): Pipeline {
    return this._addStage(
      new Distinct(
        this.readUserData(
          'distinct',
          this.selectablesToMap([group, ...additionalGroups])
        )
      )
    );
  }

  /**
   * Performs aggregation operations on the documents from previous stages.
   *
   * <p>This stage allows you to calculate aggregate values over a set of documents. You define the
   * aggregations to perform using {@link AggregateWithAlias} expressions which are typically results of
   * calling {@link Expr#as} on {@link AggregateFunction} instances.
   *
   * <p>Example:
   *
   * ```typescript
   * // Calculate the average rating and the total number of books
   * firestore.pipeline().collection("books")
   *     .aggregate(
   *         field("rating").avg().as("averageRating"),
   *         countAll().as("totalBooks")
   *     );
   * ```
   *
   * @param accumulator The first {@link AggregateWithAlias}, wrapping an {@link AggregateFunction}
   *     and provide a name for the accumulated results.
   * @param additionalAccumulators Optional additional {@link AggregateWithAlias}, each wrapping an {@link AggregateFunction}
   *     and provide a name for the accumulated results.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  aggregate(
    accumulator: AggregateWithAlias,
    ...additionalAccumulators: AggregateWithAlias[]
  ): Pipeline;
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
   *       are defined using {@link AggregateWithAlias} expressions, which are typically created by
   *       calling {@link Expr#as} on {@link AggregateFunction} instances. Each aggregation
   *       calculates a value (e.g., sum, average, count) based on the documents within its group.</li>
   * </ul>
   *
   * <p>Example:
   *
   * ```typescript
   * // Calculate the average rating for each genre.
   * firestore.pipeline().collection("books")
   *   .aggregate({
   *       accumulators: [avg(field("rating")).as("avg_rating")]
   *       groups: ["genre"]
   *       });
   * ```
   *
   * @param options An object that specifies the accumulators
   * and optional grouping fields to perform.
   * @return A new {@code Pipeline} object with this stage appended to the stage
   * list.
   */
  aggregate(options: {
    accumulators: AggregateWithAlias[];
    groups?: Array<string | Selectable>;
  }): Pipeline;
  aggregate(
    optionsOrTarget:
      | AggregateWithAlias
      | {
          accumulators: AggregateWithAlias[];
          groups?: Array<string | Selectable>;
        },
    ...rest: AggregateWithAlias[]
  ): Pipeline {
    if ('accumulators' in optionsOrTarget) {
      return this._addStage(
        new Aggregate(
          new Map<string, AggregateFunction>(
            optionsOrTarget.accumulators.map((target: AggregateWithAlias) => [
              (target as unknown as AggregateWithAlias).alias,
              this.readUserData(
                'aggregate',
                (target as unknown as AggregateWithAlias).aggregate
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
      return this._addStage(
        new Aggregate(
          new Map<string, AggregateFunction>(
            [optionsOrTarget, ...rest].map(target => [
              (target as unknown as AggregateWithAlias).alias,
              this.readUserData(
                'aggregate',
                (target as unknown as AggregateWithAlias).aggregate
              )
            ])
          ),
          new Map<string, Expr>()
        )
      );
    }
  }

  findNearest(options: FindNearestOptions): Pipeline {
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'findNearest'
    );
    const value = parseVectorValue(options.vectorValue, parseContext);
    const vectorObjectValue = new ObjectValue(value);
    return this._addStage(
      new FindNearest(
        options.field,
        vectorObjectValue,
        options.distanceMeasure,
        options.limit,
        options.distanceField
      )
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
   *         Ordering.of(field("rating")).descending(),
   *         Ordering.of(field("title"))  // Ascending order is the default
   *     );
   * ```
   *
   * @param ordering The first {@link Ordering} instance specifying the sorting criteria.
   * @param additionalOrderings Optional additional {@link Ordering} instances specifying the additional sorting criteria.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sort(ordering: Ordering, ...additionalOrderings: Ordering[]): Pipeline;
  sort(
    optionsOrOrderings:
      | Ordering
      | {
          orderings: Ordering[];
        },
    ...rest: Ordering[]
  ): Pipeline {
    // Option object
    if (optionsOrOrderings && 'orderings' in optionsOrOrderings) {
      return this._addStage(
        new Sort(
          this.readUserData(
            'sort',
            this.readUserData('sort', optionsOrOrderings.orderings)
          )
        )
      );
    } else {
      // Ordering object
      return this._addStage(
        new Sort(this.readUserData('sort', [optionsOrOrderings, ...rest]))
      );
    }
  }

  /**
   * Fully overwrites all fields in a document with those coming from a nested map.
   *
   * <p>This stage allows you to emit a map value as a document. Each key of the map becomes a field
   * on the document that contains the corresponding value.
   *
   * <p>Example:
   *
   * ```typescript
   * // Input.
   * // {
   * //  'name': 'John Doe Jr.',
   * //  'parents': {
   * //    'father': 'John Doe Sr.',
   * //    'mother': 'Jane Doe'
   * //   }
   * // }
   *
   * // Emit parents as document.
   * firestore.pipeline().collection('people').replaceWith(field('parents'));
   *
   * // Output
   * // {
   * //  'father': 'John Doe Sr.',
   * //  'mother': 'Jane Doe'
   * // }
   * ```
   *
   * @param field The {@link Field} field containing the nested map.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  replaceWith(fieldValue: Field | string): Pipeline {
    const fieldExpr =
      typeof fieldValue === 'string' ? field(fieldValue) : fieldValue;
    return this._addStage(new Replace(fieldExpr, 'full_replace'));
  }

  /**
   * Performs a pseudo-random sampling of the documents from the previous stage.
   *
   * <p>This stage will filter documents pseudo-randomly. The parameter specifies how number of
   * documents to be returned.
   *
   * <p>Examples:
   *
   * ```typescript
   * // Sample 25 books, if available.
   * firestore.pipeline().collection('books')
   *     .sample(25);
   * ```
   *
   * @param documents The number of documents to sample..
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sample(documents: number): Pipeline;

  /**
   * Performs a pseudo-random sampling of the documents from the previous stage.
   *
   * <p>This stage will filter documents pseudo-randomly. The 'options' parameter specifies how
   * sampling will be performed. See {@code SampleOptions} for more information.
   *
   * <p>Examples:
   *
   * // Sample 10 books, if available.
   * firestore.pipeline().collection("books")
   *     .sample({ documents: 10 });
   *
   * // Sample 50% of books.
   * firestore.pipeline().collection("books")
   *     .sample({ percentage: 0.5 });
   * }
   * </pre>
   *
   * @param options The {@code SampleOptions} specifies how sampling is performed.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sample(options: { percentage: number } | { documents: number }): Pipeline;
  sample(
    documentsOrOptions: number | { percentage: number } | { documents: number }
  ): Pipeline {
    if (typeof documentsOrOptions === 'number') {
      return this._addStage(new Sample(documentsOrOptions, 'documents'));
    } else if ('percentage' in documentsOrOptions) {
      return this._addStage(
        new Sample(documentsOrOptions.percentage, 'percent')
      );
    } else {
      return this._addStage(
        new Sample(documentsOrOptions.documents, 'documents')
      );
    }
  }

  /**
   * Performs union of all documents from two pipelines, including duplicates.
   *
   * <p>This stage will pass through documents from previous stage, and also pass through documents
   * from previous stage of the `other` {@code Pipeline} given in parameter. The order of documents
   * emitted from this stage is undefined.
   *
   * <p>Example:
   *
   * ```typescript
   * // Emit documents from books collection and magazines collection.
   * firestore.pipeline().collection('books')
   *     .union(firestore.pipeline().collection('magazines'));
   * ```
   *
   * @param other The other {@code Pipeline} that is part of union.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  union(other: Pipeline): Pipeline {
    return this._addStage(new Union(other));
  }

  /**
   * Produces a document for each element in array found in previous stage document.
   *
   * For each previous stage document, this stage will emit zero or more augmented documents. The
   * input array found in the previous stage document field specified by the `selectable` parameter,
   * will emit an augmented document for each input array element. The input array element will
   * augment the previous stage document by setting the `alias` field  with the array element value.
   *
   * When `selectable` evaluates to a non-array value (ex: number, null, absent), then the stage becomes a no-op for
   * the current input document, returning it as is with the `alias` field absent.
   *
   * No documents are emitted when `selectable` evaluates to an empty array.
   *
   * Example:
   *
   * ```typescript
   * // Input:
   * // { "title": "The Hitchhiker's Guide to the Galaxy", "tags": [ "comedy", "space", "adventure" ], ... }
   *
   * // Emit a book document for each tag of the book.
   * firestore.pipeline().collection("books")
   *     .unnest(field("tags").as('tag'), 'tagIndex');
   *
   * // Output:
   * // { "title": "The Hitchhiker's Guide to the Galaxy", "tag": "comedy", "tagIndex": 0, ... }
   * // { "title": "The Hitchhiker's Guide to the Galaxy", "tag": "space", "tagIndex": 1, ... }
   * // { "title": "The Hitchhiker's Guide to the Galaxy", "tag": "adventure", "tagIndex": 2, ... }
   * ```
   *
   * @param selectable A selectable expression defining the field to unnest and the alias to use for each unnested element in the output documents.
   * @param indexField An optional string value specifying the field path to write the offset (starting at zero) into the array the unnested element is from
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  unnest(selectable: Selectable, indexField?: string): Pipeline {
    this.readUserData('unnest', selectable.expr);

    const alias = field(selectable.alias);
    this.readUserData('unnest', alias);

    return this._addStage(new Unnest(selectable.expr, alias, indexField));
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
   *     .genericStage("where", [field("published").lt(1900)]) // Custom "where" stage
   *     .select("title", "author");
   * ```
   *
   * @param name The unique name of the generic stage to add.
   * @param params A list of parameters to configure the generic stage's behavior.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  genericStage(name: string, params: any[]): Pipeline {
    // Convert input values to Expressions.
    // We treat objects as mapValues and arrays as arrayValues,
    // this is unlike the default conversion for objects and arrays
    // passed to an expression.
    const expressionParams = params.map((value: any) => {
      if (value instanceof Expr) {
        return value;
      }
      if (value instanceof AggregateFunction) {
        return value;
      } else if (isPlainObject(value)) {
        return _mapValue(value);
      } else {
        return Constant.of(value);
      }
    });

    expressionParams.forEach(param => {
      if (isReadableUserData(param)) {
        param._readUserData(this.userDataReader);
      }
    });
    return this._addStage(new GenericStage(name, expressionParams));
  }

  /**
   * @internal
   * @private
   */
  _toProto(jsonProtoSerializer: JsonProtoSerializer): ProtoPipeline {
    const stages: ProtoStage[] = this.stages.map(stage =>
      stage._toProto(jsonProtoSerializer)
    );
    return { stages };
  }

  private _addStage(stage: Stage): Pipeline {
    const copy = this.stages.map(s => s);
    copy.push(stage);
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  private selectablesToMap(
    selectables: Array<Selectable | string>
  ): Map<string, Expr> {
    const result = new Map<string, Expr>();
    for (const selectable of selectables) {
      if (typeof selectable === 'string') {
        result.set(selectable as string, field(selectable));
      } else if (selectable instanceof Field) {
        result.set((selectable as Field).fieldName(), selectable);
      } else if (selectable instanceof ExprWithAlias) {
        const expr = selectable as ExprWithAlias;
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
  private readUserData<
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
    stages: Stage[]
  ): Pipeline {
    return new Pipeline(db, userDataReader, userDataWriter, stages);
  }
}
