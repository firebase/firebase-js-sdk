import { Firestore } from '../lite-api/database';
import { BooleanExpr, Ordering } from '../lite-api/expressions';
import { isReadableUserData, ReadableUserData } from '../lite-api/pipeline';
import { Limit, Sort, Stage, Where } from '../lite-api/stage';
import { UserDataReader } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import {
  Stage as ProtoStage,
  StructuredPipeline
} from '../protos/firestore_proto_api';
import { JsonProtoSerializer } from '../remote/serializer';

/**
 * Base-class implementation
 */
export class RealtimePipeline {
  /**
   * @internal
   * @private
   * @param _db
   * @param userDataReader
   * @param _userDataWriter
   * @param _documentReferenceFactory
   * @param stages
   * @param converter
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
    readonly stages: Stage[],
    readonly converter: unknown = {}
  ) {}

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
   * @param converter
   * @protected
   */
  protected newPipeline(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    stages: Stage[],
    converter: unknown = {}
  ): RealtimePipeline {
    return new RealtimePipeline(db, userDataReader, userDataWriter, stages);
  }

  where(condition: BooleanExpr): RealtimePipeline {
    const copy = this.stages.map(s => s);
    this.readUserData('where', condition);
    copy.push(new Where(condition));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy,
      this.converter
    );
  }

  limit(limit: number): RealtimePipeline {
    const copy = this.stages.map(s => s);
    copy.push(new Limit(limit));
    return this.newPipeline(
      this._db,
      this.userDataReader,
      this._userDataWriter,
      copy
    );
  }

  _limit(limit: number, convertedFromLimitTolast: boolean): RealtimePipeline {
    const copy = this.stages.map(s => s);
    copy.push(new Limit(limit, convertedFromLimitTolast));
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
      copy,
      this.converter
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
