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
import { stub, useFakeTimers, SinonFakeTimers, SinonStub } from 'sinon';
import { expect } from 'chai';
import { SettingsService } from './settings_service';
import { CONFIG_EXPIRY_LOCAL_STORAGE_KEY } from '../constants';
import { setupApi, Api } from './api_service';
import * as iidService from './iid_service';
import {
  getConfig,
  isDestTransport,
  getHashPercent
} from './remote_config_service';
import { FirebaseApp } from '@firebase/app-types';
import '../../test/setup';

describe('Performance Monitoring > remote_config_service', () => {
  const IID = 'asd123';
  const AUTH_TOKEN = 'auth_token';
  const LOG_URL = 'https://firebaselogging.test.com';
  const TRANSPORT_KEY = 'pseudo-transport-key';
  const LOG_SOURCE = 2;
  const NETWORK_SAMPLIG_RATE = 0.25;
  const TRACE_SAMPLING_RATE = 0.5;
  const GLOBAL_CLOCK_NOW = 1556524895326;
  const STRINGIFIED_CONFIG = `{"entries":{"fpr_enabled":"true",\
  "fpr_log_endpoint_url":"https://firebaselogging.test.com",\
  "fpr_log_transport_key":"pseudo-transport-key",\
  "fpr_log_source":"2","fpr_vc_network_request_sampling_rate":"0.250000",\
  "fpr_log_transport_web_percent":"100.0",\
  "fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
  "state":"UPDATE"}`;
  const PROJECT_ID = 'project1';
  const APP_ID = '1:23r:web:fewq';
  const API_KEY = 'asdfghjk';
  const NOT_VALID_CONFIG = 'not a valid config and should not be used';

  let clock: SinonFakeTimers;

  setupApi(self);
  const ApiInstance = Api.getInstance();

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

  // parameterized beforeEach. Should be called at beginning of each test.
  function setup(
    storageConfig: { expiry: string; config: string },
    fetchConfig?: { reject: boolean; value?: Response }
  ): {
    storageGetItemStub: SinonStub<[string], string | null>;
    fetchStub: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
  } {
    const fetchStub = stub(self, 'fetch');

    if (fetchConfig) {
      fetchConfig.reject
        ? fetchStub.rejects()
        : fetchStub.resolves(fetchConfig.value);
    }

    stub(iidService, 'getAuthTokenPromise').returns(
      Promise.resolve(AUTH_TOKEN)
    );

    clock = useFakeTimers(GLOBAL_CLOCK_NOW);
    SettingsService.prototype.firebaseAppInstance = ({
      options: { projectId: PROJECT_ID, appId: APP_ID, apiKey: API_KEY }
    } as unknown) as FirebaseApp;

    // we need to stub the entire localStorage, because storage can't be stubbed in Firefox and IE.
    // stubbing on self(window) seems to only work the first time (at least in Firefox), the subsequent
    // tests will have the same stub. stub.reset() in afterEach doesn't help either. As a result, we stub on ApiInstance.
    // https://github.com/sinonjs/sinon/issues/662
    const storageStub = stub(ApiInstance, 'localStorage');
    const getItemStub: SinonStub<[string], string | null> = stub();

    storageStub.value({
      getItem: getItemStub.callsFake(
        storageGetItemFakeFactory(storageConfig.expiry, storageConfig.config)
      ),
      setItem: () => {}
    });

    return { storageGetItemStub: getItemStub, fetchStub };
  }

  afterEach(() => {
    resetSettingsService();
    clock.restore();
  });

  describe('getConfig', () => {
    it('gets the config from the local storage if available and valid', async () => {
      // After global clock. Config not expired.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895330';
      const { storageGetItemStub: getItemStub } = setup({
        expiry: EXPIRY_LOCAL_STORAGE_VALUE,
        config: STRINGIFIED_CONFIG
      });

      await getConfig(IID);

      expect(getItemStub).to.be.called;
      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
      expect(SettingsService.getInstance().logEndPointUrl).to.equal(LOG_URL);
      expect(SettingsService.getInstance().transportKey).to.equal(
        TRANSPORT_KEY
      );
      expect(SettingsService.getInstance().logSource).to.equal(LOG_SOURCE);
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.true;
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

      const { fetchStub } = setup({
        expiry: EXPIRY_LOCAL_STORAGE_VALUE,
        config: STRINGIFIED_CONFIG
      });

      await getConfig(IID);

      expect(fetchStub).not.to.be.called;
    });

    it('gets the config from RC if local version is not valid', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';

      const { storageGetItemStub: getItemStub } = setup(
        { expiry: EXPIRY_LOCAL_STORAGE_VALUE, config: STRINGIFIED_CONFIG },
        { reject: false, value: new Response(STRINGIFIED_CONFIG) }
      );

      await getConfig(IID);

      expect(getItemStub).to.be.calledOnce;
      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
      expect(SettingsService.getInstance().logEndPointUrl).to.equal(LOG_URL);
      expect(SettingsService.getInstance().transportKey).to.equal(
        TRANSPORT_KEY
      );
      expect(SettingsService.getInstance().logSource).to.equal(LOG_SOURCE);
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.true;
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

      setup(
        {
          expiry: EXPIRY_LOCAL_STORAGE_VALUE,
          config: NOT_VALID_CONFIG
        },
        { reject: true }
      );

      await getConfig(IID);

      expect(SettingsService.getInstance().loggingEnabled).to.equal(false);
    });

    it('uses secondary configs if the response does not have all the fields', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';
      const STRINGIFIED_PARTIAL_CONFIG = `{"entries":{\
      "fpr_vc_network_request_sampling_rate":"0.250000",\
      "fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
      "state":"UPDATE"}`;

      setup(
        {
          expiry: EXPIRY_LOCAL_STORAGE_VALUE,
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response(STRINGIFIED_PARTIAL_CONFIG) }
      );

      await getConfig(IID);

      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
    });

    it('uses secondary configs if the response does not have any fields', async () => {
      // Expired local config.
      const EXPIRY_LOCAL_STORAGE_VALUE = '1556524895320';
      const STRINGIFIED_PARTIAL_CONFIG = '{"state":"NO_TEMPLATE"}';

      setup(
        {
          expiry: EXPIRY_LOCAL_STORAGE_VALUE,
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response(STRINGIFIED_PARTIAL_CONFIG) }
      );
      await getConfig(IID);

      expect(SettingsService.getInstance().loggingEnabled).to.be.true;
    });

    it('marks event destination to cc if there is no template', async () => {
      setup(
        {
          // Expired local config.
          expiry: '1556524895320',
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response('{"state":"NO_TEMPLATE"}') }
      );
      await getConfig(IID);

      // If no template, will send to cc.
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.false;
    });

    it('marks event destination to cc if instance state unspecified', async () => {
      setup(
        {
          // Expired local config.
          expiry: '1556524895320',
          config: NOT_VALID_CONFIG
        },
        {
          reject: false,
          value: new Response('{"state":"INSTANCE_STATE_UNSPECIFIED"}')
        }
      );
      await getConfig(IID);

      // If instance state unspecified, will send to cc.
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.false;
    });

    it("marks event destination to cc if state doesn't exist", async () => {
      setup(
        {
          // Expired local config.
          expiry: '1556524895320',
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response('{}') }
      );
      await getConfig(IID);

      // If "state" doesn't exist, will send to cc.
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.false;
    });

    it('marks event destination to transport if template exists but no rollout flag', async () => {
      const CONFIG_WITHOUT_ROLLOUT_FLAG = `{"entries":{"fpr_enabled":"true",\
    "fpr_log_endpoint_url":"https://firebaselogging.test.com",\
    "fpr_log_source":"2","fpr_vc_network_request_sampling_rate":"0.250000",\
    "fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
    "state":"UPDATE"}`;
      setup(
        {
          // Expired local config.
          expiry: '1556524895320',
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response(CONFIG_WITHOUT_ROLLOUT_FLAG) }
      );
      await getConfig(IID);

      // If template exists but no rollout flag, will send to transport.
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.true;
    });

    it('marks event destination to cc when instance is outside of rollout range', async () => {
      const CONFIG_WITH_ROLLOUT_FLAG_10 = `{"entries":{"fpr_enabled":"true",\
    "fpr_log_endpoint_url":"https://firebaselogging.test.com",\
    "fpr_log_source":"2","fpr_vc_network_request_sampling_rate":"0.250000",\
    "fpr_log_transport_web_percent":"10.0",\
    "fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
    "state":"UPDATE"}`;
      setup(
        {
          // Expired local config.
          expiry: '1556524895320',
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response(CONFIG_WITH_ROLLOUT_FLAG_10) }
      );
      await getConfig(IID);

      // If rollout flag exists, will send to cc when this instance is out of rollout scope.
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.false;
    });

    it('marks event destination to transport when instance is within rollout range', async () => {
      const CONFIG_WITH_ROLLOUT_FLAG_40 = `{"entries":{"fpr_enabled":"true",\
    "fpr_log_endpoint_url":"https://firebaselogging.test.com",\
    "fpr_log_source":"2","fpr_vc_network_request_sampling_rate":"0.250000",\
    "fpr_log_transport_web_percent":"40.0",\
    "fpr_vc_session_sampling_rate":"0.250000","fpr_vc_trace_sampling_rate":"0.500000"},\
    "state":"UPDATE"}`;
      setup(
        {
          // Expired local config.
          expiry: '1556524895320',
          config: NOT_VALID_CONFIG
        },
        { reject: false, value: new Response(CONFIG_WITH_ROLLOUT_FLAG_40) }
      );
      await getConfig(IID);

      // If rollout flag exists, will send to transport when this instance is within rollout scope.
      expect(SettingsService.getInstance().shouldSendToTransport).to.be.true;
    });
  });

  describe('getHashPercent', () => {
    it('distributes to 100 buckets with 10000 samples', () => {
      const buckets: number[] = [];
      for (let i = 0; i < 100; i++) {
        buckets.push(0);
      }
      for (let i = 0; i < 10000; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        buckets[getHashPercent(randomString)] += 1;
      }
      for (let i = 0; i < 100; i++) {
        expect(buckets[i]).to.be.greaterThan(0);
      }
      expect(buckets.length).to.be.equal(100);
    });

    it('generates same hash value with same seed', () => {
      const randomString1 = Math.random()
        .toString(36)
        .substring(7, 29);
      const hashValue1 = getHashPercent(randomString1);
      const randomString2 = Math.random()
        .toString(36)
        .substring(7, 29);
      const hashValue2 = getHashPercent(randomString2);
      const randomString3 = Math.random()
        .toString(36)
        .substring(7, 29);
      const hashValue3 = getHashPercent(randomString3);

      expect(getHashPercent(randomString1)).to.be.equal(hashValue1);
      expect(getHashPercent(randomString2)).to.be.equal(hashValue2);
      expect(getHashPercent(randomString3)).to.be.equal(hashValue3);
    });
  });

  describe('isDestTransport', () => {
    it('marks traffic to cc when rollout percentage is 0', () => {
      let toCc = 0;
      let toTransport = 0;
      const sampleAmount = 10000;

      for (let i = 0; i < sampleAmount; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        if (isDestTransport(randomString, 0)) {
          toTransport += 1;
        } else {
          toCc += 1;
        }
      }
      expect(toCc).to.be.equal(sampleAmount);
      expect(toTransport).to.be.equal(0);
    });

    it('marks traffic to transport when rollout percentage is 100', () => {
      let toCc = 0;
      let toTransport = 0;
      const sampleAmount = 10000;

      for (let i = 0; i < sampleAmount; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        if (isDestTransport(randomString, 100)) {
          toTransport += 1;
        } else {
          toCc += 1;
        }
      }
      expect(toCc).to.be.equal(0);
      expect(toTransport).to.be.equal(sampleAmount);
    });

    it('marks roughly half of traffic goes to transport when rollout percentage is 50', () => {
      let toCc = 0;
      let toTransport = 0;
      const sampleAmount = 10000;

      for (let i = 0; i < sampleAmount; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        if (isDestTransport(randomString, 50)) {
          toTransport += 1;
        } else {
          toCc += 1;
        }
      }
      const diff = Math.abs(toCc - toTransport);
      console.log(
        'Transport traffic is ' +
          (toTransport * 100) / sampleAmount +
          '% when rollout 50%.'
      );
      expect(diff).to.be.lessThan(2000);
    });
  });
});
