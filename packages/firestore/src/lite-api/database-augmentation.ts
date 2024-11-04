import { DocumentKey } from '../model/document_key';

import { Firestore } from './database';
import { Pipeline } from './pipeline';
import { PipelineSource } from './pipeline-source';
import { DocumentReference, Query } from './reference';
import { LiteUserDataWriter } from './reference_impl';
import { newUserDataReader } from './user_data_reader';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource;
  }
}

declare module './reference' {
  interface Query {
    pipeline(): Pipeline;
  }
}

export function useFirestorePipelines(): void {
  Firestore.prototype.pipeline = function (): PipelineSource {
    const userDataWriter = new LiteUserDataWriter(this);
    const userDataReader = newUserDataReader(this);
    return new PipelineSource(
      this,
      userDataReader,
      userDataWriter,
      (key: DocumentKey) => {
        return new DocumentReference(this, null, key);
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
