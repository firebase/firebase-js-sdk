import { RequestInfo } from '../implementation/requestinfo';
import { Request, makeRequest as makeNetworkRequest } from '../implementation/request';
import { StorageImplNext } from './storage';

export function makeRequest<T>(
    storage: StorageImplNext,
    requestInfo: RequestInfo<T>,
    authToken: string | null
  ): Request<T> {
      const request = makeNetworkRequest(requestInfo, authToken, storage._xhrpool);
      storage._requestMap.addRequest(request);
      return request;
  }