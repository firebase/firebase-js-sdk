/**
 * @license
 * Copyright 2019 Google Inc.
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
import { stub, SinonStub, useFakeTimers, SinonFakeTimers } from 'sinon';
import { expect } from 'chai';
import { SettingsService } from './settings_service';
import { CONFIG_EXPIRY_LOCAL_STORAGE_KEY } from '../constants';
import { setupApi } from './api_service';
import * as iidService from './iid_service';
import { getConfig } from './remote_config_service';
import { FirebaseApp } from '@firebase/app-types';
import '../../test/setup';

describe('Performance Monitoring > remote_config_service', () => {
  const IID = 'asd123';
  const AUTH_TOKEN = 'auth_token';
  const LOG_URL = 'https://firebaselogging.test.com';
  const LOG_SOURCE = 2;
  const NETWORK_SAMPLIG_RATE = 0.25;
  const TRACE_SAMPLING_RATE = 0.5;
  const GLOBAL_CLOCK_NOW = 1556524895326;
  const STRINGIFIED_CONFIG = `{"entries":{"fpr_enabled":"true",\
"fpr_log_endpoint_url":"https://firebaselogging.test.com",\
"fpr_log_source":"2","fpr_vc_network_request_sampling_rate":"0.250000",\
"fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
"state":"UPDATE"}`;
  const PROJECT_ID = 'project1';
  const APP_ID = '1:23r:web:fewq';
  const API_KEY = 'asdfghjk';

  let fetchStub: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
  let storageGetItemStub: SinonStub<[string], string | null>;
  let clock: SinonFakeTimers;

  setupApi(self);

  function storageGetItemFakeFactory(
    expiry: string,
    config: string
  ): (key: string) => string {
    return (key: string) => {
      if (key === CONFIG_EXPIRY_LOCAL_STORAGE_KEY) {
        return expiry;
      }
      return config;
    };
  }

  function resetSettingsService(): void {
    const settingsService = SettingsService.getInstance();
    settingsService.logSource = 462;
    settingsService.loggingEnabled = false;
    settingsService.networkRequestsSamplingRate = 1;
    settingsService.tracesSamplingRate = 1;
  }

  beforeEach(() => {
    fetchStub = stub(self, 'fetch');
    storageGetItemStub = stub(self.localStorage, 'getItem');
    stub(iidService, 'getAuthTokenPromise').returns(
      Promise.resolve(AUTH_TOKEN)
    );
    clock = useFakeTimers(GLOBAL_CLOCK_NOW);
    SettingsService.prototype.firebaseAppInstance = ({
      options: { projectId: PROJECT_ID, appId: APP_ID, apiKey: API_KEY }
    } as unknown) as FirebaseApp;
  });

  afterEach(() => {
    resetSettingsService();
    clock.restore();
  });

  describe('getConfig', () => {
    it('gets the config from the local storage if available and valid', async () => {
      // After global clock. Config not expired.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895330';
      storageGetItemStub.callsFake(
        storageGetItemFakeFactory(
          EXPIRY_LOCAL_STORAGE_VALUE,
          STRINGIFIED_CONFIG
        )
      );
      await getConfig(IID);

      expect(storageGetItemStub).to.be.called;
      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
      expect(SettingsService.getInstance().logEndPointUrl).to.equal(LOG_URL);
      expect(SettingsService.getInstance().logSource).to.equal(LOG_SOURCE);
      expect(
        SettingsService.getInstance().networkRequestsSamplingRate
      ).to.equal(NETWORK_SAMPLIG_RATE);
      expect(SettingsService.getInstance().tracesSamplingRate).to.equal(
        TRACE_SAMPLING_RATE
      );
    });

    it('does not call remote config if a valid config is in local storage', async () => {
      // After global clock. Config not expired.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895330';
      storageGetItemStub.callsFake(
        storageGetItemFakeFactory(
          EXPIRY_LOCAL_STORAGE_VALUE,
          STRINGIFIED_CONFIG
        )
      );
      await getConfig(IID);

      expect(fetchStub).not.to.be.called;
    });

    it('gets the config from RC if local version is not valid', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';
      storageGetItemStub.callsFake(
        storageGetItemFakeFactory(
          EXPIRY_LOCAL_STORAGE_VALUE,
          'not a valid config and should not be used'
        )
      );
      fetchStub.resolves(new Response(STRINGIFIED_CONFIG));
      await getConfig(IID);

      expect(storageGetItemStub).to.be.calledOnce;
      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
      expect(SettingsService.getInstance().logEndPointUrl).to.equal(LOG_URL);
      expect(SettingsService.getInstance().logSource).to.equal(LOG_SOURCE);
      expect(
        SettingsService.getInstance().networkRequestsSamplingRate
      ).to.equal(NETWORK_SAMPLIG_RATE);
      expect(SettingsService.getInstance().tracesSamplingRate).to.equal(
        TRACE_SAMPLING_RATE
      );
    });

    it('does not change the default config if call to RC fails', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';
      storageGetItemStub.callsFake(
        storageGetItemFakeFactory(
          EXPIRY_LOCAL_STORAGE_VALUE,
          'not a valid config and should not be used'
        )
      );
      fetchStub.rejects();
      await getConfig(IID);

      expect(SettingsService.getInstance().loggingEnabled).to.equal(false);
    });

    it('uses secondary configs if the response does not have all the fields', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';
      storageGetItemStub.callsFake(
        storageGetItemFakeFactory(
          EXPIRY_LOCAL_STORAGE_VALUE,
          'not a valid config and should not be used'
        )
      );
      const STRINGIFIED_PARTIAL_CONFIG = `{"entries":{\
      "fpr_vc_network_request_sampling_rate":"0.250000",\
      "fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
      "state":"UPDATE"}`;
      fetchStub.resolves(new Response(STRINGIFIED_PARTIAL_CONFIG));
      await getConfig(IID);

      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
    });

    it('uses secondary configs if the response does not have any fields', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';
      storageGetItemStub.callsFake(
        storageGetItemFakeFactory(
          EXPIRY_LOCAL_STORAGE_VALUE,
          'not a valid config and should not be used'
        )
      );
      const STRINGIFIED_PARTIAL_CONFIG = '{"state":"NO TEMPLATE"}';
      fetchStub.resolves(new Response(STRINGIFIED_PARTIAL_CONFIG));
      await getConfig(IID);

      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
    });
  });
});
