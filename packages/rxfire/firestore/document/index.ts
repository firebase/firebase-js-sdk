import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { fromDocRef } from '../fromRef';

export function doc(ref: firestore.DocumentReference) {
  return fromDocRef(ref);
}
