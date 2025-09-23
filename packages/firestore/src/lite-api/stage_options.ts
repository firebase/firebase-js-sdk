import { OneOf } from '../util/types';

import {
  AggregateWithAlias,
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
export interface StageOptions {
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
}
/**
 * Options defining how a CollectionStage is evaluated. See {@link PipelineSource.collection}.
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
 * Defines the configuration options for a {@link CollectionGroupStage} within a pipeline.
 * This type extends {@link StageOptions} and provides specific settings for how a collection group
 * is identified and processed during pipeline execution.
 *
 * @see {@link PipelineSource.collectionGroup} to create a collection group stage.
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
 * Options defining how a DatabaseStage is evaluated. See {@link PipelineSource.database}.
 */
export type DatabaseStageOptions = StageOptions & {};
/**
 * Options defining how a DocumentsStage is evaluated. See {@link PipelineSource.documents}.
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
 * Options defining how an AddFieldsStage is evaluated. See {@link Pipeline.addFields}.
 */
export type AddFieldsStageOptions = StageOptions & {
  /**
   *  The fields to add to each document, specified as a {@link Selectable}.
   *  At least one field is required.
   */
  fields: Selectable[];
};
/**
 * Options defining how a RemoveFieldsStage is evaluated. See {@link Pipeline.removeFields}.
 */
export type RemoveFieldsStageOptions = StageOptions & {
  /**
   * The fields to remove from each document.
   */
  fields: Array<Field | string>;
};
/**
 * Options defining how a SelectStage is evaluated. See {@link Pipeline.select}.
 */
export type SelectStageOptions = StageOptions & {
  /**
   * The fields to include in the output documents, specified as {@link Selectable} expression
   * or as a string value indicating the field name.
   */
  selections: Array<Selectable | string>;
};
/**
 * Options defining how a WhereStage is evaluated. See {@link Pipeline.where}.
 */
export type WhereStageOptions = StageOptions & {
  /**
   * The {@link BooleanExpression} to apply as a filter for each input document to this stage.
   */
  condition: BooleanExpression;
};
/**
 * Options defining how an OffsetStage is evaluated. See {@link Pipeline.offset}.
 */
export type OffsetStageOptions = StageOptions & {
  /**
   * The number of documents to skip.
   */
  offset: number;
};
/**
 * Options defining how a LimitStage is evaluated. See {@link Pipeline.limit}.
 */
export type LimitStageOptions = StageOptions & {
  /**
   * The maximum number of documents to return.
   */
  limit: number;
};
/**
 * Options defining how a DistinctStage is evaluated. See {@link Pipeline.distinct}.
 */
export type DistinctStageOptions = StageOptions & {
  /**
   * The {@link Selectable} expressions or field names to consider when determining
   * distinct value combinations (groups).
   */
  groups: Array<string | Selectable>;
};

/**
 * Options defining how an AggregateStage is evaluated. See {@link Pipeline.aggregate}.
 */
export type AggregateStageOptions = StageOptions & {
  /**
   * The {@link AliasedAggregate} values specifying aggregate operations to
   * perform on the input documents.
   */
  accumulators: AggregateWithAlias[];
  /**
   * The {@link Selectable} expressions or field names to consider when determining
   * distinct value combinations (groups), which will be aggregated over.
   */
  groups?: Array<string | Selectable>;
};
/**
 * Options defining how a FindNearestStage is evaluated. See {@link Pipeline.findNearest}.
 */
export type FindNearestStageOptions = StageOptions & {
  /**
   * Specifies the field to be used. This can be a string representing the field path
   * (e.g., 'fieldName', 'nested.fieldName') or an object of type {@link Field}
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
 * Options defining how a ReplaceWithStage is evaluated. See {@link Pipeline.replaceWith}.
 */
export type ReplaceWithStageOptions = StageOptions & {
  /**
   * The name of a field that contains a map or an {@link Expression} that
   * evaluates to a map.
   */
  map: Expression | string;
};
/**
 * Defines the options for evaluating a sample stage within a pipeline.
 * This type combines common {@link StageOptions} with a specific configuration
 * where only one of the defined sampling methods can be applied.
 *
 * See {@link Pipeline.sample} to create a sample stage..
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
 * Options defining how a UnionStage is evaluated. See {@link Pipeline.union}.
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
 * Options defining how a SortStage is evaluated. See {@link Pipeline.sort}.
 */
export type SortStageOptions = StageOptions & {
  /**
   * Orderings specify how the input documents are sorted.
   * One or more ordering are required.
   */
  orderings: Ordering[];
};
