import { RequestInfo, UrlParams } from '../implementation/requestinfo';
import { Metadata } from '../metadata';
import { Mappings, toResourceString } from '../implementation/metadata';
import { FbsBlob } from '../implementation/blob';
import { LocationNext } from './location';
import { metadataForUpload_ } from '../implementation/requests';
import { Location } from '../implementation/location';
import { cannotSliceBlob } from '../implementation/error';
import { makeUrl } from '../implementation/url';

export function multipartUpload(
    location: LocationNext,
    mappings: Mappings,
    blob: FbsBlob,
    metadata?: Metadata | null
  ): RequestInfo<Metadata> {
    const urlPart = location.bucketOnlyServerUrl();
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
    const timeout = authWrapper.maxUploadRetryTime();
    const requestInfo = new RequestInfo(
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