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

import './setup';
import { expect } from 'vitest';
import { Value } from '../src/value';

describe('Value', () => {
  describe('asString', () => {
    it('returns static default string if source is static', () => {
      expect(new Value('static').asString()).toBe('');
    });

    it('returns the value as a string', () => {
      const VALUE = 'test';
      const value = new Value('remote', VALUE);

      expect(value.asString()).toBe(VALUE);
    });
  });

  describe('asBoolean', () => {
    it('returns static default boolean if source is static', () => {
      expect(new Value('static').asBoolean()).toBe(false);
    });

    it('returns true for a truthy values', () => {
      expect(new Value('remote', '1').asBoolean()).toBe(true);
      expect(new Value('remote', 'true').asBoolean()).toBe(true);
      expect(new Value('remote', 't').asBoolean()).toBe(true);
      expect(new Value('remote', 'yes').asBoolean()).toBe(true);
      expect(new Value('remote', 'y').asBoolean()).toBe(true);
      expect(new Value('remote', 'on').asBoolean()).toBe(true);
    });

    it('returns false for non-truthy values', () => {
      expect(new Value('remote', '').asBoolean()).toBe(false);
      expect(new Value('remote', 'false').asBoolean()).toBe(false);
      expect(new Value('remote', 'random string').asBoolean()).toBe(false);
    });
  });

  describe('asNumber', () => {
    it('returns static default number if source is static', () => {
      expect(new Value('static').asNumber()).toBe(0);
    });

    it('returns value as a number', () => {
      expect(new Value('default', '33').asNumber()).toBe(33);
      expect(new Value('default', 'not a number').asNumber()).toBe(0);
      expect(new Value('default', '-10').asNumber()).toBe(-10);
      expect(new Value('default', '0').asNumber()).toBe(0);
      expect(new Value('default', '5.3').asNumber()).toBe(5.3);
    });
  });

  describe('getSource', () => {
    it('returns the source of the value', () => {
      expect(new Value('default', 'test').getSource()).toBe('default');
      expect(new Value('remote', 'test').getSource()).toBe('remote');
      expect(new Value('static').getSource()).toBe('static');
    });
  });
});
