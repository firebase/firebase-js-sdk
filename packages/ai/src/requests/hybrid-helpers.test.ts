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

import { expect, vi } from 'vitest';
import { callCloudOrDevice } from './hybrid-helpers';
import {
  GenerateContentRequest,
  InferenceMode,
  AIErrorCode,
  InferenceSource
} from '../types';
import { AIError } from '../errors';

describe('callCloudOrDevice', () => {
  let chromeAdapter: any;
  let onDeviceCall: any;
  let inCloudCall: any;
  let request: GenerateContentRequest;

  beforeEach(() => {
    // @ts-ignore
    chromeAdapter = {
      mode: InferenceMode.PREFER_ON_DEVICE,
      // @ts-ignore
      isAvailable: vi.fn().mockResolvedValue(true),
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
      countTokens: vi.fn()
    };
    onDeviceCall = vi.fn().mockResolvedValue('on-device-response');
    inCloudCall = vi.fn().mockResolvedValue('in-cloud-response');
    request = { contents: [] };
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(inCloudCall).toHaveBeenCalledOnce();
    expect(onDeviceCall).not.toHaveBeenCalled();
  });

  describe('PREFER_ON_DEVICE mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.PREFER_ON_DEVICE;
    });

    it('should call onDeviceCall if available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(true);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('on-device-response');
      expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
      expect(onDeviceCall).toHaveBeenCalledOnce();
      expect(inCloudCall).not.toHaveBeenCalled();
    });

    it('should call inCloudCall if not available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(false);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('in-cloud-response');
      expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });
  });

  describe('ONLY_ON_DEVICE mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.ONLY_ON_DEVICE;
    });

    it('should call onDeviceCall if available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(true);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('on-device-response');
      expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
      expect(onDeviceCall).toHaveBeenCalledOnce();
      expect(inCloudCall).not.toHaveBeenCalled();
    });

    it('should throw if not available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(false);
      await expect(
        callCloudOrDevice(request, chromeAdapter, onDeviceCall, inCloudCall)
      ).rejects.toThrow(/on-device model is not available/);
      expect(inCloudCall).not.toHaveBeenCalled();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });
  });

  describe('ONLY_IN_CLOUD mode', () => {
    beforeEach(() => {
      chromeAdapter.mode = InferenceMode.ONLY_IN_CLOUD;
    });

    it('should call inCloudCall even if on-device is available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(true);
      const result = await callCloudOrDevice(
        request,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('in-cloud-response');
      expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).not.toHaveBeenCalled();
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
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });

    it('should fall back to onDeviceCall if inCloudCall fails with AIErrorCode.FETCH_ERROR', async () => {
      inCloudCall.mockRejectedValue(
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
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).toHaveBeenCalledOnce();
    });

    it('should re-throw other errors from inCloudCall', async () => {
      const error = new AIError(AIErrorCode.RESPONSE_ERROR, 'safety problem');
      inCloudCall.mockRejectedValue(error);
      await expect(
        callCloudOrDevice(request, chromeAdapter, onDeviceCall, inCloudCall)
      ).rejects.toThrow(error);
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });
  });
});
