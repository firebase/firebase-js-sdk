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
    chromeAdapter = {
      mode: InferenceMode.PREFER_ON_DEVICE,
      isAvailable: vi.fn().mockResolvedValue(true),
      getOnDeviceStatus: vi.fn().mockResolvedValue('available'),
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

  async function expectAIError(
    promise: Promise<unknown>,
    code: AIErrorCode
  ): Promise<void> {
    await expect(promise).rejects.toSatisfy(
      e => e instanceof AIError && e.code === code
    );
  }

  function expectCloud(result: any): void {
    expect(result.response).to.equal('in-cloud-response');
    expect(result.inferenceSource).to.equal(InferenceSource.IN_CLOUD);
    expect(inCloudCall).toHaveBeenCalledOnce();
    expect(onDeviceCall).not.toHaveBeenCalled();
  }

  function expectOnDevice(result: any): void {
    expect(result.response).to.equal('on-device-response');
    expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
    expect(onDeviceCall).toHaveBeenCalledOnce();
    expect(inCloudCall).not.toHaveBeenCalled();
  }

  it('should call inCloudCall if mode is undefined', async () => {
    expectCloud(
      await callCloudOrDevice(
        request,
        undefined,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      )
    );
    expect(chromeAdapter.isAvailable).not.toHaveBeenCalled();
    expect(chromeAdapter.getOnDeviceStatus).not.toHaveBeenCalled();
  });

  it('should call inCloudCall if mode and chromeAdapter are undefined', async () => {
    expectCloud(
      await callCloudOrDevice(
        request,
        undefined,
        undefined,
        onDeviceCall,
        inCloudCall
      )
    );
  });

  describe('PREFER_ON_DEVICE mode', () => {
    const mode = InferenceMode.PREFER_ON_DEVICE;

    it('should call onDeviceCall if available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(true);
      expectOnDevice(
        await callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      );
    });

    it('should call inCloudCall if not available', async () => {
      chromeAdapter.isAvailable.mockResolvedValue(false);
      expectCloud(
        await callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      );
    });

    it('should call inCloudCall if chromeAdapter is undefined', async () => {
      expectCloud(
        await callCloudOrDevice(
          request,
          mode,
          undefined,
          onDeviceCall,
          inCloudCall
        )
      );
    });
  });

  describe('ONLY_ON_DEVICE mode', () => {
    const mode = InferenceMode.ONLY_ON_DEVICE;

    it('should call onDeviceCall if available, waiting for any download', async () => {
      expectOnDevice(
        await callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      );
      expect(chromeAdapter.getOnDeviceStatus).toHaveBeenCalledWith(request, {
        waitForDownload: true
      });
    });

    it('should still call onDeviceCall if the request may not be supported', async () => {
      chromeAdapter.getOnDeviceStatus.mockResolvedValue(
        'request-not-supported'
      );
      expectOnDevice(
        await callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      );
    });

    it('should throw DEVICE_MODEL_NOT_INITIALIZED if initializeDeviceModel() was not called', async () => {
      chromeAdapter.getOnDeviceStatus.mockResolvedValue('not-initialized');
      await expectAIError(
        callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        ),
        AIErrorCode.DEVICE_MODEL_NOT_INITIALIZED
      );
      expect(inCloudCall).not.toHaveBeenCalled();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });

    it('should throw API_NOT_ENABLED if unavailable', async () => {
      chromeAdapter.getOnDeviceStatus.mockResolvedValue('unavailable');
      await expectAIError(
        callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        ),
        AIErrorCode.API_NOT_ENABLED
      );
      expect(inCloudCall).not.toHaveBeenCalled();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });

    it('should throw API_NOT_ENABLED, not call the cloud, if chromeAdapter is undefined', async () => {
      await expectAIError(
        callCloudOrDevice(request, mode, undefined, onDeviceCall, inCloudCall),
        AIErrorCode.API_NOT_ENABLED
      );
      expect(inCloudCall).not.toHaveBeenCalled();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });
  });

  describe('ONLY_IN_CLOUD mode', () => {
    const mode = InferenceMode.ONLY_IN_CLOUD;

    it('should call inCloudCall even if on-device is available', async () => {
      expectCloud(
        await callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      );
      expect(chromeAdapter.isAvailable).not.toHaveBeenCalled();
      expect(chromeAdapter.getOnDeviceStatus).not.toHaveBeenCalled();
    });
  });

  describe('PREFER_IN_CLOUD mode', () => {
    const mode = InferenceMode.PREFER_IN_CLOUD;

    it('should call inCloudCall first', async () => {
      expectCloud(
        await callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      );
    });

    it('should fall back to onDeviceCall if inCloudCall fails with AIErrorCode.FETCH_ERROR', async () => {
      inCloudCall.mockRejectedValue(
        new AIError(AIErrorCode.FETCH_ERROR, 'Network error')
      );
      const result = await callCloudOrDevice(
        request,
        mode,
        chromeAdapter,
        onDeviceCall,
        inCloudCall
      );
      expect(result.response).to.equal('on-device-response');
      expect(result.inferenceSource).to.equal(InferenceSource.ON_DEVICE);
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).toHaveBeenCalledOnce();
    });

    it('should re-throw the cloud error if on-device is not available', async () => {
      const error = new AIError(AIErrorCode.FETCH_ERROR, 'Network error');
      inCloudCall.mockRejectedValue(error);
      chromeAdapter.isAvailable.mockResolvedValue(false);
      await expect(
        callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      ).rejects.toThrow(error);
      expect(onDeviceCall).not.toHaveBeenCalled();
    });

    it('should re-throw the cloud error if chromeAdapter is undefined', async () => {
      const error = new AIError(AIErrorCode.FETCH_ERROR, 'Network error');
      inCloudCall.mockRejectedValue(error);
      await expect(
        callCloudOrDevice(request, mode, undefined, onDeviceCall, inCloudCall)
      ).rejects.toThrow(error);
      expect(onDeviceCall).not.toHaveBeenCalled();
    });

    it('should re-throw other errors from inCloudCall', async () => {
      const error = new AIError(AIErrorCode.RESPONSE_ERROR, 'safety problem');
      inCloudCall.mockRejectedValue(error);
      await expect(
        callCloudOrDevice(
          request,
          mode,
          chromeAdapter,
          onDeviceCall,
          inCloudCall
        )
      ).rejects.toThrow(error);
      expect(inCloudCall).toHaveBeenCalledOnce();
      expect(onDeviceCall).not.toHaveBeenCalled();
    });
  });
});
