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

import { OneOf } from '../util/types';

import {
  AliasedAggregate,
  BooleanExpression,
  Expression,
  Field,
  Ordering,
  Selectable
} from './expressions';
import { Pipeline } from './pipeline';
import { CollectionReference, DocumentReference } from './reference';
import { VectorValue } from './vector_value';

/**
 * Options defining how a Stage is evaluated.
 */
// eslint-disable-next-line -- eslint should not convert this type to an interface
export type StageOptions = {
  /**
   * An escape hatch to set options not known at SDK build time. These values
   * will be passed directly to the Firestore backend and not used by the SDK.
   *
   * The option name will be used as provided. And must match the name
   * format used by the backend (hint: use a snake_case_name).
   *
   * Raw option values can be any type supported
   * by Firestore (for example: string, boolean, number, map, …). Value types
   * not known to the SDK will be rejected.
   *
   * Values specified in rawOptions will take precedence over any options
   * with the same name set by the SDK.
   *
   * `rawOptions` supports dot notation, if you want to override
   * a nested option.
   */
  rawOptions?: {
    [name: string]: unknown;
  };
};
/**
 * Options defining how a CollectionStage is evaluated. See {@link @firebase/firestore/pipelines#PipelineSource.(collection:1)}.
 */
export type CollectionStageOptions = StageOptions & {
  /**
   * Name or reference to the collection that will be used as the Pipeline source.
   */
  collection: string | CollectionReference;

  /**
   * Specifies the name of an index to be used for a query, overriding the query optimizer's default choice.
   * This can be useful for performance tuning in specific scenarios where the default index selection
   * does not yield optimal performance.
   *
   * @remarks This property is optional. When provided, it should be the exact name of the index to force.
   */
  forceIndex?: string;
};

/**
 * Defines the configuration options for a CollectionGroupStage within a pipeline.
 * This type extends {@link @firebase/firestore/pipelines#StageOptions} and provides specific settings for how a collection group
 * is identified and processed during pipeline execution.
 *
 * See {@link @firebase/firestore/pipelines#PipelineSource.(collectionGroup:1)} to create a collection group stage.
 */
export type CollectionGroupStageOptions = StageOptions & {
  /**
   * ID of the collection group to use as the Pipeline source.
   */
  collectionId: string;

  /**
   * Specifies the name of an index to be used for a query, overriding the query optimizer's default choice.
   * This can be useful for performance tuning in specific scenarios where the default index selection
   * does not yield optimal performance.
   *
   * @remarks This property is optional. When provided, it should be the exact name of the index to force.
   */
  forceIndex?: string;
};
/**
 * Options defining how a DatabaseStage is evaluated. See {@link @firebase/firestore/pipelines#PipelineSource.(database:1)}.
 */
export type DatabaseStageOptions = StageOptions & {};
/**
 * Options defining how a DocumentsStage is evaluated. See {@link @firebase/firestore/pipelines#PipelineSource.(documents:1)}.
 */
export type DocumentsStageOptions = StageOptions & {
  /**
   * An array of paths and DocumentReferences specifying the individual documents that will be the source of this pipeline.
   * The converters for these DocumentReferences will be ignored and not have an effect on this pipeline.
   * There must be at least one document specified in the array.
   */
  docs: Array<string | DocumentReference>;
};
/**
 * Options defining how an AddFieldsStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(addFields:1)}.
 */
export type AddFieldsStageOptions = StageOptions & {
  /**
   *  The fields to add to each document, specified as a {@link @firebase/firestore/pipelines#Selectable}.
   *  At least one field is required.
   */
  fields: Selectable[];
};
/**
 * Options defining how a RemoveFieldsStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(removeFields:1)}.
 */
export type RemoveFieldsStageOptions = StageOptions & {
  /**
   * The fields to remove from each document.
   */
  fields: Array<Field | string>;
};
/**
 * Options defining how a SelectStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(select:1)}.
 */
