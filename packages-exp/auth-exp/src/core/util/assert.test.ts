import { expect } from 'chai';

import { FirebaseError } from '@firebase/util';

import { assertTypes, opt } from './assert';

class Parent {}
class Child extends Parent {}

describe('assertTypes', () => {
  context('basic types', () => {
    it('works when no arguments are present', () => {
      assertTypes([]);
    });

    it('works using a basic argument', () => {
      assertTypes(['foobar'], 'string');
      expect(() => assertTypes([46], 'string')).to.throw(FirebaseError, 'auth/argument-error');
      expect(() => assertTypes([], 'string')).to.throw(FirebaseError, 'auth/argument-error');
    });

    it('works using optional types with missing value', () => {
      assertTypes([], opt('string'));
      assertTypes([35], 'number', opt('string'));
    });

    it('works using optional types with value set', () => {
      assertTypes(['foo'], opt('string'));
      expect(() => assertTypes([46], opt('string'))).to.throw(FirebaseError, 'auth/argument-error');
    });

    it('works with multiple types', () => {
      assertTypes(['foo', null], 'string', 'null');
    });

    it('works with or\'d types', () => {
      assertTypes(['foo'], 'string|number');
      assertTypes([47], 'string|number');
    });

    it('works with the arguments field from a function', () => {
      function test(_name: string, _height?: unknown): void {
        assertTypes(arguments, 'string', opt('number'));
      }

      test('foo');
      test('foo', 11);
      expect(() => test('foo', 'bar')).to.throw(FirebaseError, 'auth/argument-error');
    });

    it('works with class types', () => {
      assertTypes([new Child()], Child);
      assertTypes([new Child()], Parent);
      assertTypes([new Parent()], opt(Parent));
      expect(() => assertTypes([new Parent()], Child)).to.throw(FirebaseError, 'auth/argument-error');
    });
  });

  context('record types', () => {
    it('works one level deep', () => {
      assertTypes([
        {foo: 'bar', clazz: new Child(), test: null}
      ], {
        foo: 'string',
        clazz: Parent,
        test: 'null',
        missing: opt('string'),
      });

      expect(() => assertTypes([
        {foo: 'bar', clazz: new Child(), test: null, missing: 46}
      ], {
        foo: 'string',
        clazz: Parent,
        test: 'null',
        missing: opt('string'),
      })).to.throw(FirebaseError, 'auth/argument-error');
    });

    it('works nested', () => {
      assertTypes([
        {name: 'foo', metadata: {height: 11, extraInfo: null}}
      ], {
        name: 'string',
        metadata: {
          height: opt('number'),
          extraInfo: 'string|null',
        }
      });

      expect(() => assertTypes([
        {name: 'foo', metadata: {height: 11, extraInfo: null}}
      ], {
        name: 'string',
        metadata: {
          height: opt('number'),
          extraInfo: 'string',
        }
      })).to.throw(FirebaseError, 'auth/argument-error');
    });

    it('works with triply nested', () => {
      assertTypes([
        {a: {b: {c: 'test'}}}],
        {a: {b: {c: 'string'}}}
      );
      
      expect(() => assertTypes([
        {a: {b: {c: 'test'}}}],
        {a: {b: {c: 'number'}}}
      )).to.throw(FirebaseError, 'auth/argument-error');
    });
  });
});