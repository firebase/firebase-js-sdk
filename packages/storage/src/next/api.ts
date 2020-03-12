import { StorageNext, ReferenceNext } from '@firebase/storage-types/next';
import { FirebaseAppNext, FirebaseAppInternalNext } from '@firebase/app-types/next';
import { validate, nonNegativeNumberSpec, stringSpec, storageInstanceSpec } from '../implementation/args';
import { makeFromUrl } from './location';
import { throwIfRoot } from './util';
import { StorageImplNext } from './storage';
import { ReferenceImplNext } from './reference';
import { Metadata } from '../metadata';
import { registerComponent, getProvider } from '@firebase/app/next/internal';
import { Component, ComponentType, ComponentContainer } from '@firebase/component';
import { FbsBlob } from '../implementation/blob';
import { getMappings } from '../implementation/metadata';
import { UploadTask } from './task';
import { StringFormat, dataFromString } from '../implementation/string';
import { isDef } from '../implementation/type';
import {
    deleteObject,
    getMetadata as getMetadataRequestInfo,
    updateMetadata as updateMetadataRequestInfo,
    list as listRequestInfo,
    getDownloadUrl as getDownloadUrlRequestInfo
} from './requests';
import { makeRequest } from './client';
import { getAuthToken } from './auth';
import { ListResult, ListOptions } from '../list';
import { noDownloadURL } from '../implementation/error';

registerComponent(new Component(
    'storage-next',
    (
        container: ComponentContainer,
        url?: string
    ): StorageNext => {
        const app = container.getProvider('app-next').getImmediate();
        const authProvider = container.getProvider('auth-internal');
        return new StorageImplNext(app, authProvider, url)
    },
    ComponentType.PUBLIC
).setMultipleInstances(true));

export function getStorage(app: FirebaseAppNext, url?: string): StorageNext {
    return getProvider(app as FirebaseAppInternalNext, 'storage-next').getImmediate({
        identifier: url
    });
}

export function setMaxOperationRetryTime(storage: StorageNext, time: number): void {
    validate(
        'setMaxOperationRetryTime',
        [storageInstanceSpec(), nonNegativeNumberSpec()],
        arguments
    );
    (storage as StorageImplNext)._maxOperationRetryTime = time;
}

export function setMaxUploadRetryTime(storage: StorageNext, time: number): void {
    validate(
        'setMaxUploadRetryTime',
        [storageInstanceSpec(), nonNegativeNumberSpec()],
        arguments
    );
    (storage as StorageImplNext)._maxUploadRetryTime = time;
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
    const storageInternal: StorageImplNext = storage as StorageImplNext;
    if (storageInternal._bucket == null) {
        throw new Error('No Storage Bucket defined in Firebase Options.');
    }

    const ref = new ReferenceImplNext(storageInternal, storageInternal._bucket);
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

// TODO: throw if app was deleted
// Uploads data to this reference's location.
export function put(
    ref: ReferenceNext,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata: Metadata | null = null): UploadTask {
    throwIfRoot(ref, 'put');
    return new UploadTask(
        ref as ReferenceImplNext,
        getMappings(),
        new FbsBlob(data),
        metadata
    );
}

// Uploads string data to this reference's location.
export function putString(
    ref: ReferenceNext,
    value: string,
    format: StringFormat = StringFormat.RAW,
    metadata?: Metadata
): UploadTask {
    throwIfRoot(ref, 'putString');
    const data = dataFromString(format, value);
    const metadataClone = Object.assign({}, metadata);
    if (
        !isDef(metadataClone['contentType']) &&
        isDef(data.contentType)
    ) {
        metadataClone['contentType'] = data.contentType!;
    }
    return new UploadTask(
        ref as ReferenceImplNext,
        getMappings(),
        new FbsBlob(data.data, true),
        metadataClone
    );

}

// // Deletes the object at this reference's location.
export async function delete1(ref: ReferenceNext): Promise<any> {
    throwIfRoot(ref, 'delete');
    const requestInfo = deleteObject(ref as ReferenceImplNext);
    const authToken = await getAuthToken(ref.storage as StorageImplNext);

    const request = makeRequest(ref.storage as StorageImplNext, requestInfo, authToken);
    return request.getPromise();
}

// // Fetches metadata for the object at this location, if one exists.
export async function getMetadata(ref: ReferenceNext): Promise<any> {
    throwIfRoot(ref, 'getMetadata');
    const authToken = await getAuthToken(ref.storage as StorageImplNext);
    const requestInfo = getMetadataRequestInfo(ref as ReferenceImplNext, getMappings());

    const request = makeRequest(ref.storage as StorageImplNext, requestInfo, authToken);
    return request.getPromise();
}

// // Updates the metadata for the object at this location, if one exists.
export async function updateMetadata(ref: ReferenceNext, metadata: Metadata): Promise<Metadata> {
    throwIfRoot(ref, 'updateMetadata');
    const authToken = await getAuthToken(ref.storage as StorageImplNext);
    const requestInfo = updateMetadataRequestInfo(ref as ReferenceImplNext, metadata, getMappings());

    const request = makeRequest(ref.storage as StorageImplNext, requestInfo, authToken);
    return request.getPromise();
}

// // List items (files) and prefixes (folders) under this storage reference.
export async function list(ref: ReferenceNext, options?: ListOptions): Promise<ListResult> {
    const op = options ?? {};
    const authToken = await getAuthToken(ref.storage as StorageImplNext);
    const requestInfo = listRequestInfo(
        ref as ReferenceImplNext,
        '/',
        op.pageToken,
        op.maxResults
    );

    const request = makeRequest(ref.storage as StorageImplNext, requestInfo, authToken);
    return request.getPromise();
}

// // List all items (files) and prefixes (folders) under this storage reference.
export async function listAll(ref: ReferenceNext): Promise<ListResult> {
    const accumulator = {
        prefixes: [],
        items: []
    };
    return listAllHelper(ref, accumulator).then(() => accumulator);
}

async function listAllHelper(
    ref: ReferenceNext,
    accumulator: ListResult,
    pageToken?: string
): Promise<void> {
    const opt: ListOptions = {
        // maxResults is 1000 by default.
        pageToken
    };
    const nextPage = await list(ref, opt);
    accumulator.prefixes.push(...nextPage.prefixes);
    accumulator.items.push(...nextPage.items);
    if (nextPage.nextPageToken != null) {
        await listAllHelper(ref, accumulator, nextPage.nextPageToken);
    }
}

// // Fetches a long lived download URL for this object.
export async function getDownloadURL(ref: ReferenceNext): Promise<string> {
    throwIfRoot(ref, 'getDownloadURL');
    const authToken = await getAuthToken(ref.storage as StorageImplNext);
    const requestInfo = getDownloadUrlRequestInfo(ref as ReferenceImplNext, getMappings());

    const request = makeRequest(ref.storage as StorageImplNext, requestInfo, authToken);
    const url = await request.getPromise();

    if (url === null) {
        throw noDownloadURL();
    }

    return url;
}