export type SelectStageOptions = StageOptions & {
  /**
   * The fields to include in the output documents, specified as {@link @firebase/firestore/pipelines#Selectable} expression
   * or as a string value indicating the field name.
   */
  selections: Array<Selectable | string>;
};
/**
 * Options defining how a WhereStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(where:1)}.
 */
export type WhereStageOptions = StageOptions & {
  /**
   * The {@link @firebase/firestore/pipelines#BooleanExpression} to apply as a filter for each input document to this stage.
   */
  condition: BooleanExpression;
};
/**
 * Options defining how an OffsetStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(offset:1)}.
 */
export type OffsetStageOptions = StageOptions & {
  /**
   * The number of documents to skip.
   */
  offset: number;
};
/**
 * Options defining how a LimitStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(limit:1)}.
 */
export type LimitStageOptions = StageOptions & {
  /**
   * The maximum number of documents to return.
   */
  limit: number;
};
/**
 * Options defining how a DistinctStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(distinct:1)}.
 */
export type DistinctStageOptions = StageOptions & {
  /**
   * The {@link @firebase/firestore/pipelines#Selectable} expressions or field names to consider when determining
   * distinct value combinations (groups).
   */
  groups: Array<string | Selectable>;
};

/**
 * Options defining how an AggregateStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(aggregate:1)}.
 */
export type AggregateStageOptions = StageOptions & {
  /**
   * The {@link @firebase/firestore/pipelines#AliasedAggregate} values specifying aggregate operations to
   * perform on the input documents.
   */
  accumulators: AliasedAggregate[];
  /**
   * The {@link @firebase/firestore/pipelines#Selectable} expressions or field names to consider when determining
   * distinct value combinations (groups), which will be aggregated over.
   */
  groups?: Array<string | Selectable>;
};
/**
 * Options defining how a FindNearestStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(findNearest:1)}.
 */
export type FindNearestStageOptions = StageOptions & {
  /**
   * Specifies the field to be used. This can be a string representing the field path
   * (e.g., 'fieldName', 'nested.fieldName') or an object of type {@link @firebase/firestore/pipelines#Field}
   * representing a more complex field expression.
   */
  field: Field | string;
  /**
   * Specifies the query vector value, to which the vector distance will be computed.
   */
  vectorValue: VectorValue | number[];
  /**
   * Specifies the method used to compute the distance between vectors.
   *
   * Possible values are:
   * - `'euclidean'`: Euclidean distance.
   * - `'cosine'`: Cosine similarity.
   * - `'dot_product'`: Dot product.
   */
  distanceMeasure: 'euclidean' | 'cosine' | 'dot_product';
  /**
   * The maximum number of documents to return from the FindNearest stage.
   */
  limit?: number;
  /**
   * If set, specifies the field on the output documents that will contain
   * the computed vector distance for the document. If not set, the computed
   * vector distance will not be returned.
   */
  distanceField?: string;
};

/**
 * @beta
 *
 * Specifies if the `matches` and `snippet` expressions will enhance the user
 * provided query to perform matching of synonyms, misspellings, lemmatization,
 * stemming.
 *
 * required - search will fail if the query enhancement times out or if the query
 *                    enhancement is not supported by the project's DRZ compliance
 *                    requirements.
 * preferred - search will fall back to the un-enhanced, user provided query, if
 *                    the query enhancement fails.
 */
export type QueryEnhancement = 'disabled' | 'required' | 'preferred';

/**
 * @beta
 * Options defining how a SearchStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(search)}.
 */
