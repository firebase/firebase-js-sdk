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

import {
  Pipeline as ProtoPipeline,
  Stage as ProtoStage
} from '../protos/firestore_proto_api';
import { JsonProtoSerializer, ProtoSerializable } from '../remote/serializer';
import { isPlainObject } from '../util/input_validation';
import {
  aliasedAggregateToMap,
  fieldOrExpression,
  selectablesToMap,
  vectorToExpr
} from '../util/pipeline_util';
import { isNumber, isString } from '../util/types';

import { Firestore } from './database';
import {
  _mapValue,
  AggregateFunction,
  AliasedAggregate,
  BooleanExpression,
  _constant,
  Expression,
  Field,
  field,
  Ordering,
  Selectable,
  _field,
  isSelectable,
  isField,
  isBooleanExpr,
  isAliasedAggregate,
  toField,
  isOrdering,
  isExpr
} from './expressions';
import {
  AddFields,
  Aggregate,
  Distinct,
  FindNearest,
  RawStage,
  Limit,
  Offset,
  RemoveFields,
  Replace,
  Sample,
  Select,
  Sort,
  Stage,
  Union,
  Unnest,
  Where
} from './stage';
import {
  AddFieldsStageOptions,
  AggregateStageOptions,
  DistinctStageOptions,
  FindNearestStageOptions,
  LimitStageOptions,
  OffsetStageOptions,
  RemoveFieldsStageOptions,
  ReplaceWithStageOptions,
  SampleStageOptions,
  SelectStageOptions,
  SortStageOptions,
  StageOptions,
  UnionStageOptions,
  UnnestStageOptions,
  WhereStageOptions
} from './stage_options';
import { UserDataReader, UserDataSource } from './user_data_reader';
import { AbstractUserDataWriter } from './user_data_writer';

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
    /**
     * @internal
     * @private
     */
    private userDataReader: UserDataReader,
    /**
     * @internal
     * @private
     */
    public _userDataWriter: AbstractUserDataWriter,
    /**
     * @internal
     * @private
     */
    private stages: Stage[]
  ) {}

  /**
   * @beta
   * Adds new fields to outputs from previous stages.
   *
   * This stage allows you to compute values on-the-fly based on existing data from previous
   * stages or constants. You can use this to create new fields or overwrite existing ones (if there
   * is name overlaps).
   *
   * The added fields are defined using {@link Selectable}s, which can be:
   *
   * - {@link Field}: References an existing document field.
   * - {@link Expression}: Either a literal value (see {@link Constant}) or a computed value
   *   (see {@FunctionExpr}) with an assigned alias using {@link Expression#as}.
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
  addFields(field: Selectable, ...additionalFields: Selectable[]): Pipeline;
  /**
   * @beta
   * Adds new fields to outputs from previous stages.
   *
   * This stage allows you to compute values on-the-fly based on existing data from previous
   * stages or constants. You can use this to create new fields or overwrite existing ones (if there
   * is name overlaps).
   *
   * The added fields are defined using {@link Selectable}s, which can be:
   *
   * - {@link Field}: References an existing document field.
   * - {@link Expression}: Either a literal value (see {@link Constant}) or a computed value
   *   (see {@FunctionExpr}) with an assigned alias using {@link Expression#as}.
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  addFields(options: AddFieldsStageOptions): Pipeline;
  addFields(
    fieldOrOptions: Selectable | AddFieldsStageOptions,
    ...additionalFields: Selectable[]
  ): Pipeline {
    // Process argument union(s) from method overloads
    let fields: Selectable[];
    let options: {};
    if (isSelectable(fieldOrOptions)) {
      fields = [fieldOrOptions, ...additionalFields];
      options = {};
    } else {
      ({ fields, ...options } = fieldOrOptions);
    }

    // Convert user land convenience types to internal types
    const normalizedFields: Map<string, Expression> = selectablesToMap(fields);

    // Create stage object
    const stage = new AddFields(normalizedFields, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'addFields'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
  ): Pipeline;
  /**
   * @beta
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  removeFields(options: RemoveFieldsStageOptions): Pipeline;
  removeFields(
    fieldValueOrOptions: Field | string | RemoveFieldsStageOptions,
    ...additionalFields: Array<Field | string>
  ): Pipeline {
    // Process argument union(s) from method overloads
    const options =
      isField(fieldValueOrOptions) || isString(fieldValueOrOptions)
        ? {}
        : fieldValueOrOptions;
    const fields: Array<Field | string> =
      isField(fieldValueOrOptions) || isString(fieldValueOrOptions)
        ? [fieldValueOrOptions, ...additionalFields]
        : fieldValueOrOptions.fields;

    // Convert user land convenience types to internal types
    const convertedFields: Field[] = fields.map(f =>
      isString(f) ? field(f) : (f as Field)
    );

    // Create stage object
    const stage = new RemoveFields(convertedFields, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    stage._readUserData(
      this.userDataReader.createContext(UserDataSource.Argument, 'removeFields')
    );

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Selects or creates a set of fields from the outputs of previous stages.
   *
   * <p>The selected fields are defined using {@link Selectable} expressions, which can be:
   *
   * <ul>
   *   <li>{@code string}: Name of an existing field</li>
   *   <li>{@link Field}: References an existing field.</li>
   *   <li>{@link Function}: Represents the result of a function with an assigned alias name using
   *       {@link Expression#as}</li>
   * </ul>
   *
   * <p>If no selections are provided, the output of this stage is empty. Use {@link
   * Pipeline#addFields} instead if only additions are
   * desired.
   *
   * <p>Example:
   *
   * ```typescript
   * db.pipeline().collection("books")
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
  ): Pipeline;
  /**
   * @beta
   * Selects or creates a set of fields from the outputs of previous stages.
   *
   * <p>The selected fields are defined using {@link Selectable} expressions, which can be:
   *
   * <ul>
   *   <li>{@code string}: Name of an existing field</li>
   *   <li>{@link Field}: References an existing field.</li>
   *   <li>{@link Function}: Represents the result of a function with an assigned alias name using
   *       {@link Expression#as}</li>
   * </ul>
   *
   * <p>If no selections are provided, the output of this stage is empty. Use {@link
   * Pipeline#addFields} instead if only additions are
   * desired.
   *
   * <p>Example:
   *
   * ```typescript
   * db.pipeline().collection("books")
   *   .select(
   *     "firstName",
   *     field("lastName"),
   *     field("address").toUppercase().as("upperAddress"),
   *   );
   * ```
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  select(options: SelectStageOptions): Pipeline;
  select(
    selectionOrOptions: Selectable | string | SelectStageOptions,
    ...additionalSelections: Array<Selectable | string>
  ): Pipeline {
    // Process argument union(s) from method overloads
    const options =
      isSelectable(selectionOrOptions) || isString(selectionOrOptions)
        ? {}
        : selectionOrOptions;

    const selections: Array<Selectable | string> =
      isSelectable(selectionOrOptions) || isString(selectionOrOptions)
        ? [selectionOrOptions, ...additionalSelections]
        : selectionOrOptions.selections;

    // Convert user land convenience types to internal types
    const normalizedSelections: Map<string, Expression> =
      selectablesToMap(selections);

    // Create stage object
    const stage = new Select(normalizedSelections, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'select'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Filters the documents from previous stages to only include those matching the specified {@link
   * BooleanExpression}.
   *
   * <p>This stage allows you to apply conditions to the data, similar to a "WHERE" clause in SQL.
   * You can filter documents based on their field values, using implementations of {@link
   * BooleanExpression}, typically including but not limited to:
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
   * @param condition The {@link BooleanExpression} to apply.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  where(condition: BooleanExpression): Pipeline;
  /**
   * @beta
   * Filters the documents from previous stages to only include those matching the specified {@link
   * BooleanExpression}.
   *
   * <p>This stage allows you to apply conditions to the data, similar to a "WHERE" clause in SQL.
   * You can filter documents based on their field values, using implementations of {@link
   * BooleanExpression}, typically including but not limited to:
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  where(options: WhereStageOptions): Pipeline;
  where(conditionOrOptions: BooleanExpression | WhereStageOptions): Pipeline {
    // Process argument union(s) from method overloads
    const options = isBooleanExpr(conditionOrOptions) ? {} : conditionOrOptions;
    const condition: BooleanExpression = isBooleanExpr(conditionOrOptions)
      ? conditionOrOptions
      : conditionOrOptions.condition;

    // Create stage object
    const stage = new Where(condition, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'where'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
   * firestore.pipeline().collection('books')
   *     .sort(field('published').descending())
   *     .offset(20)  // Skip the first 20 results
   *     .limit(20);   // Take the next 20 results
   * ```
   *
   * @param offset The number of documents to skip.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  offset(offset: number): Pipeline;
  /**
   * @beta
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
   * firestore.pipeline().collection('books')
   *     .sort(field('published').descending())
   *     .offset(20)  // Skip the first 20 results
   *     .limit(20);   // Take the next 20 results
   * ```
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  offset(options: OffsetStageOptions): Pipeline;
  offset(offsetOrOptions: number | OffsetStageOptions): Pipeline {
    // Process argument union(s) from method overloads
    let options: {};
    let offset: number;
    if (isNumber(offsetOrOptions)) {
      options = {};
      offset = offsetOrOptions;
    } else {
      options = offsetOrOptions;
      offset = offsetOrOptions.offset;
    }

    // Create stage object
    const stage = new Offset(offset, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'offset'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
   * firestore.pipeline().collection('books')
   *     .sort(field('rating').descending())
   *     .limit(10);
   * ```
   *
   * @param limit The maximum number of documents to return.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  limit(limit: number): Pipeline;
  /**
   * @beta
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
   * firestore.pipeline().collection('books')
   *     .sort(field('rating').descending())
   *     .limit(10);
   * ```
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  limit(options: LimitStageOptions): Pipeline;
  limit(limitOrOptions: number | LimitStageOptions): Pipeline {
    // Process argument union(s) from method overloads
    const options = isNumber(limitOrOptions) ? {} : limitOrOptions;
    const limit: number = isNumber(limitOrOptions)
      ? limitOrOptions
      : limitOrOptions.limit;

    // Create stage object
    const stage = new Limit(limit, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'limit'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Returns a set of distinct values from the inputs to this stage.
   *
   * This stage runs through the results from previous stages to include only results with
   * unique combinations of {@link Expression} values ({@link Field}, {@link Function}, etc).
   *
   * The parameters to this stage are defined using {@link Selectable} expressions or strings:
   *
   * - {@code string}: Name of an existing field
   * - {@link Field}: References an existing document field.
   * - {@link AliasedExpr}: Represents the result of a function with an assigned alias name
   *   using {@link Expression#as}.
   *
   * Example:
   *
   * ```typescript
   * // Get a list of unique author names in uppercase and genre combinations.
   * firestore.pipeline().collection("books")
   *     .distinct(toUppercase(field("author")).as("authorName"), field("genre"), "publishedAt")
   *     .select("authorName");
   * ```
   *
   * @param group The {@link Selectable} expression or field name to consider when determining
   *     distinct value combinations.
   * @param additionalGroups Optional additional {@link Selectable} expressions to consider when determining distinct
   *     value combinations or strings representing field names.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  distinct(
    group: string | Selectable,
    ...additionalGroups: Array<string | Selectable>
  ): Pipeline;
  /**
   * @beta
   * Returns a set of distinct values from the inputs to this stage.
   *
   * This stage runs through the results from previous stages to include only results with
   * unique combinations of {@link Expression} values ({@link Field}, {@link Function}, etc).
   *
   * The parameters to this stage are defined using {@link Selectable} expressions or strings:
   *
   * - {@code string}: Name of an existing field
   * - {@link Field}: References an existing document field.
   * - {@link AliasedExpr}: Represents the result of a function with an assigned alias name
   *   using {@link Expression#as}.
   *
   * Example:
   *
   * ```typescript
   * // Get a list of unique author names in uppercase and genre combinations.
   * firestore.pipeline().collection("books")
   *     .distinct(toUppercase(field("author")).as("authorName"), field("genre"), "publishedAt")
   *     .select("authorName");
   * ```
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  distinct(options: DistinctStageOptions): Pipeline;
  distinct(
    groupOrOptions: string | Selectable | DistinctStageOptions,
    ...additionalGroups: Array<string | Selectable>
  ): Pipeline {
    // Process argument union(s) from method overloads
    const options =
      isString(groupOrOptions) || isSelectable(groupOrOptions)
        ? {}
        : groupOrOptions;
    const groups: Array<string | Selectable> =
      isString(groupOrOptions) || isSelectable(groupOrOptions)
        ? [groupOrOptions, ...additionalGroups]
        : groupOrOptions.groups;

    // Convert user land convenience types to internal types
    const convertedGroups: Map<string, Expression> = selectablesToMap(groups);

    // Create stage object
    const stage = new Distinct(convertedGroups, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'distinct'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Performs aggregation operations on the documents from previous stages.
   *
   * <p>This stage allows you to calculate aggregate values over a set of documents. You define the
   * aggregations to perform using {@link AliasedAggregate} expressions which are typically results of
   * calling {@link Expression#as} on {@link AggregateFunction} instances.
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
   * @param accumulator The first {@link AliasedAggregate}, wrapping an {@link AggregateFunction}
   *     and providing a name for the accumulated results.
   * @param additionalAccumulators Optional additional {@link AliasedAggregate}, each wrapping an {@link AggregateFunction}
   *     and providing a name for the accumulated results.
   * @return A new Pipeline object with this stage appended to the stage list.
   */
  aggregate(
    accumulator: AliasedAggregate,
    ...additionalAccumulators: AliasedAggregate[]
  ): Pipeline;
  /**
   * @beta
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
   *       are defined using {@link AliasedAggregate} expressions, which are typically created by
   *       calling {@link Expression#as} on {@link AggregateFunction} instances. Each aggregation
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage
   * list.
   */
  aggregate(options: AggregateStageOptions): Pipeline;
  aggregate(
    targetOrOptions: AliasedAggregate | AggregateStageOptions,
    ...rest: AliasedAggregate[]
  ): Pipeline {
    // Process argument union(s) from method overloads
    const options = isAliasedAggregate(targetOrOptions) ? {} : targetOrOptions;
    const accumulators: AliasedAggregate[] = isAliasedAggregate(targetOrOptions)
      ? [targetOrOptions, ...rest]
      : targetOrOptions.accumulators;
    const groups: Array<Selectable | string> = isAliasedAggregate(
      targetOrOptions
    )
      ? []
      : targetOrOptions.groups ?? [];

    // Convert user land convenience types to internal types
    const convertedAccumulators: Map<string, AggregateFunction> =
      aliasedAggregateToMap(accumulators);
    const convertedGroups: Map<string, Expression> = selectablesToMap(groups);

    // Create stage object
    const stage = new Aggregate(
      convertedGroups,
      convertedAccumulators,
      options
    );

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'aggregate'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Performs a vector proximity search on the documents from the previous stage, returning the
   * K-nearest documents based on the specified query `vectorValue` and `distanceMeasure`. The
   * returned documents will be sorted in order from nearest to furthest from the query `vectorValue`.
   *
   * <p>Example:
   *
   * ```typescript
   * // Find the 10 most similar books based on the book description.
   * const bookDescription = "Lorem ipsum...";
   * const queryVector: number[] = ...; // compute embedding of `bookDescription`
   *
   * firestore.pipeline().collection("books")
   *     .findNearest({
   *       field: 'embedding',
   *       vectorValue: queryVector,
   *       distanceMeasure: 'euclidean',
   *       limit: 10,                        // optional
   *       distanceField: 'computedDistance' // optional
   *     });
   * ```
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  findNearest(options: FindNearestStageOptions): Pipeline {
    // Convert user land convenience types to internal types
    const field = toField(options.field);
    const vectorValue = vectorToExpr(options.vectorValue);
    const distanceField = options.distanceField
      ? toField(options.distanceField)
      : undefined;
    const internalOptions = {
      distanceField,
      limit: options.limit,
      rawOptions: options.rawOptions
    };

    // Create stage object
    const stage = new FindNearest(
      vectorValue,
      field,
      options.distanceMeasure,
      internalOptions
    );

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'addFields'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
  /**
   * @beta
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sort(options: SortStageOptions): Pipeline;
  sort(
    orderingOrOptions: Ordering | SortStageOptions,
    ...additionalOrderings: Ordering[]
  ): Pipeline {
    // Process argument union(s) from method overloads
    const options = isOrdering(orderingOrOptions) ? {} : orderingOrOptions;
    const orderings: Ordering[] = isOrdering(orderingOrOptions)
      ? [orderingOrOptions, ...additionalOrderings]
      : orderingOrOptions.orderings;

    // Create stage object
    const stage = new Sort(orderings, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'sort'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
   * firestore.pipeline().collection('people').replaceWith('parents');
   *
   * // Output
   * // {
   * //  'father': 'John Doe Sr.',
   * //  'mother': 'Jane Doe'
   * // }
   * ```
   *
   * @param fieldName The {@link Field} field containing the nested map.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  replaceWith(fieldName: string): Pipeline;
  /**
   * @beta
   * Fully overwrites all fields in a document with those coming from a map.
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
   * firestore.pipeline().collection('people').replaceWith(map({
   *   foo: 'bar',
   *   info: {
   *     name: field('name')
   *   }
   * }));
   *
   * // Output
   * // {
   * //  'father': 'John Doe Sr.',
   * //  'mother': 'Jane Doe'
   * // }
   * ```
   *
   * @param expr An {@link Expression} that when returned evaluates to a map.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  replaceWith(expr: Expression): Pipeline;
  /**
   * @beta
   * Fully overwrites all fields in a document with those coming from a map.
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
   * firestore.pipeline().collection('people').replaceWith(map({
   *   foo: 'bar',
   *   info: {
   *     name: field('name')
   *   }
   * }));
   *
   * // Output
   * // {
   * //  'father': 'John Doe Sr.',
   * //  'mother': 'Jane Doe'
   * // }
   * ```
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  replaceWith(options: ReplaceWithStageOptions): Pipeline;
  replaceWith(
    valueOrOptions: Expression | string | ReplaceWithStageOptions
  ): Pipeline {
    // Process argument union(s) from method overloads
    const options =
      isString(valueOrOptions) || isExpr(valueOrOptions) ? {} : valueOrOptions;
    const fieldNameOrExpr: string | Expression =
      isString(valueOrOptions) || isExpr(valueOrOptions)
        ? valueOrOptions
        : valueOrOptions.map;

    // Convert user land convenience types to internal types
    const mapExpr = fieldOrExpression(fieldNameOrExpr);

    // Create stage object
    const stage = new Replace(mapExpr, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'replaceWith'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
   * @param documents The number of documents to sample.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sample(documents: number): Pipeline;

  /**
   * @beta
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
   *
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  sample(options: SampleStageOptions): Pipeline;
  sample(documentsOrOptions: number | SampleStageOptions): Pipeline {
    // Process argument union(s) from method overloads
    const options = isNumber(documentsOrOptions) ? {} : documentsOrOptions;
    let rate: number;
    let mode: 'documents' | 'percent';
    if (isNumber(documentsOrOptions)) {
      rate = documentsOrOptions;
      mode = 'documents';
    } else if (isNumber(documentsOrOptions.documents)) {
      rate = documentsOrOptions.documents;
      mode = 'documents';
    } else {
      rate = documentsOrOptions.percentage!;
      mode = 'percent';
    }

    // Create stage object
    const stage = new Sample(rate, mode, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'sample'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
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
  union(other: Pipeline): Pipeline;
  /**
   * @beta
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  union(options: UnionStageOptions): Pipeline;
  union(otherOrOptions: Pipeline | UnionStageOptions): Pipeline {
    // Process argument union(s) from method overloads
    let options: {};
    let otherPipeline: Pipeline;
    if (isPipeline(otherOrOptions)) {
      options = {};
      otherPipeline = otherOrOptions;
    } else {
      ({ other: otherPipeline, ...options } = otherOrOptions);
    }

    // Create stage object
    const stage = new Union(otherPipeline, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'union'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Produces a document for each element in an input array.
   *
   * For each previous stage document, this stage will emit zero or more augmented documents. The
   * input array specified by the `selectable` parameter, will emit an augmented document for each input array element. The input array element will
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
   * @param selectable A selectable expression defining the field to unnest and the alias to use for each un-nested element in the output documents.
   * @param indexField An optional string value specifying the field path to write the offset (starting at zero) into the array the un-nested element is from
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  unnest(selectable: Selectable, indexField?: string): Pipeline;
  /**
   * @beta
   * Produces a document for each element in an input array.
   *
   * For each previous stage document, this stage will emit zero or more augmented documents. The
   * input array specified by the `selectable` parameter, will emit an augmented document for each input array element. The input array element will
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
   * @param options - An object that specifies required and optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  unnest(options: UnnestStageOptions): Pipeline;
  unnest(
    selectableOrOptions: Selectable | UnnestStageOptions,
    indexField?: string
  ): Pipeline {
    // Process argument union(s) from method overloads
    let options: { indexField?: Field } & StageOptions;
    let selectable: Selectable;
    let indexFieldName: string | undefined;
    if (isSelectable(selectableOrOptions)) {
      options = {};
      selectable = selectableOrOptions;
      indexFieldName = indexField;
    } else {
      ({
        selectable,
        indexField: indexFieldName,
        ...options
      } = selectableOrOptions);
    }

    // Convert user land convenience types to internal types
    const alias = selectable.alias;
    const expr = selectable.expr as Expression;
    if (isString(indexFieldName)) {
      options.indexField = _field(indexFieldName, 'unnest');
    }

    // Create stage object
    const stage = new Unnest(alias, expr, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'unnest'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
  }

  /**
   * @beta
   * Adds a raw stage to the pipeline.
   *
   * <p>This method provides a flexible way to extend the pipeline's functionality by adding custom
   * stages. Each raw stage is defined by a unique `name` and a set of `params` that control its
   * behavior.
   *
   * <p>Example (Assuming there is no 'where' stage available in SDK):
   *
   * ```typescript
   * // Assume we don't have a built-in 'where' stage
   * firestore.pipeline().collection('books')
   *     .rawStage('where', [field('published').lt(1900)]) // Custom 'where' stage
   *     .select('title', 'author');
   * ```
   *
   * @param name - The unique name of the raw stage to add.
   * @param params - A list of parameters to configure the raw stage's behavior.
   * @param options - An object of key value pairs that specifies optional parameters for the stage.
   * @return A new {@code Pipeline} object with this stage appended to the stage list.
   */
  rawStage(
    name: string,
    params: unknown[],
    options?: { [key: string]: Expression | unknown }
  ): Pipeline {
    // Convert user land convenience types to internal types
    const expressionParams = params.map((value: unknown) => {
      if (value instanceof Expression) {
        return value;
      } else if (value instanceof AggregateFunction) {
        return value;
      } else if (isPlainObject(value)) {
        return _mapValue(value as Record<string, unknown>);
      } else {
        return _constant(value, 'rawStage');
      }
    });

    // Create stage object
    const stage = new RawStage(name, expressionParams, options ?? {});

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'rawStage'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._addStage(stage);
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

export function isPipeline(val: unknown): val is Pipeline {
  return val instanceof Pipeline;
}
