/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/**
 * @fileoverview Defines methods for interacting with the network.
 */

import { Metadata } from '../metadata';

import * as array from './array';
import { AuthWrapper } from './authwrapper';
import { FbsBlob } from './blob';
import * as errorsExports from './error';
import { FirebaseStorageError } from './error';
import { errors } from './error';
import { Location } from './location';
import * as MetadataUtils from './metadata';
import * as object from './object';
import { RequestInfo } from './requestinfo';
import * as type from './type';
import * as UrlUtils from './url';
import { XhrIo } from './xhrio';

/**
 * Throws the UNKNOWN FirebaseStorageError if cndn is false.
 */
export function handlerCheck(cndn: boolean) {
  if (!cndn) {
    throw errorsExports.unknown();
  }
}

export function metadataHandler(
  authWrapper: AuthWrapper,
  mappings: MetadataUtils.Mappings
): (p1: XhrIo, p2: string) => Metadata {
  function handler(xhr: XhrIo, text: string): Metadata {
    let metadata = MetadataUtils.fromResourceString(
      authWrapper,
      text,
      mappings
    );
    handlerCheck(metadata !== null);
    return metadata as Metadata;
  }
  return handler;
}

export function sharedErrorHandler(
  location: Location
): (p1: XhrIo, p2: FirebaseStorageError) => FirebaseStorageError {
  function errorHandler(
    xhr: XhrIo,
    err: FirebaseStorageError
  ): FirebaseStorageError {
    let newErr;
    if (xhr.getStatus() === 401) {
      newErr = errorsExports.unauthenticated();
    } else {
      if (xhr.getStatus() === 402) {
        newErr = errorsExports.quotaExceeded(location.bucket);
      } else {
        if (xhr.getStatus() === 403) {
          newErr = errorsExports.unauthorized(location.path);
        } else {
          newErr = err;
        }
      }
    }
    newErr.setServerResponseProp(err.serverResponseProp());
    return newErr;
  }
  return errorHandler;
}

export function objectErrorHandler(
  location: Location
): (p1: XhrIo, p2: FirebaseStorageError) => FirebaseStorageError {
  let shared = sharedErrorHandler(location);

  function errorHandler(
    xhr: XhrIo,
    err: FirebaseStorageError
  ): FirebaseStorageError {
    let newErr = shared(xhr, err);
    if (xhr.getStatus() === 404) {
      newErr = errorsExports.objectNotFound(location.path);
    }
    newErr.setServerResponseProp(err.serverResponseProp());
    return newErr;
  }
  return errorHandler;
}

export function getMetadata(
  authWrapper: AuthWrapper,
  location: Location,
  mappings: MetadataUtils.Mappings
): RequestInfo<Metadata> {
  let urlPart = location.fullServerUrl();
  let url = UrlUtils.makeNormalUrl(urlPart);
  let method = 'GET';
  let timeout = authWrapper.maxOperationRetryTime();
  let requestInfo = new RequestInfo(
    url,
    method,
    metadataHandler(authWrapper, mappings),
    timeout
  );
  requestInfo.errorHandler = objectErrorHandler(location);
  return requestInfo;
}

export function updateMetadata(
  authWrapper: AuthWrapper,
  location: Location,
  metadata: Metadata,
  mappings: MetadataUtils.Mappings
): RequestInfo<Metadata> {
  let urlPart = location.fullServerUrl();
  let url = UrlUtils.makeNormalUrl(urlPart);
  let method = 'PATCH';
  let body = MetadataUtils.toResourceString(metadata, mappings);
  let headers = { 'Content-Type': 'application/json; charset=utf-8' };
  let timeout = authWrapper.maxOperationRetryTime();
  let requestInfo = new RequestInfo(
    url,
    method,
    metadataHandler(authWrapper, mappings),
    timeout
  );
  requestInfo.headers = headers;
  requestInfo.body = body;
  requestInfo.errorHandler = objectErrorHandler(location);
  return requestInfo;
}

export function deleteObject(
  authWrapper: AuthWrapper,
  location: Location
): RequestInfo<void> {
  let urlPart = location.fullServerUrl();
  let url = UrlUtils.makeNormalUrl(urlPart);
  let method = 'DELETE';
  let timeout = authWrapper.maxOperationRetryTime();

  function handler(xhr: XhrIo, text: string) {}
  let requestInfo = new RequestInfo(url, method, handler, timeout);
  requestInfo.successCodes = [200, 204];
  requestInfo.errorHandler = objectErrorHandler(location);
  return requestInfo;
}

