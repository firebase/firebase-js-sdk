/**
 * @license
 * Copyright 2017 Google Inc.
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

/**
 * @fileoverview Tests for object.js.
 */

goog.provide('fireauth.objectTest');

goog.require('fireauth.deprecation');
goog.require('fireauth.object');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');
goog.require('goog.userAgent');

goog.setTestOnly('fireauth.objectTest');

var stubs;

function setUp() {
  stubs = new goog.testing.PropertyReplacer();
}

function tearDown() {
  stubs.reset();
}


/** @type {boolean} True if the browser supports Object.defineProperty. */
var isReadonlyPropertyBrowser = !goog.userAgent.IE ||
    goog.userAgent.isDocumentModeOrHigher(9);


function testIsReadonlyConfigurable() {
  assertEquals(
    fireauth.object.isReadonlyConfigurable_(), isReadonlyPropertyBrowser);
}


function testSetReadonlyProperty() {
  var myObj = {
    'Argentina': 'Buenos Aires'
  };
  fireauth.object.setReadonlyProperty(myObj, 'Bolivia', 'Sucre');

  assertEquals('Buenos Aires', myObj['Argentina']);
  assertEquals('Sucre', myObj['Bolivia']);
}


function testSetReadonlyProperty_overwrite() {
  var myObj = {};

  fireauth.object.setReadonlyProperty(myObj, 'Argentina', 'Moscow');
  assertEquals('Moscow', myObj['Argentina']);

  fireauth.object.setReadonlyProperty(myObj, 'Argentina', 'Buenos Aires');
  assertEquals('Buenos Aires', myObj['Argentina']);
}


function testSetReadonlyProperty_instance() {
  var MyObj = function() {
    fireauth.object.setReadonlyProperty(this, 'Bolivia', 'Sucre');
  };
  var myInstance = new MyObj();
  assertEquals('Sucre', myInstance['Bolivia']);
}


function testSetReadonlyProperty_isActuallyReadonly() {
  if (!isReadonlyPropertyBrowser) {
    return;
  }

  var myObj = {};
  fireauth.object.setReadonlyProperty(myObj, 'Argentina', 'Buenos Aires');
  assertEquals('Buenos Aires', myObj['Argentina']);
  myObj['Argentina'] = 'Toronto';
  assertEquals('Buenos Aires', myObj['Argentina']);
}


function testSetReadonlyProperties() {
  var myObj = {};
  fireauth.object.setReadonlyProperties(myObj, {
    'Brazil': 'Brasilia',
    'Chile': 'Santiago'
  });
  assertEquals('Brasilia', myObj['Brazil']);
  assertEquals('Santiago', myObj['Chile']);
}


function testSetReadonlyProperties_isActuallyReadonly() {
  if (!isReadonlyPropertyBrowser) {
    return;
  }

  var myObj = {};
  fireauth.object.setReadonlyProperties(myObj, {
    'Brazil': 'Brasilia',
    'Chile': 'Santiago'
  });

  myObj['Brazil'] = 'Beijing';
  myObj['Chile'] = 'Seoul';

  assertEquals('Brasilia', myObj['Brazil']);
  assertEquals('Santiago', myObj['Chile']);
}


function testMakeReadonlyCopy() {
  var myObj = {
    'Brazil': 'Brasilia',
    'Chile': 'Santiago'
  };
  assertObjectEquals(myObj, fireauth.object.makeReadonlyCopy(myObj));
}


function testMakeReadonlyCopy_isActuallyReadonly() {
  if (!isReadonlyPropertyBrowser) {
    return;
  }

  var myObj = {
    'Brazil': 'Brasilia',
    'Chile': 'Santiago'
  };
  var copy = fireauth.object.makeReadonlyCopy(myObj);
  copy['Brazil'] = 'Paris';
  copy['Chile'] = 'London';
  assertObjectEquals(myObj, copy);
}


function testMakeWritableCopy() {
  var myObj = fireauth.object.makeReadonlyCopy({
    'Brazil': 'Brasilia',
    'Chile': 'Santiago'
  });
  assertObjectEquals(myObj, fireauth.object.makeWritableCopy(myObj));
}


function testMakeWritableCopy_isActuallyWritable() {
  var myObj = fireauth.object.makeReadonlyCopy({
    'Brazil': 'Brasilia',
    'Chile': 'Paris'
  });
  var copy = fireauth.object.makeWritableCopy(myObj);
  copy['Chile'] = 'Santiago';
  assertObjectEquals('Santiago', copy['Chile']);
}


function testhasNonEmptyFields_true() {
  var obj = {'a': 1, 'b': 2, 'c': 3};
  assertTrue(fireauth.object.hasNonEmptyFields(obj, ['a', 'c']));
}


