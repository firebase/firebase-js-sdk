import { Bytes } from '../lite-api/bytes';
import { DocumentReference } from '../lite-api/reference';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { ByteString } from '../util/byte_string';

import { Firestore } from './database';

export class ExpUserDataWriter extends AbstractUserDataWriter {
  constructor(protected firestore: Firestore) {
    super();
  }

  protected convertBytes(bytes: ByteString): Bytes {
    return new Bytes(bytes);
  }

  protected convertReference(name: string): DocumentReference {
    const key = this.convertDocumentKey(name, this.firestore._databaseId);
    return new DocumentReference(this.firestore, /* converter= */ null, key);
  }
}
