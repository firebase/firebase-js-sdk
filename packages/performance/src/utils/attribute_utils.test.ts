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

import { Api } from '../services/api_service';

import {
  getVisibilityState,
  VisibilityState,
  getServiceWorkerStatus,
  getEffectiveConnectionType,
  isValidCustomAttributeName,
  isValidCustomAttributeValue
} from './attributes_utils';

import '../../test/setup';
import { vi } from 'vitest';

describe('Firebase Performance > attribute_utils', () => {
  describe('#getServiceWorkerStatus', () => {
    it('returns unsupported when service workers is in navigator but has a falsy value', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: { serviceWorker: undefined }
      } as unknown as Api);

      expect(getServiceWorkerStatus()).toEqual(1);
    });

    it('returns unsupported when service workers unsupported', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {}
      } as unknown as Api);

      expect(getServiceWorkerStatus()).toEqual(1);
    });

    it('returns controlled when service workers controlled', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          serviceWorker: {
            controller: {}
          }
        }
      } as unknown as Api);

      expect(getServiceWorkerStatus()).toEqual(2);
    });

    it('returns uncontrolled when service workers uncontrolled', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          serviceWorker: {}
        }
      } as unknown as Api);

      expect(getServiceWorkerStatus()).toEqual(3);
    });
  });

  describe('#getVisibilityState', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns visible when document is visible', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        document: {
          visibilityState: 'visible'
        }
      } as unknown as Api);
      expect(getVisibilityState()).toEqual(VisibilityState.VISIBLE);
    });

    it('returns hidden when document is hidden', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        document: {
          visibilityState: 'hidden'
        }
      } as unknown as Api);
      expect(getVisibilityState()).toEqual(VisibilityState.HIDDEN);
    });

    it('returns unknown when document is unknown', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        document: {
          visibilityState: 'unknown'
        }
      } as unknown as Api);
      expect(getVisibilityState()).toEqual(VisibilityState.UNKNOWN);
    });
  });

  describe('#getEffectiveConnectionType', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns EffectiveConnectionType.CONNECTION_SLOW_2G when slow-2g', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          connection: {
            effectiveType: 'slow-2g'
          }
        }
      } as unknown as Api);
      expect(getEffectiveConnectionType()).toEqual(1);
    });

    it('returns EffectiveConnectionType.CONNECTION_2G when 2g', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          connection: {
            effectiveType: '2g'
          }
        }
      } as unknown as Api);
      expect(getEffectiveConnectionType()).toEqual(2);
    });

    it('returns EffectiveConnectionType.CONNECTION_3G when 3g', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          connection: {
            effectiveType: '3g'
          }
        }
      } as unknown as Api);
      expect(getEffectiveConnectionType()).toEqual(3);
    });

    it('returns EffectiveConnectionType.CONNECTION_4G when 4g', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          connection: {
            effectiveType: '4g'
          }
        }
      } as unknown as Api);
      expect(getEffectiveConnectionType()).toEqual(4);
    });

    it('returns EffectiveConnectionType.UNKNOWN when unknown connection type', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          connection: {
            effectiveType: '5g'
          }
        }
      } as unknown as Api);
      expect(getEffectiveConnectionType()).toEqual(0);
    });

    it('returns EffectiveConnectionType.UNKNOWN when no effective type', () => {
      vi.spyOn(Api, 'getInstance').mockReturnValue({
        navigator: {
          connection: {}
        }
      } as unknown as Api);
      expect(getEffectiveConnectionType()).toEqual(0);
    });
  });

  describe('#isValidCustomAttributeName', () => {
    it('returns true when name is valid', () => {
      expect(isValidCustomAttributeName('validCustom_Attribute_Name')).toBe(
        true
      );
    });

    it('returns false when name is blank', () => {
      expect(isValidCustomAttributeName('')).toBe(false);
    });

    it('returns false when name is too long', () => {
      expect(
        isValidCustomAttributeName('invalid_custom_name_over_forty_characters')
      ).toBe(false);
    });

    it('returns false when name starts with a reserved prefix', () => {
      expect(isValidCustomAttributeName('firebase_invalidCustomName')).toBe(
        false
      );
    });

    it('returns false when name does not begin with a letter', () => {
      expect(isValidCustomAttributeName('_invalidCustomName')).toBe(false);
    });

    it('returns false when name contains prohibited characters', () => {
      expect(isValidCustomAttributeName('invalidCustomName&')).toBe(false);
    });
  });

  describe('#isValidCustomAttributeValue', () => {
    it('returns true when value is valid', () => {
      expect(isValidCustomAttributeValue('valid_attribute_value')).toBe(true);
    });

    it('returns false when value is blank', () => {
      expect(isValidCustomAttributeValue('')).toBe(false);
    });

    it('returns false when value is too long', () => {
      const longAttributeValue =
        'too_long_attribute_value_over_one_hundred_characters_too_long_attribute_value_over_one_' +
        'hundred_charac';
      expect(isValidCustomAttributeValue(longAttributeValue)).toBe(false);
    });
  });
});