function testhasNonEmptyFields_false() {
  var obj = {'a': 1, 'b': 2};
  assertFalse(fireauth.object.hasNonEmptyFields(obj, ['a', 'c']));
}


function testhasNonEmptyFields_empty() {
  var obj = {'a': 1, 'b': 2, 'c': 3};
  assertTrue(fireauth.object.hasNonEmptyFields(obj, []));
}


function testhasNonEmptyFields_objectUndefined() {
  assertFalse(fireauth.object.hasNonEmptyFields(undefined, ['a']));
}


function testhasNonEmptyFields_fieldsUndefined() {
  assertTrue(fireauth.object.hasNonEmptyFields({}, undefined));
}


function testhasNonEmptyFields_objectHasUndefinedField() {
  var obj = {'a': 1, 'b': 2, 'c': undefined};
  assertFalse(fireauth.object.hasNonEmptyFields(obj, ['a', 'c']));
}


function testhasNonEmptyFields_objectHasNullField() {
  var obj = {'a': null, 'b': 2, 'c': 3};
  assertFalse(fireauth.object.hasNonEmptyFields(obj, ['a', 'c']));
}


function testhasNonEmptyFields_objectHasEmptyStringField() {
  var obj = {'a': '', 'b': 'foo', 'c': 'bar'};
  assertFalse(fireauth.object.hasNonEmptyFields(obj, ['a', 'c']));
}


function testhasNonEmptyFields_objectHasZeroField() {
  var obj = {'a': 1, 'b': 2, 'c': 0};
  assertTrue(fireauth.object.hasNonEmptyFields(obj, ['a', 'c']));
}


function testhasNonEmptyFields_objectHasFalseField() {
  var obj = {'one': false, 'two': true, 'three': true};
  assertTrue(fireauth.object.hasNonEmptyFields(obj, ['one', 'three']));
}


function testUnsafeCreateReadOnlyCopy() {
  if (!isReadonlyPropertyBrowser) {
    return;
  }

  var myObj = {
    'a': [
      {'b': 1},
      'str',
      {}
    ]
  };
  // Create read-only copy.
  var copy = fireauth.object.unsafeCreateReadOnlyCopy(myObj);
  // Confirm object copied.
  assertObjectEquals(myObj, copy);
  assertEquals(1, copy['a'][0]['b']);
  // This will have no effect.
  copy['a'][0]['b'] = 2;
  assertEquals(1, copy['a'][0]['b']);
  // This should have no effect either.
  copy['a'][0] = 2;
  assertEquals(1, copy['a'][0]['b']);
}


function testUnsafeCreateReadOnlyCopy_nonCyclicalReferences() {
  if (!isReadonlyPropertyBrowser) {
    return;
  }

  var c = {};
  // a depends on c.
  var a = {'d': [c, 1]};
  var d = {'b': {'a': [0, a]}, 'c': c};
  var copy = fireauth.object.unsafeCreateReadOnlyCopy(d);
  assertObjectEquals(d, copy);
  // Should have no effect.
  copy['c'] = null;
  // Equal references copied.
  assertObjectEquals(copy['c'], copy['b']['a'][1]['d'][0]);

  var e = {
    'f': c,
    'g': [c, c],
    'h': c
  };
  var copy2 = fireauth.object.unsafeCreateReadOnlyCopy(e);
  assertObjectEquals(e, copy2);
  // Should have no effect.
  copy2['f'] = 1;
  // Equal references copied.
  assertObjectEquals(copy2['f'], copy2['g'][0]);
  assertObjectEquals(copy2['f'], copy2['h']);
}


function testSetDeprecatedReadonlyProperty() {
  var spyLog = goog.testing.recordFunction();
  stubs.replace(fireauth.deprecation, 'log', spyLog);


  var myObj = {
    'Argentina': 'Buenos Aires'
  };
  var warning = /** @type {fireauth.deprecation.Deprecations} */ (
      'Bolivia is deprecated.');
  fireauth.object.setDeprecatedReadonlyProperty(myObj, 'Bolivia', 'Sucre',
      warning);

  // The warning should not be shown until Bolivia is referenced.
  spyLog.assertCallCount(0);

  assertEquals('Buenos Aires', myObj['Argentina']);
  spyLog.assertCallCount(0);

  assertEquals('Sucre', myObj['Bolivia']);
  spyLog.assertCallCount(1);
  assertEquals(warning, spyLog.getLastCall().getArgument(0));

  assertEquals('Sucre', myObj['Bolivia']);
  spyLog.assertCallCount(2);
  assertEquals(warning, spyLog.getLastCall().getArgument(0));

  assertEquals('Buenos Aires', myObj['Argentina']);
  spyLog.assertCallCount(2);
}
