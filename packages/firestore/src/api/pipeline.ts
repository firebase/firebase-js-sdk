import { firestoreClientExecutePipeline } from '../core/firestore_client';
import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult } from '../lite-api/pipeline-result';
import { DocumentData, DocumentReference } from '../lite-api/reference';
import { Stage } from '../lite-api/stage';
import { UserDataReader } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { DocumentKey } from '../model/document_key';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';

export class Pipeline<
  AppModelType = DocumentData
> extends LitePipeline<AppModelType> {
  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param documentReferenceFactory
   * @param stages
   * @param converter
   */
  constructor(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    documentReferenceFactory: (id: DocumentKey) => DocumentReference,
    stages: Stage[],
    // TODO(pipeline) support converter
    //private converter:  FirestorePipelineConverter<AppModelType> = defaultPipelineConverter()
    converter: unknown = {}
  ) {
    super(
      db,
      userDataReader,
      userDataWriter,
      documentReferenceFactory,
      stages,
      converter
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
  execute(): Promise<Array<PipelineResult<AppModelType>>> {
    const firestore = cast(this._db, Firestore);
    const client = ensureFirestoreConfigured(firestore);
    return firestoreClientExecutePipeline(client, this).then(result => {
      const docs = result.map(
        element =>
          new PipelineResult<AppModelType>(
            this.userDataWriter,
            element.key?.path
              ? this.documentReferenceFactory(element.key)
              : undefined,
            element.fields,
            element.executionTime?.toTimestamp(),
            element.createTime?.toTimestamp(),
            element.updateTime?.toTimestamp()
            //this.converter
          )
      );

      return docs;
    });
  }
}