export function determineContentType_(
  metadata: Metadata | null,
  blob: FbsBlob | null
): string {
  return (
    (metadata && metadata['contentType']) ||
    (blob && blob.type()) ||
    'application/octet-stream'
  );
}

export function metadataForUpload_(
  location: Location,
  blob: FbsBlob,
  opt_metadata?: Metadata | null
): Metadata {
  let metadata = object.clone<Metadata>(opt_metadata);
  metadata['fullPath'] = location.path;
  metadata['size'] = blob.size();
  if (!metadata['contentType']) {
    metadata['contentType'] = determineContentType_(null, blob);
  }
  return metadata;
}

export function multipartUpload(
  authWrapper: AuthWrapper,
  location: Location,
  mappings: MetadataUtils.Mappings,
  blob: FbsBlob,
  opt_metadata?: Metadata | null
): RequestInfo<Metadata> {
  let urlPart = location.bucketOnlyServerUrl();
  let headers: { [prop: string]: string } = {
    'X-Goog-Upload-Protocol': 'multipart'
  };

  function genBoundary() {
    let str = '';
    for (let i = 0; i < 2; i++) {
      str = str + Math.random().toString().slice(2);
    }
    return str;
  }
  let boundary = genBoundary();
  headers['Content-Type'] = 'multipart/related; boundary=' + boundary;
  let metadata = metadataForUpload_(location, blob, opt_metadata);
  let metadataString = MetadataUtils.toResourceString(metadata, mappings);
  let preBlobPart =
    '--' +
    boundary +
    '\r\n' +
    'Content-Type: application/json; charset=utf-8\r\n\r\n' +
    metadataString +
    '\r\n--' +
    boundary +
    '\r\n' +
    'Content-Type: ' +
    metadata['contentType'] +
    '\r\n\r\n';
  let postBlobPart = '\r\n--' + boundary + '--';
  let body = FbsBlob.getBlob(preBlobPart, blob, postBlobPart);
  if (body === null) {
    throw errorsExports.cannotSliceBlob();
  }
  let urlParams = { name: metadata['fullPath'] };
  let url = UrlUtils.makeUploadUrl(urlPart);
  let method = 'POST';
  let timeout = authWrapper.maxUploadRetryTime();
  let requestInfo = new RequestInfo(
    url,
    method,
    metadataHandler(authWrapper, mappings),
    timeout
  );
  requestInfo.urlParams = urlParams;
  requestInfo.headers = headers;
  requestInfo.body = body.uploadData();
  requestInfo.errorHandler = sharedErrorHandler(location);
  return requestInfo;
}

/**
 * @param current The number of bytes that have been uploaded so far.
 * @param total The total number of bytes in the upload.
 * @param opt_finalized True if the server has finished the upload.
 * @param opt_metadata The upload metadata, should
 *     only be passed if opt_finalized is true.
 * @struct
 */
export class ResumableUploadStatus {
  finalized: boolean;
  metadata: Metadata | null;

  constructor(
    public current: number,
    public total: number,
    finalized?: boolean,
    metadata?: Metadata | null
  ) {
    this.finalized = !!finalized;
    this.metadata = metadata || null;
  }
}

export function checkResumeHeader_(xhr: XhrIo, opt_allowed?: string[]): string {
  let status;
  try {
    status = xhr.getResponseHeader('X-Goog-Upload-Status');
  } catch (e) {
    handlerCheck(false);
  }
  let allowed = opt_allowed || ['active'];
  handlerCheck(array.contains(allowed, status));
  return status as string;
}

export function createResumableUpload(
  authWrapper: AuthWrapper,
  location: Location,
  mappings: MetadataUtils.Mappings,
  blob: FbsBlob,
  opt_metadata?: Metadata | null
): RequestInfo<string> {
  let urlPart = location.bucketOnlyServerUrl();
  let metadata = metadataForUpload_(location, blob, opt_metadata);
  let urlParams = { name: metadata['fullPath'] };
  let url = UrlUtils.makeUploadUrl(urlPart);
  let method = 'POST';
  let headers = {
    'X-Goog-Upload-Protocol': 'resumable',
    'X-Goog-Upload-Command': 'start',
    'X-Goog-Upload-Header-Content-Length': blob.size(),
    'X-Goog-Upload-Header-Content-Type': metadata['contentType'],
    'Content-Type': 'application/json; charset=utf-8'
  };
  let body = MetadataUtils.toResourceString(metadata, mappings);
  let timeout = authWrapper.maxUploadRetryTime();

  function handler(xhr: XhrIo, text: string): string {
    checkResumeHeader_(xhr);
    let url;
    try {
      url = xhr.getResponseHeader('X-Goog-Upload-URL');
    } catch (e) {
      handlerCheck(false);
    }
    handlerCheck(type.isString(url));
    return url as string;
  }
  let requestInfo = new RequestInfo(url, method, handler, timeout);
  requestInfo.urlParams = urlParams;
  requestInfo.headers = headers;
  requestInfo.body = body;
  requestInfo.errorHandler = sharedErrorHandler(location);
  return requestInfo;
}

