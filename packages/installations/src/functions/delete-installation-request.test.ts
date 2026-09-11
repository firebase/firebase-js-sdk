/**
 * @license
 * Copyright 2019 Google LLC
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

import { FirebaseError } from '@firebase/util';
import { expect, vi, MockInstance, describe, it, beforeEach } from 'vitest';
import { AppConfig } from '../interfaces/installation-impl';
import {
  RegisteredInstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { compareHeaders } from '../testing/compare-headers';
import { getFakeAppConfig } from '../testing/fake-generators';
import '../testing/setup';
import {
  INSTALLATIONS_API_URL,
  INTERNAL_AUTH_VERSION
} from '../util/constants';
import { ErrorResponse } from './common';
import { deleteInstallationRequest } from './delete-installation-request';

const FID = 'foreclosure-of-a-dream';

describe('deleteInstallationRequest', () => {
  let appConfig: AppConfig;
  let fetchSpy: MockInstance<typeof fetch>;
  let registeredInstallationEntry: RegisteredInstallationEntry;

  beforeEach(() => {
    appConfig = getFakeAppConfig();

    registeredInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.COMPLETED,
      refreshToken: 'refreshToken',
      authToken: {
        requestStatus: RequestStatus.NOT_STARTED
      }
    };

    fetchSpy = vi.spyOn(self, 'fetch') as unknown as MockInstance<typeof fetch>;
  });

  describe('successful request', () => {
    beforeEach(() => {
      fetchSpy.mockResolvedValue(new Response());
    });

    it('calls the deleteInstallation server API with correct parameters', async () => {
      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `${INTERNAL_AUTH_VERSION} refreshToken`,
        'x-goog-api-key': 'apiKey'
      });
      const expectedRequest: RequestInit = {
        method: 'DELETE',
        headers: expectedHeaders
      };
      const expectedEndpoint = `${INSTALLATIONS_API_URL}/projects/projectId/installations/${FID}`;

      await deleteInstallationRequest(appConfig, registeredInstallationEntry);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(expectedEndpoint, expectedRequest);
      const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
      const actualHeaders = (lastCall[1] as RequestInit).headers as Headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });
  });

  describe('failed request', () => {
    it('throws a FirebaseError with the error information from the server', async () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: 409,
          message: 'Requested entity already exists',
          status: 'ALREADY_EXISTS'
        }
      };

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(errorResponse), { status: 409 })
      );

      await expect(
        deleteInstallationRequest(appConfig, registeredInstallationEntry)
      ).rejects.toThrow(FirebaseError);
    });

    it('retries once if the server returns a 5xx error', async () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: 500,
          message: 'Internal server error',
          status: 'SERVER_ERROR'
        }
      };

      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), { status: 500 })
        )
        .mockResolvedValueOnce(new Response());

      await expect(
        deleteInstallationRequest(appConfig, registeredInstallationEntry)
      ).resolves.not.toThrow();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
