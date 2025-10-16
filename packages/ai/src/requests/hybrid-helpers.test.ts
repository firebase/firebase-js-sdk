/**
 * @license
 * Copyright 2025 Google LLC
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

import { use, expect } from 'chai';
import { SinonStub, SinonStubbedInstance, restore, stub } from 'sinon';
import { callCloudOrDevice } from './hybrid-helpers';
import {
  GenerateContentRequest,
  InferenceMode,
  AIErrorCode,
  InferenceSource
} from '../types';
import { AIError } from '../errors';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { ChromeAdapterImpl } from '../methods/chrome-adapter';

use(sinonChai);
use(chaiAsPromised);

describe('callCloudOrDevice', () => {
  let chromeAdapter: SinonStubbedInstance<ChromeAdapterImpl>;
  let onDeviceCall: SinonStub;
  let inCloudCall: SinonStub;
  let request: GenerateContentRequest;

  beforeEach(() => {
    // @ts-ignore
    chromeAdapter = {
      mode: InferenceMode.PREFER_ON_DEVICE,
      isAvailable: stub(),
      generateContent: stub(),
      generateContentStream: stub(),
      countTokens: stub()
    };
    onDeviceCall = stub().resolves('on-device-response');
    inCloudCall = stub().resolves('in-cloud-response');
    request = { contents: [] };
  });

  afterEach(() => {
    restore();
  });

  it('should call inCloudCall if chromeAdapter is undefined', async () => {
    const result = await callCloudOrDevice(
      request,
      undefined,
      onDeviceCall,
      inCloudCall
    );
    expect(result.response).to.equal('in-cloud-response');
    expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
    expect(inCloudCall).to.have.been.calledOnce;
    expect(onDeviceCall).to.not.have.been.called;
  });

  describe('PREFER_ON_DEVICE mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.PREFER_ON_DEVICE;
    });

    it('should call onDeviceCall if available', async () => {
      chromeAdapter.isAvailable.resolves(true);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('on-device-response');
      expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
      expect(onDeviceCall).to.have.been.calledOnce;
      expect(inCloudCall).to.not.have.been.called;
    });

    it('should call inCloudCall if not available', async () => {
      chromeAdapter.isAvailable.resolves(false);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('in-cloud-response');
      expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
      expect(inCloudCall).to.have.been.calledOnce;
      expect(onDeviceCall).to.not.have.been.called;
    });
  });

  describe('ONLY_ON_DEVICE mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.ONLY_ON_DEVICE;
    });

    it('should call onDeviceCall if available', async () => {
      chromeAdapter.isAvailable.resolves(true);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('on-device-response');
      expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
      expect(onDeviceCall).to.have.been.calledOnce;
      expect(inCloudCall).to.not.have.been.called;
    });

    it('should throw if not available', async () => {
      chromeAdapter.isAvailable.resolves(false);
      await expect(
        callCloudOrDevice(request, chromeAdapter, onDeviceCall, inCloudCall)
      ).to.be.rejectedWith(/on-device model is not available/);
      expect(inCloudCall).to.not.have.been.called;
      expect(onDeviceCall).to.not.have.been.called;
    });
  });

  describe('ONLY_IN_CLOUD mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.ONLY_IN_CLOUD;
    });

    it('should call inCloudCall even if on-device is available', async () => {
      chromeAdapter.isAvailable.resolves(true);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('in-cloud-response');
      expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
      expect(inCloudCall).to.have.been.calledOnce;
      expect(onDeviceCall).to.not.have.been.called;
    });
  });

  describe('PREFER_IN_CLOUD mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.PREFER_IN_CLOUD;
    });

    it('should call inCloudCall first', async () => {
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('in-cloud-response');
      expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
      expect(inCloudCall).to.have.been.calledOnce;
      expect(onDeviceCall).to.not.have.been.called;
    });

    it('should fall back to onDeviceCall if inCloudCall fails with AIErrorCode.FETCH_ERROR', async () => {
      inCloudCall.rejects(
        new AIError(AIErrorCode.FETCH_ERROR, 'Network error')
      );
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('on-device-response');
      expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
      expect(inCloudCall).to.have.been.calledOnce;
      expect(onDeviceCall).to.have.been.calledOnce;
    });

    it('should re-throw other errors from inCloudCall', async () => {
      const error = new AIError(AIErrorCode.RESPONSE_ERROR, 'safety problem');
      inCloudCall.rejects(error);
      await expect(
        callCloudOrDevice(request, chromeAdapter, onDeviceCall, inCloudCall)
      ).to.be.rejectedWith(error);
      expect(inCloudCall).to.have.been.calledOnce;
      expect(onDeviceCall).to.not.have.been.called;
    });
  });
});
