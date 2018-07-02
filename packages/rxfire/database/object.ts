import { database } from 'firebase';
import { SnapshotPrevKey } from "./interfaces";
import { fromRef } from './fromRef';
import { Observable } from 'rxjs';

/**
 * Get the snapshot changes of an object
 * @param query 
 */
export function object(query: database.Query): Observable<SnapshotPrevKey> {
  return fromRef(query, 'value');
}
