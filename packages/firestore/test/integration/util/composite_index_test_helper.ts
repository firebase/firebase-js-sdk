import { AutoId } from '../../../src/util/misc';
import {
  batchCommitDocsToCollection,
  PERSISTENCE_MODE_UNSPECIFIED,
  PersistenceMode,
} from './helpers';
import {
  query,
  CollectionReference,
  DocumentData,
  Firestore,
  Query,
  QueryConstraint,
  where,
} from '../../../src';
import {
  COMPOSITE_INDEX_TEST_COLLECTION,
  DEFAULT_SETTINGS
} from './settings';

export class CompositeIndexTestHelper {
  private readonly testId: string = 'test-id-' + AutoId.newId();

  async withTestDocs<T>(
    persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
    docs: { [key: string]: DocumentData },
    fn: (collection: CollectionReference, db: Firestore) => Promise<T>
  ): Promise<T> {
    this.addTestId(docs);
    return batchCommitDocsToCollection(
      persistence,
      DEFAULT_SETTINGS,
      docs,
      COMPOSITE_INDEX_TEST_COLLECTION,
      fn
    );

    // return withTestDbsSettings(
    //   persistence,
    //   DEFAULT_PROJECT_ID,
    //   DEFAULT_SETTINGS,
    //   2,
    //   ([testDb, setupDb]) => {
    //     const testCollection = collection(
    //       testDb,
    //       COMPOSITE_INDEX_TEST_COLLECTION
    //     );
    //
    //     return Promise.all(
    //       batchCommitDocsToCollection(
    //         setupDb,
    //         COMPOSITE_INDEX_TEST_COLLECTION,
    //         docs
    //       )
    //     ).then(() => fn(testCollection, testDb));
    //   }
    // );
  }

  // Add test-id to docs created under a specific test.
  private addTestId(docs: { [key: string]: DocumentData }): void {
    for (const key in docs) {
      if (docs.hasOwnProperty(key)) {
        docs[key]['test-id'] = this.testId;
      }
    }
  }

  // add filter on test id
  query<AppModelType, DbModelType extends DocumentData>(
    query_: Query<AppModelType, DbModelType>,
    ...queryConstraints: QueryConstraint[]
  ): Query<AppModelType, DbModelType> {
    return query(
      query_,
      where('test-id', '==', this.testId),
      ...queryConstraints
    );
  }

  // add doc with test id
  // set doc with test-id
}

// export function batchCommitDocsToCollection(collectionId: string){
//   return withTestDbsSettings(
//     persistence,
//     DEFAULT_PROJECT_ID,
//     settings,
//     2,
//     ([testDb, setupDb]) => {
//       // Abuse .doc() to get a random ID.
//       const testCollection = collection(testDb, collectionId);
//
//       return Promise.all(
//         batchCommitDocs(setupDb, collectionId, docs)
//       ).then(() => fn(testCollection, testDb));
//     }
//   );
//
// }
//
// export function batchCommitDocs(
//   db: Firestore,
//   collectionId: string,
//   docs: { [key: string]: DocumentData }
// ): Array<Promise<void>> {
//   const collectionRef = collection(db, collectionId);
//
//   const writeBatchCommits: Array<Promise<void>> = [];
//   let writeBatch_: WriteBatch | null = null;
//
//   let writeBatchSize = 0;
//   for (const key of Object.keys(docs)) {
//     if (writeBatch_ === null) {
//       writeBatch_ = writeBatch(db);
//     }
//     writeBatch_.set(doc(collectionRef, key), docs[key]);
//     writeBatchSize++;
//
//     // Write batches are capped at 500 writes. Use 400 just to be safe.
//     if (writeBatchSize === 400) {
//       writeBatchCommits.push(writeBatch_.commit());
//       writeBatch_ = null;
//       writeBatchSize = 0;
//     }
//   }
//
//   if (writeBatch_ !== null) {
//     writeBatchCommits.push(writeBatch_.commit());
//   }
//
//   return writeBatchCommits;
// }
