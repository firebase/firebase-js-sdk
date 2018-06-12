import { storage } from 'firebase/app';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export function fromTask(task: storage.UploadTask) {
  return new Observable<storage.UploadTaskSnapshot>(subscriber => {
    const progress = (snap: storage.UploadTaskSnapshot) =>
      subscriber.next(snap);
    const error = e => subscriber.error(e);
    const complete = () => subscriber.complete();
    task.on('state_changed', progress, error, complete);
    return () => task.cancel();
  });
}

export function getDownloadURL(ref: storage.Reference) {
  return from(ref.getDownloadURL());
}

export function getMetadata(ref: storage.Reference) {
  return from(ref.getMetadata());
}

export function put(
  ref: storage.Reference,
  data: any,
  metadata?: storage.UploadMetadata
) {
  return fromTask(ref.put(data, metadata));
}

export function putString(
  ref: storage.Reference,
  data: string,
  format?: storage.StringFormat,
  metadata?: storage.UploadMetadata
) {
  return fromTask(ref.put(data, metadata));
}

export function percentage(task: storage.UploadTask) {
  return fromTask(task).pipe(map(s => s.bytesTransferred / s.totalBytes * 100));
}
