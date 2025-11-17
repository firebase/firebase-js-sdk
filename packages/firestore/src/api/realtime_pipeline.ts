import { Firestore } from '../lite-api/database';
import { BooleanExpression, Ordering } from '../lite-api/expressions';
import { isReadableUserData, ReadableUserData } from '../lite-api/pipeline';
import { Limit, Sort, Stage, Where } from '../lite-api/stage';
import { UserDataReader, UserDataSource } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import {
  Stage as ProtoStage,
  StructuredPipeline
} from '../protos/firestore_proto_api';
import { JsonProtoSerializer } from '../remote/serializer';

/**
 * @beta
 *
 * The RealtimePipeline class provides a flexible and expressive framework for building complex data
 * transformation and query pipelines that can be used with Firestore's real-time and offline capabilities.
 *
 * A RealtimePipeline takes data sources, such as Firestore collections or collection groups, and applies
 * a series of stages that are chained together. Each stage takes the output from the previous stage
 * (or the data source) and produces an output for the next stage (or as the final output of the
 * pipeline).
 *
 * Expressions can be used within each stage to filter and transform data through the stage.
 *
 * NOTE: Both the initial and subsequent snapshots for RealtimePipeline take the consideration of the SDK's cache.
 * They might include results that have not been synchronized with the server yet, and wait for subsequent snapshots
 * to reflect the latest server state, this is the same as classic Firestore {@link Query}.
 * This behavior is different from the {@link Pipeline} class, which does not take the consideration of the SDK's cache.
 *
 * Usage Examples:
 *
 * ```typescript
 * const db: Firestore; // Assumes a valid firestore instance.
 *
 * // Example 1: Listen to books published after 1980
 * const unsubscribe = onRealtimePipelineSnapshot(db.realtimePipeline()
 *     .collection("books")
 *     .where(field("published").gt(1980)),
 *     (snapshot) => {
 *       // Handle the snapshot
 *     }
 * );
 * ```
 */
// TODO(pipeline): Add more examples to showcase functions
export class RealtimePipeline {
  /**
   * @internal
   * @private
   * @param _db
   * @param userDataReader
   * @param _userDataWriter
   * @param _documentReferenceFactory
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
    readonly userDataReader: UserDataReader,
    /**
     * @internal
     * @private
     */
    public _userDataWriter: AbstractUserDataWriter,
    readonly stages: Stage[]
  ) {}

  /**
   * Reads user data for each expression in the expressionMap.
   * @param name Name of the calling function. Used for error messages when invalid user data is encountered.
   * @param expressionMap
   * @return the expressionMap argument.
   * @private
   * @internal
   */
  protected readUserData<
    T extends
      | Map<string, ReadableUserData>
      | ReadableUserData[]
      | ReadableUserData
  >(name: string, expressionMap: T): T {
    const context = this.userDataReader.createContext(
      UserDataSource.Argument,
      name
    );
    if (isReadableUserData(expressionMap)) {
      expressionMap._readUserData(context);
    } else if (Array.isArray(expressionMap)) {
      expressionMap.forEach(readableData =>
        readableData._readUserData(context)
      );
    } else {
      expressionMap.forEach(expr => expr._readUserData(context));
    }
    return expressionMap;
  }

  where(condition: BooleanExpression): RealtimePipeline {
    const copy = this.stages.map(s => s);
    this.readUserData('where', condition);
    copy.push(new Where(condition, {}));
    return new RealtimePipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  limit(limit: number): RealtimePipeline {
    const copy = this.stages.map(s => s);
    copy.push(new Limit(limit, {}));
    return new RealtimePipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  sort(...orderings: Ordering[]): RealtimePipeline;
  sort(options: { orderings: Ordering[] }): RealtimePipeline;
  sort(
    optionsOrOrderings:
      | Ordering
      | {
          orderings: Ordering[];
        },
    ...rest: Ordering[]
  ): RealtimePipeline {
    const copy = this.stages.map(s => s);
    // Option object
    if ('orderings' in optionsOrOrderings) {
      copy.push(
        new Sort(this.readUserData('sort', optionsOrOrderings.orderings), {})
      );
    } else {
      // Ordering object
      copy.push(
        new Sort(this.readUserData('sort', [optionsOrOrderings, ...rest]), {})
      );
    }

    return new RealtimePipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
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
