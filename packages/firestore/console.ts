import './src/platform_browser/browser_init';

export {
  Firestore,
  FirestoreDatabase,
  PublicCollectionReference as CollectionReference,
  PublicDocumentReference as DocumentReference,
  PublicDocumentSnapshot as DocumentSnapshot,
  PublicQuerySnapshot as QuerySnapshot,
  PrivateSettings
} from './src/api/database';
export { GeoPoint } from './src/api/geo_point';
export { PublicBlob as Blob } from './src/api/blob';
export { FirstPartyCredentialsSettings } from './src/api/credentials';
export { PublicFieldValue as FieldValue } from './src/api/field_value';
export { FieldPath } from './src/api/field_path';
export {
  DocumentListenOptions,
  DocumentChange,
  DocumentData
} from '@firebase/firestore-types';
