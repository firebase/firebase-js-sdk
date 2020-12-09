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
import { expect } from 'chai';
import { Value } from '../src/value';

describe('Value', () => {
  describe('asString', () => {
    it('returns static default string if source is static', () => {
      expect(new Value('static').asString()).to.eq('');
    });

    it('returns the value as a string', () => {
      const VALUE = 'test';
      const value = new Value('remote', VALUE);

      expect(value.asString()).to.eq(VALUE);
    });
  });

  describe('asBoolean', () => {
    it('returns static default boolean if source is static', () => {
      expect(new Value('static').asBoolean()).to.be.false;
    });

    it('returns true for a truthy values', () => {
      expect(new Value('remote', '1').asBoolean()).to.be.true;
      expect(new Value('remote', 'true').asBoolean()).to.be.true;
      expect(new Value('remote', 't').asBoolean()).to.be.true;
      expect(new Value('remote', 'yes').asBoolean()).to.be.true;
      expect(new Value('remote', 'y').asBoolean()).to.be.true;
      expect(new Value('remote', 'on').asBoolean()).to.be.true;
    });

    it('returns false for non-truthy values', () => {
      expect(new Value('remote', '').asBoolean()).to.be.false;
      expect(new Value('remote', 'false').asBoolean()).to.be.false;
      expect(new Value('remote', 'random string').asBoolean()).to.be.false;
    });
  });

  describe('asNumber', () => {
    it('returns static default number if source is static', () => {
      expect(new Value('static').asNumber()).to.eq(0);
    });

    it('returns value as a number', () => {
      expect(new Value('default', '33').asNumber()).to.eq(33);
      expect(new Value('default', 'not a number').asNumber()).to.eq(0);
      expect(new Value('default', '-10').asNumber()).to.eq(-10);
      expect(new Value('default', '0').asNumber()).to.eq(0);
      expect(new Value('default', '5.3').asNumber()).to.eq(5.3);
    });
  });

  describe('getSource', () => {
    it('returns the source of the value', () => {
      expect(new Value('default', 'test').getSource()).to.eq('default');
      expect(new Value('remote', 'test').getSource()).to.eq('remote');
      expect(new Value('static').getSource()).to.eq('static');
    });
  });
});
