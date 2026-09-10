/**
 * @license
 * Copyright 2024 Google LLC
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

import { expect, vi, MockInstance } from 'vitest';
import { getMockResponse } from '../../test-utils/mock-response';

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: {
    makeRequest: (..._args: any[]): any => {}
  }
}));

vi.mock('../requests/request', async importOriginal => {
  const actual = await importOriginal<any>();
  mockRequest.makeRequest = (...args: any[]) => actual.makeRequest(...args);
  return {
    ...actual,
    makeRequest: (...args: any[]) => mockRequest.makeRequest(...args)
  };
});

import { countTokens } from './count-tokens';
import { CountTokensRequest, InferenceMode } from '../types';
import { ApiSettings } from '../types/internal';
import { Task } from '../requests/request';
import { mapCountTokensRequest } from '../googleai-mappers';
import { GoogleAIBackend, AgentPlatformBackend } from '../backend';
import { fakeChromeAdapter } from '../../test-utils/get-fake-firebase-services';

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'global',
  backend: new AgentPlatformBackend()
};

const fakeGoogleAIApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: '',
  backend: new GoogleAIBackend()
};

const fakeRequestParams: CountTokensRequest = {
  contents: [{ parts: [{ text: 'hello' }], role: 'user' }]
};

describe('countTokens()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('total tokens', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-total-tokens.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await countTokens(
      fakeApiSettings,
      'model',
      fakeRequestParams,
      fakeChromeAdapter
    );
    expect(result.totalTokens).to.equal(6);
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.COUNT_TOKENS,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      expect.stringContaining('contents')
    );
  });
  it('total tokens with modality details', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-detailed-token-response.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await countTokens(
      fakeApiSettings,
      'model',
      fakeRequestParams,
      fakeChromeAdapter
    );
    expect(result.totalTokens).to.equal(1837);
    expect(result.totalBillableCharacters).to.equal(117);
    expect(result.promptTokensDetails?.[0].modality).to.equal('IMAGE');
    expect(result.promptTokensDetails?.[0].tokenCount).to.equal(1806);
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.COUNT_TOKENS,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      expect.stringContaining('contents')
    );
  });
  it('total tokens no billable characters', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-success-no-billable-characters.json'
    );
    const makeRequestStub = vi
      .spyOn(mockRequest, 'makeRequest')
      .mockResolvedValue(mockResponse as Response);
    const result = await countTokens(
      fakeApiSettings,
      'model',
      fakeRequestParams,
      fakeChromeAdapter
    );
    expect(result.totalTokens).to.equal(258);
    expect(result).to.not.have.property('totalBillableCharacters');
    expect(makeRequestStub).toHaveBeenCalledWith(
      {
        model: 'model',
        task: Task.COUNT_TOKENS,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      },
      expect.stringContaining('contents')
    );
  });
  it('model not found', async () => {
    const mockResponse = getMockResponse(
      'vertexAI',
      'unary-failure-model-not-found.json'
    );
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: mockResponse.json
    } as Response);
    await expect(
      countTokens(
        fakeApiSettings,
        'model',
        fakeRequestParams,
        fakeChromeAdapter
      )
    ).rejects.toThrow(/404.*not found/);
    expect(mockFetch).toHaveBeenCalled();
  });
  describe('googleAI', () => {
    let makeRequestStub: MockInstance;

    beforeEach(() => {
      makeRequestStub = vi.spyOn(mockRequest, 'makeRequest');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('maps request to GoogleAI format', async () => {
      makeRequestStub.mockResolvedValue({
        ok: true,
        json: () => {}
      } as Response); // Unused

      await countTokens(
        fakeGoogleAIApiSettings,
        'model',
        fakeRequestParams,
        fakeChromeAdapter
      );

      expect(makeRequestStub).toHaveBeenCalledWith(
        {
          model: 'model',
          task: Task.COUNT_TOKENS,
          apiSettings: fakeGoogleAIApiSettings,
          stream: false,
          singleRequestOptions: undefined
        },
        JSON.stringify(mapCountTokensRequest(fakeRequestParams, 'model'))
      );
    });
  });
  it('throws if mode is ONLY_ON_DEVICE', async () => {
    const chromeAdapter = {
      ...fakeChromeAdapter,
      mode: InferenceMode.ONLY_ON_DEVICE
    };
    await expect(
      countTokens(fakeApiSettings, 'model', fakeRequestParams, chromeAdapter)
    ).rejects.toThrow(/countTokens\(\) is not supported for on-device models/);
  });
});
