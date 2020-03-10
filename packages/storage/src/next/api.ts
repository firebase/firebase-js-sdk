import { StorageNext, ReferenceNext } from '@firebase/storage-types/next';
import { FirebaseAppNext } from '@firebase/app-types/next';
import { validate, nonNegativeNumberSpec, stringSpec, storageInstanceSpec } from '../implementation/args';
import { makeFromUrl } from './location';
import { storageInstanceKey, throwIfRoot } from './util';
import { StorageImplNext } from './storage';
import { StorageInternalNext } from './types';
import { ReferenceImplNext } from './reference';
import { Metadata } from '../metadata';
import { registerComponent } from '@firebase/app/next/internal';
import { Component } from '@firebase/component';

const storageInstances = new Map<string, StorageNext>();
registerComponent(new Component(
    STORAGE_TYPE, 
    factory, 
    ComponentType.PUBLIC
));

export function getStorage(app: FirebaseAppNext, url?: string): StorageNext {
    const key = storageInstanceKey(app, url);
    const instance = storageInstances.get(key);
    if (instance) {
        return instance;
    } else {
        return new StorageImplNext(app, url);
    }
}

export function setMaxOperationRetryTime(storage: StorageNext, time: number): void {
    validate(
        'setMaxOperationRetryTime',
        [storageInstanceSpec(), nonNegativeNumberSpec()],
        arguments
    );
    (storage as StorageInternalNext)._maxOperationRetryTime = time;
}

export function setMaxUploadRetryTime(storage: StorageNext, time: number): void {
    validate(
        'setMaxUploadRetryTime',
        [storageInstanceSpec(), nonNegativeNumberSpec()],
        arguments
    );
    (storage as StorageInternalNext)._maxUploadRetryTime = time;
}

export function ref(storage: StorageNext, path?: string): ReferenceNext {
    function validator(path: unknown): void {
        if (typeof path !== 'string') {
            throw 'Path is not a string.';
        }
        if (/^[A-Za-z]+:\/\//.test(path as string)) {
            throw 'Expected child path but got a URL, use refFromURL instead.';
        }
    }
    validate('ref', [storageInstanceSpec(), stringSpec(validator, true)], arguments);
    const storageInternal: StorageInternalNext = storage as StorageInternalNext;
    if (storageInternal.bucket == null) {
        throw new Error('No Storage Bucket defined in Firebase Options.');
    }

    const ref = new ReferenceImplNext(storageInternal, storageInternal.bucket);
    if (path != null) {
        return ref.child(path);
    } else {
        return ref;
    }
}

// Returns a reference for the given absolute URL.
export function refFromURL(storage: StorageNext, url: string): ReferenceNext {
    function validator(p: unknown): void {
        if (typeof p !== 'string') {
          throw 'Path is not a string.';
        }
        if (!/^[A-Za-z]+:\/\//.test(p as string)) {
          throw 'Expected full URL but got a child path, use ref instead.';
        }
        try {
          makeFromUrl(p as string);
        } catch (e) {
          throw 'Expected valid full URL but got an invalid one.';
        }
      }
      validate('refFromURL', [stringSpec(validator, false)], arguments);
      return new ReferenceImplNext(storage, makeFromUrl(url));
}

// Uploads data to this reference's location.
export function put(
    ref: ReferenceNext, 
    data: Blob | Uint8Array | ArrayBuffer, 
    metadata: Metadata | null = null): UploadTask {
        throwIfRoot(ref, 'put');
        return new UploadTask(
            this,
            this.authWrapper,
            this.location,
            this.mappings(),
            new FbsBlob(data),
            metadata
          );
}

// Uploads string data to this reference's location.
export function putString(ref: ReferenceNext, data: string, format?: StringFormat, metadata?: UploadMetadata): UploadTask {

}

// Deletes the object at this reference's location.
export function delete1(ref: ReferenceNext): Promise<any> {

}

// Fetches metadata for the object at this location, if one exists.
export function getMetadata(ref: ReferenceNext): Promise<any> {

}

// Updates the metadata for the object at this location, if one exists.
export function updateMetadata(ref: ReferenceNext, metadata: SettableMetadata): Promise<any> {

}

// List items (files) and prefixes (folders) under this storage reference.
export function list(ref: ReferenceNext, options?: ListOptions): Promise<ListResult> {

}

// List all items (files) and prefixes (folders) under this storage reference.
export function listAll(ref: ReferenceNext): Promise<ListResult> {

}

// Fetches a long lived download URL for this object.
export function getDownloadURL(ref: ReferenceNext): Promise<string> {

}