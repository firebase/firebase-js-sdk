import { Pipeline } from '../lite-api/pipeline';
import { PipelineSource } from '../lite-api/pipeline-source';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { DocumentKey } from '../model/document_key';

import { Firestore } from './database';
import { DocumentReference, Query } from './reference';
import { ExpUserDataWriter } from './user_data_writer';

export function useFirestorePipelines(): void {
  Firestore.prototype.pipeline = function (): PipelineSource {
    const firestore = this;
    return new PipelineSource(
      this,
      newUserDataReader(firestore),
      new ExpUserDataWriter(firestore),
      (key: DocumentKey) => {
        return new DocumentReference(firestore, null, key);
      }
    );
  };

  Query.prototype.pipeline = function (): Pipeline {
    let pipeline;
    if (this._query.collectionGroup) {
      pipeline = this.firestore
        .pipeline()
        .collectionGroup(this._query.collectionGroup);
    } else {
      pipeline = this.firestore
        .pipeline()
        .collection(this._query.path.canonicalString());
    }

    // TODO(pipeline) convert existing query filters, limits, etc into
    // pipeline stages

    return pipeline;
  };
}
