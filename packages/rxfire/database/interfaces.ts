import { database } from 'firebase';

export type QueryFn = (ref: database.Reference) => database.Query;
export type ChildEvent = 'child_added' | 'child_removed' | 'child_changed' | 'child_moved';
export type ListenEvent = 'value' | ChildEvent;

export interface SnapshotPrevKey {
  snapshot: database.DataSnapshot;
  prevKey: string | null | undefined;
  event: ListenEvent;
}