/**
 * @param url From a call to fbs.requests.createResumableUpload.
 */
export function getResumableUploadStatus(
  authWrapper: AuthWrapper,
  location: Location,
  url: string,
  blob: FbsBlob
): RequestInfo<ResumableUploadStatus> {
  let headers = { 'X-Goog-Upload-Command': 'query' };

  function handler(xhr: XhrIo, text: string): ResumableUploadStatus {
    let status = checkResumeHeader_(xhr, ['active', 'final']);
    let sizeString;
    try {
      sizeString = xhr.getResponseHeader('X-Goog-Upload-Size-Received');
    } catch (e) {
      handlerCheck(false);
    }
    let size = parseInt(sizeString, 10);
    handlerCheck(!isNaN(size));
    return new ResumableUploadStatus(size, blob.size(), status === 'final');
  }
  let method = 'POST';
  let timeout = authWrapper.maxUploadRetryTime();
  let requestInfo = new RequestInfo(url, method, handler, timeout);
  requestInfo.headers = headers;
  requestInfo.errorHandler = sharedErrorHandler(location);
  return requestInfo;
}

/**
 * Any uploads via the resumable upload API must transfer a number of bytes
 * that is a multiple of this number.
 */
export const resumableUploadChunkSize: number = 256 * 1024;

/**
 * @param url From a call to fbs.requests.createResumableUpload.
 * @param chunkSize Number of bytes to upload.
 * @param opt_status The previous status.
 *     If not passed or null, we start from the beginning.
 * @throws fbs.Error If the upload is already complete, the passed in status
 *     has a final size inconsistent with the blob, or the blob cannot be sliced
 *     for upload.
 */
export function continueResumableUpload(
  location: Location,
  authWrapper: AuthWrapper,
  url: string,
  blob: FbsBlob,
  chunkSize: number,
  mappings: MetadataUtils.Mappings,
  opt_status?: ResumableUploadStatus | null,
  opt_progressCallback?: ((p1: number, p2: number) => void) | null
): RequestInfo<ResumableUploadStatus> {
  // TODO(andysoto): standardize on internal asserts
  // assert(!(opt_status && opt_status.finalized));
  let status = new ResumableUploadStatus(0, 0);
  if (opt_status) {
    status.current = opt_status.current;
    status.total = opt_status.total;
  } else {
    status.current = 0;
    status.total = blob.size();
  }
  if (blob.size() !== status.total) {
    throw errorsExports.serverFileWrongSize();
  }
  let bytesLeft = status.total - status.current;
  let bytesToUpload = bytesLeft;
  if (chunkSize > 0) {
    bytesToUpload = Math.min(bytesToUpload, chunkSize);
  }
  let startByte = status.current;
  let endByte = startByte + bytesToUpload;
  let uploadCommand =
    bytesToUpload === bytesLeft ? 'upload, finalize' : 'upload';
  let headers = {
    'X-Goog-Upload-Command': uploadCommand,
    'X-Goog-Upload-Offset': status.current
  };
  let body = blob.slice(startByte, endByte);
  if (body === null) {
    throw errorsExports.cannotSliceBlob();
  }

  function handler(xhr: XhrIo, text: string): ResumableUploadStatus {
    // TODO(andysoto): Verify the MD5 of each uploaded range:
    // the 'x-range-md5' header comes back with status code 308 responses.
    // We'll only be able to bail out though, because you can't re-upload a
    // range that you previously uploaded.
    let uploadStatus = checkResumeHeader_(xhr, ['active', 'final']);
    let newCurrent = status.current + bytesToUpload;
    let size = blob.size();
    let metadata;
    if (uploadStatus === 'final') {
      metadata = metadataHandler(authWrapper, mappings)(xhr, text);
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
  let method = 'POST';
  let timeout = authWrapper.maxUploadRetryTime();
  let requestInfo = new RequestInfo(url, method, handler, timeout);
  requestInfo.headers = headers;
  requestInfo.body = body.uploadData();
  requestInfo.progressCallback = opt_progressCallback || null;
  requestInfo.errorHandler = sharedErrorHandler(location);
  return requestInfo;
}
