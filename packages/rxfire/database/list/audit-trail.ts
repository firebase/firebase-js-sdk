import { database } from "firebase";
import { Observable } from 'rxjs';
import { SnapshotPrevKey, ChildEvent } from '../interfaces';
import { fromRef } from '../fromRef';
import { map, withLatestFrom, scan, skipWhile } from 'rxjs/operators';
import { stateChanges } from './';
 
interface LoadedMetadata {
  data: SnapshotPrevKey;
  lastKeyToLoad: any;
}

export function auditTrail(query: database.Query, events?: ChildEvent[]): Observable<SnapshotPrevKey[]> {
  const auditTrail$ = stateChanges(query, events)
    .pipe(
      scan<SnapshotPrevKey>((current, changes) => [...current, changes], [])
    );
  return waitForLoaded(query, auditTrail$);
}

function loadedData(query: database.Query): Observable<LoadedMetadata> {
  // Create an observable of loaded values to retrieve the
  // known dataset. This will allow us to know what key to
  // emit the "whole" array at when listening for child events.
  return fromRef(query, 'value')
  .pipe(
    map(data => {
      // Store the last key in the data set
      let lastKeyToLoad;
      // Loop through loaded dataset to find the last key
      data.snapshot.forEach(child => {
        lastKeyToLoad = child.key; return false;
      });
      // return data set and the current last key loaded
      return { data, lastKeyToLoad };
    })
  );
}

function waitForLoaded(query: database.Query, snap$: Observable<SnapshotPrevKey[]>) {
  const loaded$ = loadedData(query);
  return loaded$
    .pipe(
      withLatestFrom(snap$),
      // Get the latest values from the "loaded" and "child" datasets
      // We can use both datasets to form an array of the latest values.
      map(([loaded, changes]) => {
        // Store the last key in the data set
        let lastKeyToLoad = loaded.lastKeyToLoad;
        // Store all child keys loaded at this point
        const loadedKeys = changes.map(change => change.snapshot.key);
        return { changes, lastKeyToLoad, loadedKeys }
      }),
      // This is the magical part, only emit when the last load key
      // in the dataset has been loaded by a child event. At this point
      // we can assume the dataset is "whole".
      skipWhile(meta => meta.loadedKeys.indexOf(meta.lastKeyToLoad) === -1),
      // Pluck off the meta data because the user only cares
      // to iterate through the snapshots
      map(meta => meta.changes)
    );
}