export type SearchStageOptions = StageOptions & {
  /**
   * Specifies the search query that will be used to query and score documents
   * by the search stage.
   *
   * The query can be expressed as an `Expression`, which will be used to score
   * and filter the results. Not all expressions supported by Pipelines
   * are supported in the Search query.
   *
   * @example
   * ```typescript
   * db.pipeline().collection('restaurants').search({
   *   query: or(
   *     documentMatches("breakfast"),
   *     field('menu').matches('waffle AND coffee')
   *   )
   * })
   * ```
   *
   * The query can also be expressed as a string in the Search domain-specific language (DSL):
   *
   * @example
   * ```typescript
   * db.pipeline().collection('restaurants').search({
   *   query: 'menu:(waffle and coffee) OR breakfast'
   * })
   * ```
   *
   * The query can also represent a geoDistance query:
   *
   * @example
   * ```typescript
   * db.pipeline().collection('restaurants').search({
   *   query: field('location').geoDistance(new GeoPoint(0, 0)).lessThanOrEqual(1000)
   * })
   * ```
   */
  query: BooleanExpression | string;

  // TODO(search) enable with backend support
  // /**
  //  * The BCP-47 language code of text in the search query, such as, “en-US” or “sr-Latn”
  //  */
  // languageCode?: string;

  // TODO(search) add indexPartition after languageCode

  // TODO(search) enable with backend support
  // /**
  //  * The maximum number of documents to retrieve. Documents will be retrieved in the
  //  * pre-sort order specified by the search index.
  //  */
  // retrievalDepth?: number;

  /**
   * Orderings specify how the returned documents are sorted.
   * One or more ordering are required.
   */
  sort?: Ordering | Ordering[];

  // TODO(search) enable with backend support
  // /**
  //  * The number of documents to skip from the beginning of the search result set.
  //  */
  // offset?: number;

  // TODO(search) enable with backend support
  // /**
  //  * The maximum number of documents to return from the Search stage.
  //  */
  // limit?: number;

  // TODO(search) enable with backend support
  // /**
  //  * The fields to keep or add to each document,
  //  * specified as an array of {@link @firebase/firestore/pipelines#Selectable}.
  //  */
  // select?: Array<Selectable | string>;

  /**
   * The fields to add to each document, specified as a {@link @firebase/firestore/pipelines#Selectable}.
   */
  addFields?: Selectable[];

  // TODO(search) enable with backend support
  // /**
  //  * Define the query expansion behavior used by full-text search expressions
  //  * in this search stage.
  //  */
  // queryEnhancement?: QueryEnhancement;
};
/**
 * Options defining how a ReplaceWithStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(replaceWith:1)}.
 */
export type ReplaceWithStageOptions = StageOptions & {
  /**
   * The name of a field that contains a map or an {@link @firebase/firestore/pipelines#Expression} that
   * evaluates to a map.
   */
  map: Expression | string;
};
/**
 * Defines the options for evaluating a sample stage within a pipeline.
 * This type combines common {@link @firebase/firestore/pipelines#StageOptions} with a specific configuration
 * where only one of the defined sampling methods can be applied.
 *
 * See {@link @firebase/firestore/pipelines#Pipeline.(sample:1)} to create a sample stage..
 */
export type SampleStageOptions = StageOptions &
  OneOf<{
    /**
     * If set, specifies the sample rate as a percentage of the
     * input documents.
     *
     * Cannot be set when `documents: number` is set.
     */
    percentage: number;
    /**
     * If set, specifies the sample rate as a total number of
     * documents to sample from the input documents.
     *
     * Cannot be set when `percentage: number` is set.
     */
    documents: number;
  }>;
/**
 * Options defining how a UnionStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(union:1)}.
 */
export type UnionStageOptions = StageOptions & {
  /**
   * Specifies the other Pipeline to union with.
   */
  other: Pipeline;
};

/**
 * Represents the specific options available for configuring an `UnnestStage` within a pipeline.
 */
export type UnnestStageOptions = StageOptions & {
  /**
   * A `Selectable` object that defines an array expression to be un-nested
   * and the alias for the un-nested field.
   */
  selectable: Selectable;
  /**
   * If set, specifies the field on the output documents that will contain the
   * offset (starting at zero) that the element is from the original array.
   */
  indexField?: string;
};
/**
 * Options defining how a SortStage is evaluated. See {@link @firebase/firestore/pipelines#Pipeline.(sort:1)}.
 */
export type SortStageOptions = StageOptions & {
  /**
   * Orderings specify how the input documents are sorted.
   * One or more ordering are required.
   */
  orderings: Ordering[];
};
