/**
 * @license
 * Copyright 2026 Google LLC
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

import { describe, expect, it } from 'vitest';
import { getGlobal, isNode } from '@firebase/util';
import { chromeAdapterFactory, ChromeAdapterImpl } from './chrome-adapter';
import { InferenceMode } from '../types';
import { LanguageModel } from '../types/language-model';

describe('chromeAdapterFactory', () => {
  it.skipIf(!isNode())('returns undefined in native Node environment', () => {
    const adapter = chromeAdapterFactory(
      InferenceMode.PREFER_ON_DEVICE,
      undefined
    );
    expect(adapter).toBeUndefined();
  });

  it('returns undefined when LanguageModel is not defined on global object', () => {
    const globalObj = getGlobal() as Record<string, unknown>;
    const originalLM = globalObj.LanguageModel;
    try {
      delete globalObj.LanguageModel;
      const adapter = chromeAdapterFactory(
        InferenceMode.PREFER_ON_DEVICE,
        undefined
      );
      expect(adapter).toBeUndefined();
    } finally {
      if (originalLM !== undefined) {
        globalObj.LanguageModel = originalLM;
      }
    }
  });

  it('instantiates ChromeAdapterImpl when LanguageModel is defined on any global object', () => {
    const globalObj = getGlobal() as Record<string, unknown>;
    const originalLM = globalObj.LanguageModel;
    const fakeLanguageModel = {} as LanguageModel;
    try {
      globalObj.LanguageModel = fakeLanguageModel;
      const adapter = chromeAdapterFactory(
        InferenceMode.PREFER_ON_DEVICE,
        undefined
      );
      expect(adapter).toBeInstanceOf(ChromeAdapterImpl);
      expect(adapter?.languageModelProvider).toBe(fakeLanguageModel);
    } finally {
      if (originalLM !== undefined) {
        globalObj.LanguageModel = originalLM;
      } else {
        delete globalObj.LanguageModel;
      }
    }
  });
});
