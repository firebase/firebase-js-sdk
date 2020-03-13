import { RequestInfo, UrlParams } from '../implementation/requestinfo';
import { Metadata } from '../metadata';
import { Mappings, toResourceString, downloadUrlFromResourceString } from '../implementation/metadata';
import { FbsBlob } from '../implementation/blob';
import { metadataForUpload_, sharedErrorHandler, objectErrorHandler, handlerCheck, checkResumeHeader_, ResumableUploadStatus } from '../implementation/requests';
import { Location } from '../implementation/location';
import { cannotSliceBlob, serverFileWrongSize } from '../implementation/error';
import { makeUrl } from '../implementation/url';
import { ReferenceImplNext } from './reference';
import { XhrIo } from '../implementation/xhrio';
import { fromResponseString } from './list';
import { ListResult } from '../list';
import { fromResourceString } from './metadata';
import { isString } from '../implementation/type';

export function multipartUpload(
    ref: ReferenceImplNext,
    mappings: Mappings,
    blob: FbsBlob,
    metadata?: Metadata | null
): RequestInfo<Metadata> {
    const urlPart = ref.location.bucketOnlyServerUrl();
    const headers: { [prop: string]: string } = {
        'X-Goog-Upload-Protocol': 'multipart'
    };

    function genBoundary(): string {
        let str = '';
        for (let i = 0; i < 2; i++) {
            str =
                str +
                Math.random()
                    .toString()
                    .slice(2);
        }
        return str;
    }
    const boundary = genBoundary();
    headers['Content-Type'] = 'multipart/related; boundary=' + boundary;
    const metadata_ = metadataForUpload_(location as unknown as Location, blob, metadata);
    const metadataString = toResourceString(metadata_, mappings);
    const preBlobPart =
        '--' +
        boundary +
        '\r\n' +
        'Content-Type: application/json; charset=utf-8\r\n\r\n' +
        metadataString +
        '\r\n--' +
        boundary +
        '\r\n' +
        'Content-Type: ' +
        metadata_['contentType'] +
        '\r\n\r\n';
    const postBlobPart = '\r\n--' + boundary + '--';
    const body = FbsBlob.getBlob(preBlobPart, blob, postBlobPart);
    if (body === null) {
        throw cannotSliceBlob();
    }
    const urlParams: UrlParams = { name: metadata_['fullPath']! };
    const url = makeUrl(urlPart);
    const method = 'POST';
    const timeout = ref.storage.maxUploadRetryTime;
    const requestInfo = new RequestInfo(
        url,
        method,
        // TODO: add actual metadata handler
        () => { return {} as Metadata },
        timeout
    );
    requestInfo.urlParams = urlParams;
    requestInfo.headers = headers;
    requestInfo.body = body.uploadData();
    requestInfo.errorHandler = sharedErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function deleteObject(
    ref: ReferenceImplNext,
): RequestInfo<void> {
    const urlPart = ref.location.fullServerUrl();
    const url = makeUrl(urlPart);
    const method = 'DELETE';
    const timeout = ref.storage.maxOperationRetryTime;

    function handler(_xhr: XhrIo, _text: string): void { }
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.successCodes = [200, 204];
    requestInfo.errorHandler = objectErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function getMetadata(
    ref: ReferenceImplNext,
    mappings: Mappings
): RequestInfo<Metadata> {
    const urlPart = ref.location.fullServerUrl();
    const url = makeUrl(urlPart);
    const method = 'GET';
    const timeout = ref.storage.maxOperationRetryTime;
    const requestInfo = new RequestInfo(
        url,
        method,
        // TODO: add actual metadata handler
        () => { return {} as Metadata },
        timeout
    );
    requestInfo.errorHandler = objectErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function updateMetadata(
    ref: ReferenceImplNext,
    metadata: Metadata,
    mappings: Mappings
): RequestInfo<Metadata> {
    const urlPart = ref.location.fullServerUrl();
    const url = makeUrl(urlPart);
    const method = 'PATCH';
    const body = toResourceString(metadata, mappings);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    const timeout = ref.storage.maxOperationRetryTime;
    const requestInfo = new RequestInfo(
        url,
        method,
        // TODO: add actual metadata handler
        () => { return {} as Metadata },
        timeout
    );
    requestInfo.headers = headers;
    requestInfo.body = body;
    requestInfo.errorHandler = objectErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function list(
    ref: ReferenceImplNext,
    delimiter?: string,
    pageToken?: string | null,
    maxResults?: number | null
): RequestInfo<ListResult> {
    const urlParams: UrlParams = {};
    if (ref.location.isRoot) {
        urlParams['prefix'] = '';
    } else {
        urlParams['prefix'] = ref.location.path + '/';
    }
    if (delimiter && delimiter.length > 0) {
        urlParams['delimiter'] = delimiter;
    }
    if (pageToken) {
        urlParams['pageToken'] = pageToken;
    }
    if (maxResults) {
        urlParams['maxResults'] = maxResults;
    }
    const urlPart = ref.location.bucketOnlyServerUrl();
    const url = makeUrl(urlPart);
    const method = 'GET';
    const timeout = ref.storage.maxOperationRetryTime;
    const requestInfo = new RequestInfo(
        url,
        method,
        listHandler(ref),
        timeout
    );
    requestInfo.urlParams = urlParams;
    requestInfo.errorHandler = sharedErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function listHandler(
    ref: ReferenceImplNext
): (p1: XhrIo, p2: string) => ListResult {
    function handler(xhr: XhrIo, text: string): ListResult {
        const listResult = fromResponseString(ref, text);
        handlerCheck(listResult !== null);
        return listResult as ListResult;
    }
    return handler;
}

export function getDownloadUrl(
    ref: ReferenceImplNext,
    mappings: Mappings
): RequestInfo<string | null> {
    const urlPart = ref.location.fullServerUrl();
    const url = makeUrl(urlPart);
    const method = 'GET';
    const timeout = ref.storage.maxOperationRetryTime;
    const requestInfo = new RequestInfo(
        url,
        method,
        downloadUrlHandler(ref, mappings),
        timeout
    );
    requestInfo.errorHandler = objectErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function downloadUrlHandler(
    ref: ReferenceImplNext,
    mappings: Mappings
): (p1: XhrIo, p2: string) => string | null {
    function handler(xhr: XhrIo, text: string): string | null {
        const metadata = fromResourceString(
            ref,
            text,
            mappings
        );
        handlerCheck(metadata !== null);
        return downloadUrlFromResourceString(
            metadata as Metadata,
            text
        );
    }
    return handler;
}

export function createResumableUpload(
    ref: ReferenceImplNext,
    mappings: Mappings,
    blob: FbsBlob,
    metadata?: Metadata | null
): RequestInfo<string> {
    const urlPart = ref.location.bucketOnlyServerUrl();
    const metadataForUpload = metadataForUpload_(ref.location as unknown as Location, blob, metadata);
    const urlParams: UrlParams = { name: metadataForUpload['fullPath']! };
    const url = makeUrl(urlPart);
    const method = 'POST';
    const headers = {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': blob.size(),
        'X-Goog-Upload-Header-Content-Type': metadataForUpload['contentType']!,
        'Content-Type': 'application/json; charset=utf-8'
    };
    const body = toResourceString(metadataForUpload, mappings);
    const timeout = ref.storage.maxUploadRetryTime;

    function handler(xhr: XhrIo): string {
        checkResumeHeader_(xhr);
        let url;
        try {
            url = xhr.getResponseHeader('X-Goog-Upload-URL');
        } catch (e) {
            handlerCheck(false);
        }
        handlerCheck(isString(url));
        return url as string;
    }
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.headers = headers;
    requestInfo.body = body;
    requestInfo.errorHandler = sharedErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function getResumableUploadStatus(
    ref: ReferenceImplNext,
    url: string,
    blob: FbsBlob
): RequestInfo<ResumableUploadStatus> {
    const headers = { 'X-Goog-Upload-Command': 'query' };

    function handler(xhr: XhrIo): ResumableUploadStatus {
        const status = checkResumeHeader_(xhr, ['active', 'final']);
        let sizeString: string | null = null;
        try {
            sizeString = xhr.getResponseHeader('X-Goog-Upload-Size-Received');
        } catch (e) {
            handlerCheck(false);
        }

        if (!sizeString) {
            // null or empty string
            handlerCheck(false);
        }

        const size = Number(sizeString);
        handlerCheck(!isNaN(size));
        return new ResumableUploadStatus(size, blob.size(), status === 'final');
    }
    const method = 'POST';
    const timeout = ref.storage.maxUploadRetryTime;
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = headers;
    requestInfo.errorHandler = sharedErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function continueResumableUpload(
    ref: ReferenceImplNext,
    url: string,
    blob: FbsBlob,
    chunkSize: number,
    mappings: Mappings,
    status?: ResumableUploadStatus | null,
    progressCallback?: ((p1: number, p2: number) => void) | null
): RequestInfo<ResumableUploadStatus> {
    // TODO(andysoto): standardize on internal asserts
    // assert(!(opt_status && opt_status.finalized));
    const status_ = new ResumableUploadStatus(0, 0);
    if (status) {
        status_.current = status.current;
        status_.total = status.total;
    } else {
        status_.current = 0;
        status_.total = blob.size();
    }
    if (blob.size() !== status_.total) {
        throw serverFileWrongSize();
    }
    const bytesLeft = status_.total - status_.current;
    let bytesToUpload = bytesLeft;
    if (chunkSize > 0) {
        bytesToUpload = Math.min(bytesToUpload, chunkSize);
    }
    const startByte = status_.current;
    const endByte = startByte + bytesToUpload;
    const uploadCommand =
        bytesToUpload === bytesLeft ? 'upload, finalize' : 'upload';
    const headers = {
        'X-Goog-Upload-Command': uploadCommand,
        'X-Goog-Upload-Offset': status_.current
    };
    const body = blob.slice(startByte, endByte);
    if (body === null) {
        throw cannotSliceBlob();
    }

    function handler(xhr: XhrIo, text: string): ResumableUploadStatus {
        // TODO(andysoto): Verify the MD5 of each uploaded range:
        // the 'x-range-md5' header comes back with status code 308 responses.
        // We'll only be able to bail out though, because you can't re-upload a
        // range that you previously uploaded.
        const uploadStatus = checkResumeHeader_(xhr, ['active', 'final']);
        const newCurrent = status_.current + bytesToUpload;
        const size = blob.size();
        let metadata;
        if (uploadStatus === 'final') {
            metadata = metadataHandler(ref, mappings)(xhr, text);
        } else {
            metadata = null;
        }
        return new ResumableUploadStatus(
            newCurrent,
            size,
            uploadStatus === 'final',
            metadata
        );
    }
    const method = 'POST';
    const timeout = ref.storage.maxUploadRetryTime;
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = headers;
    requestInfo.body = body.uploadData();
    requestInfo.progressCallback = progressCallback || null;
    requestInfo.errorHandler = sharedErrorHandler(ref.location as unknown as Location);
    return requestInfo;
}

export function metadataHandler(
    ref: ReferenceImplNext,
    mappings: Mappings
): (p1: XhrIo, p2: string) => Metadata {
    function handler(xhr: XhrIo, text: string): Metadata {
        const metadata = fromResourceString(
            ref,
            text,
            mappings
        );
        handlerCheck(metadata !== null);
        return metadata as Metadata;
    }
    return handler;
}
