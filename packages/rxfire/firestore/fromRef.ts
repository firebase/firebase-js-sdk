import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type Reference<T> = firestore.DocumentReference | firestore.CollectionReference;

function _fromRef<T, R>(ref: any): Observable<R> {
  return new Observable(subscriber => {
    const unsubscribe = ref.onSnapshot(subscriber);
    return { unsubscribe };
  });
}

export function fromRef<R>(ref: firestore.DocumentReference | firestore.Query) {
  return _fromRef<typeof ref, R>(ref);
}

export function fromDocRef<T>(ref: firestore.DocumentReference) {
  return fromRef<firestore.DocumentSnapshot>(ref);
}

export function fromCollectionRef<T>(ref: firestore.Query) {
  return fromRef<firestore.QuerySnapshot>(ref);
}