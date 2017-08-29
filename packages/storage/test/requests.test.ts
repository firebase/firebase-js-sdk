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
import { assert } from 'chai';
import { AuthWrapper } from '../src/implementation/authwrapper';
import { FbsBlob } from '../src/implementation/blob';
import { Location } from '../src/implementation/location';
import {
  fromResourceString,
  getMappings
} from '../src/implementation/metadata';
import { makeRequest } from '../src/implementation/request';
import * as requests from '../src/implementation/requests';
import {
  makeNormalUrl,
  makeUploadUrl
} from '../src/implementation/url';
import * as fbsPromise from '../src/implementation/promise_external';
import * as errors from '../src/implementation/error';
import { RequestInfo } from '../src/implementation/requestinfo';
import { XhrIoPool } from '../src/implementation/xhriopool';
import { Metadata } from '../src/metadata';
import { Reference } from '../src/reference';
import { Service } from '../src/service';
import { assertObjectIncludes, fakeXhrIo } from './testshared';

describe('Firebase Storage > Requests', () => {
  const normalBucket = 'b';
  const locationNormal = new Location(normalBucket, 'o');
  const locationNormalUrl = '/b/' + normalBucket + '/o/o';
  const locationNormalNoObjUrl = '/b/' + normalBucket + '/o';
  const locationEscapes = new Location('b/', 'o?');
  const locationEscapesUrl = '/b/b%2F/o/o%3F';
  const locationEscapesNoObjUrl = '/b/b%2F/o';
  const smallBlob = new FbsBlob(new Blob(['a']));
  const smallBlobString = 'a';
  const bigBlob = new FbsBlob(new Blob([new ArrayBuffer(1024 * 1024)]));
  const normalUrl = makeNormalUrl;
  const uploadUrl = makeUploadUrl;

  const mappings = getMappings();

  const authWrapper = new AuthWrapper(
    null,
    function(authWrapper, loc) {
      return {} as Reference;
    },
    makeRequest,
    {} as Service,
    new XhrIoPool()
  );

  const contentTypeInMetadata = 'application/jason';
  const metadata = ({
    contentType: contentTypeInMetadata,
    customMetadata: {
      // no-inline
      foo: 'bar'
    }
  } as any) as Metadata;
  const metadataString = JSON.stringify({
    // no-inline
    contentType: contentTypeInMetadata,
    metadata: {
      // no-inline
      foo: 'bar'
    }
  });

  const serverResource = {
    bucket: normalBucket,
    generation: '1',
    metageneration: '2',

    name: 'foo/bar/baz.png',

    size: '10',
    timeCreated: 'This is a real time',
    updated: 'Also a real time',
    md5Hash: 'deadbeef',

    cacheControl: 'max-age=604800',
    contentDisposition: 'Attachment; filename=baz.png',
    contentLanguage: 'en-US',
    contentType: 'application/jason',

    downloadTokens: 'a,b,c',
    metadata: { foo: 'bar' }
  };
  const serverResourceString = JSON.stringify(serverResource);
  const metadataFromServerResource = fromResourceString(
    authWrapper,
    serverResourceString,
    mappings
  );

  function uploadMetadataString(name: string): string {
    return JSON.stringify({
      name: name,
      contentType: contentTypeInMetadata,
      metadata: { foo: 'bar' }
    });
  }

  const metadataContentType = 'application/json; charset=utf-8';

  function readBlob(blob: Blob): Promise<string> {
    const reader = new FileReader();
    reader.readAsText(blob);
    return fbsPromise.make((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error as Error);
      };
    });
  }

  function assertBodyEquals(
    body: Blob | string | Uint8Array | null,
    expectedStr: string
  ): Promise<void> {
    if (body === null) {
      assert.fail('body was null');
    }

    if (body instanceof Blob) {
      return readBlob(body).then(function(str) {
        assert.equal(str, expectedStr);
      });
    } else if (body instanceof Uint8Array) {
      return readBlob(new Blob([body])).then(function(str) {
        assert.equal(str, expectedStr);
      });
    } else {
      assert.equal(body as string, expectedStr);
      return fbsPromise.resolve(undefined);
    }
  }

  function checkMetadataHandler(requestInfo: RequestInfo<Metadata>): void {
    const metadata = requestInfo.handler(fakeXhrIo({}), serverResourceString);
    assert.deepEqual(metadata, metadataFromServerResource);
  }

  function checkNoOpHandler<T>(requestInfo: RequestInfo<T>): void {
    try {
      requestInfo.handler(fakeXhrIo({}), '');
    } catch (e) {
      assert.fail('Remove handler threw');
    }
  }

  it('getMetadata request info', () => {
    const maps = [
      [locationNormal, locationNormalUrl],
      [locationEscapes, locationEscapesUrl]
    ];
    for (let i = 0; i < maps.length; i++) {
      const location = maps[i][0] as Location;
      const url = maps[i][1] as string;
      const requestInfo = requests.getMetadata(authWrapper, location, mappings);
      assertObjectIncludes(
        {
          url: normalUrl(url),
          method: 'GET',
          body: null,
          headers: {},
          urlParams: {}
        },
        requestInfo
      );
    }
  });
  it('getMetadata handler', () => {
    const requestInfo = requests.getMetadata(
      authWrapper,
      locationNormal,
      mappings
    );
    checkMetadataHandler(requestInfo);
  });
  it('updateMetadata requestinfo', () => {
    const maps = [
      [locationNormal, locationNormalUrl],
      [locationEscapes, locationEscapesUrl]
    ];
    for (let i = 0; i < maps.length; i++) {
      const location = maps[i][0] as Location;
      const url = maps[i][1] as string;
      const requestInfo = requests.updateMetadata(
        authWrapper,
        location,
        metadata,
        mappings
      );
      assertObjectIncludes(
        {
          url: normalUrl(url),
          method: 'PATCH',
          body: metadataString,
          headers: { 'Content-Type': metadataContentType },
          urlParams: {}
        },
        requestInfo
      );
    }
  });
  it('updateMetadata handler', () => {
    const requestInfo = requests.updateMetadata(
      authWrapper,
      locationNormal,
      metadata,
      mappings
    );
    checkMetadataHandler(requestInfo);
  });

  it('deleteObject request info', () => {
    const maps = [
      [locationNormal, locationNormalUrl],
      [locationEscapes, locationEscapesUrl]
    ];
    for (let i = 0; i < maps.length; i++) {
      const location = maps[i][0] as Location;
      const url = maps[i][1] as string;
      const requestInfo = requests.deleteObject(authWrapper, location);
      assertObjectIncludes(
        {
          url: normalUrl(url),
          method: 'DELETE',
          body: null,
          headers: {},
          urlParams: {}
        },
        requestInfo
      );
    }
  });
  it('deleteObject handler', () => {
    const requestInfo = requests.deleteObject(authWrapper, locationNormal);
    checkNoOpHandler(requestInfo);
  });
  it('multipartUpload request info', () => {
    const multipartHeaderRegex = /^multipart\/related; boundary=([A-Za-z0-9]+)$/;

    const maps = [
      [locationNormal, locationNormalNoObjUrl],
      [locationEscapes, locationEscapesNoObjUrl]
    ];
    const promises = [];
    for (let i = 0; i < maps.length; i++) {
      const location = maps[i][0] as Location;
      const url = maps[i][1] as string;
      const makeMultipartBodyString = (boundary: string): string => {
        return (
          '--' +
          boundary +
          '\r\n' +
          'Content-Type: ' +
          metadataContentType +
          '\r\n\r\n' +
          uploadMetadataString(location.path) +
          '\r\n--' +
          boundary +
          '\r\n' +
          'Content-Type: ' +
          contentTypeInMetadata +
          '\r\n\r\n' +
          smallBlobString +
          '\r\n--' +
          boundary +
          '--'
        );
      };
      const requestInfo = requests.multipartUpload(
        authWrapper,
        location,
        mappings,
        smallBlob,
        metadata
      );
      const matches = (requestInfo.headers['Content-Type'] as string).match(
        multipartHeaderRegex
      );
      assert.isNotNull(matches);
      assert.equal(matches.length, 2);
      const boundary = matches[1];
      promises.push(
        assertBodyEquals(requestInfo.body, makeMultipartBodyString(boundary))
      );

      assertObjectIncludes(
        {
          url: uploadUrl(url),
          method: 'POST',
          urlParams: { name: location.path },
          headers: {
            'X-Goog-Upload-Protocol': 'multipart',
            // Checked before this block, but needed here because
            // assertObjectIncludes does exact checks on values.
            'Content-Type': requestInfo.headers['Content-Type']
          }
        },
        requestInfo
      );
    }

    return Promise.all(promises);
  });
  it('multipartUpload handler', () => {
    const requestInfo = requests.multipartUpload(
      authWrapper,
      locationNormal,
      mappings,
      smallBlob,
      metadata
    );
    checkMetadataHandler(requestInfo);
  });

  it('createResumableUpload request info', () => {
    const maps = [
      [locationNormal, locationNormalNoObjUrl],
      [locationEscapes, locationEscapesNoObjUrl]
    ];
    const promises = [];
    for (let i = 0; i < maps.length; i++) {
      const location = maps[i][0] as Location;
      const url = maps[i][1] as string;
      const requestInfo = requests.createResumableUpload(
        authWrapper,
        location,
        mappings,
        smallBlob,
        metadata
      );
      assertObjectIncludes(
        {
          url: uploadUrl(url),
          method: 'POST',
          urlParams: { name: location.path },
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': smallBlob.size(),
            'X-Goog-Upload-Header-Content-Type': contentTypeInMetadata,
            'Content-Type': metadataContentType
          }
        },
        requestInfo
      );
      promises.push(
        assertBodyEquals(requestInfo.body, uploadMetadataString(location.path))
      );
    }
    return Promise.all(promises);
  });

  function testCreateResumableUploadHandler() {
    const requestInfo = requests.createResumableUpload(
      authWrapper,
      locationNormal,
      mappings,
      smallBlob,
      metadata
    );
    const uploadUrl = 'https://i.am.an.upload.url.com/hello/there';

    const handlerUrl = requestInfo.handler(
      fakeXhrIo({
        'X-Goog-Upload-Status': 'active',
        'X-Goog-Upload-URL': uploadUrl
      }),
      ''
    );

    assert.equal(handlerUrl, uploadUrl);
  }
  it('getResumableUploadStatus request info', () => {
    const url =
      'https://this.is.totally.a.real.url.com/hello/upload?whatsgoingon';
    const requestInfo = requests.getResumableUploadStatus(
      authWrapper,
      locationNormal,
      url,
      smallBlob
    );
    assertObjectIncludes(
      {
        url: url,
        method: 'POST',
        urlParams: {},
        headers: { 'X-Goog-Upload-Command': 'query' }
      },
      requestInfo
    );
  });
  describe('getResumableUploadStatus handler', () => {
    const url =
      'https://this.is.totally.a.real.url.com/hello/upload?whatsgoingon';
    const requestInfo = requests.getResumableUploadStatus(
      authWrapper,
      locationNormal,
      url,
      smallBlob
    );

    let status = requestInfo.handler(
      fakeXhrIo({
        'X-Goog-Upload-Status': 'active',
        'X-Goog-Upload-Size-Received': '0'
      }),
      ''
    );
    let expectedStatus = new requests.ResumableUploadStatus(
      0,
      smallBlob.size(),
      false
    );
    assert.deepEqual(status, expectedStatus);

    status = requestInfo.handler(
      fakeXhrIo({
        'X-Goog-Upload-Status': 'final',
        'X-Goog-Upload-Size-Received': '' + smallBlob.size()
      }),
      ''
    );
    expectedStatus = new requests.ResumableUploadStatus(
      smallBlob.size(),
      smallBlob.size(),
      true
    );
    assert.deepEqual(status, expectedStatus);
  });
  it('continueResumableUpload request info', () => {
    const url =
      'https://this.is.totally.a.real.url.com/hello/upload?whatsgoingon';
    const requestInfo = requests.continueResumableUpload(
      locationNormal,
      authWrapper,
      url,
      smallBlob,
      requests.resumableUploadChunkSize,
      mappings
    );
    assertObjectIncludes(
      {
        url: url,
        method: 'POST',
        urlParams: {},
        headers: {
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Offset': 0
        }
      },
      requestInfo
    );

    return assertBodyEquals(requestInfo.body, smallBlobString);
  });
  it('continueResumableUpload handler', () => {
    const url =
      'https://this.is.totally.a.real.url.com/hello/upload?whatsgoingon';
    const chunkSize = requests.resumableUploadChunkSize;

    assert.isTrue(smallBlob.size() < chunkSize);
    let requestInfo = requests.continueResumableUpload(
      locationNormal,
      authWrapper,
      url,
      smallBlob,
      chunkSize,
      mappings
    );
    let status = requestInfo.handler(
      fakeXhrIo({ 'X-Goog-Upload-Status': 'final' }),
      serverResourceString
    );
    let expectedStatus = new requests.ResumableUploadStatus(
      smallBlob.size(),
      smallBlob.size(),
      true,
      metadataFromServerResource
    );
    assert.deepEqual(status, expectedStatus);

    assert.isTrue(bigBlob.size() > chunkSize);
    requestInfo = requests.continueResumableUpload(
      locationNormal,
      authWrapper,
      url,
      bigBlob,
      chunkSize,
      mappings
    );
    status = requestInfo.handler(
      fakeXhrIo({ 'X-Goog-Upload-Status': 'active' }),
      ''
    );
    expectedStatus = new requests.ResumableUploadStatus(
      chunkSize,
      bigBlob.size(),
      false
    );
    assert.deepEqual(status, expectedStatus);
  });

  it('error handler passes through unknown errors', () => {
    const requestInfo = requests.getMetadata(
      authWrapper,
      locationNormal,
      mappings
    );
    const error = errors.unknown();
    const resultError = requestInfo.errorHandler(fakeXhrIo({}, 509), error);
    assert.equal(resultError, error);
  });
  it('error handler converts 404 to not found', () => {
    const requestInfo = requests.getMetadata(
      authWrapper,
      locationNormal,
      mappings
    );
    const error = errors.unknown();
    const resultError = requestInfo.errorHandler(fakeXhrIo({}, 404), error);
    assert.isTrue(resultError.codeEquals(errors.Code.OBJECT_NOT_FOUND));
  });
  it('error handler converts 402 to quota exceeded', () => {
    const requestInfo = requests.getMetadata(
      authWrapper,
      locationNormal,
      mappings
    );
    const error = errors.unknown();
    const resultError = requestInfo.errorHandler(fakeXhrIo({}, 402), error);
    assert.isTrue(resultError.codeEquals(errors.Code.QUOTA_EXCEEDED));
  });
});
