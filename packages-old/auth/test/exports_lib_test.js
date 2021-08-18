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

goog.provide('fireauth.exportlibTest');

goog.require('fireauth.args');
goog.require('fireauth.exportlib');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.exportlibTest');

var Dog;
var obj;
var Provider;

function setUp() {
  Dog = function(name) {
    this.name_ = name;
  };

  Dog.prototype.talk = function() {
    return 'Woof';
  };

  Dog.prototype.eat = function(food) {
    return '*' + this.name_ + ' eats ' + food + '*';
  };

  obj = {
    myFunc: function(myBool) {
      return 'I got the boolean ' + myBool;
    }
  };
  Provider = function() {
    this.scopes_ = [];
  };
  Provider.credential = function(cred) {
    return {
      'cred': cred
    };
  };
  Provider.prototype.addScope = function(scope) {
    this.scopes_.push(scope);
  };
  Provider.prototype.getScopes = function() {
    return this.scopes_;
  };
  Provider.PROVIDER_ID = 'providerId';
}


function testWrapMethodWithArgumentVerifier_wrapperStaticAndProto_valid() {
  fireauth.exportlib.wrapMethodWithArgumentVerifier_(
      'Provider', Provider, []);
  fireauth.exportlib.wrapMethodWithArgumentVerifier_(
      'Provider.prototype.addScope',
      Provider.prototype.addScope, [
        fireauth.args.string('scope')
      ]);
  fireauth.exportlib.wrapMethodWithArgumentVerifier_(
      'Provider.prototype.getScopes',
      Provider.prototype.getScopes, []);
  fireauth.exportlib.wrapMethodWithArgumentVerifier_(
      'Provider.credential',
      Provider.credential, [
        fireauth.args.object()
      ]);
  var provider = new Provider();
  provider.addScope('s1');
  provider.addScope('s2');
  assertArrayEquals(['s1', 's2'], provider.getScopes());
  assertObjectEquals({'cred': 'something'}, Provider.credential('something'));
  assertEquals('providerId', Provider.PROVIDER_ID);
}


function testWrapMethodWithArgumentVerifier_constructor_noArgs_valid() {
  var ExportedDog =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('Dog', Dog,
      [fireauth.args.string('name')]);
  new ExportedDog('Snoopy');
}


function testWrapMethodWithArgumentVerifier_constructor_noArgs_invalid() {
  var ExportedDog =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('Dog', Dog,
      [fireauth.args.string('name')]);
  assertThrows(function() {
    new ExportedDog();
  });
}


function testWrapMethodWithArgumentVerifier_method_noArgs_valid() {
  Dog.prototype.exportedTalk =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('talk',
      Dog.prototype.talk, []);
  var snoopy = new Dog('Snoopy');
  assertEquals('Woof', snoopy.exportedTalk());
}


function testWrapMethodWithArgumentVerifier_method_noArgs_invalid() {
  Dog.prototype.exportedTalk =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('talk',
      Dog.prototype.talk, []);
  var snoopy = new Dog('Snoopy');
  assertThrows(function() {
    snoopy.exportedTalk('badArgument');
  });
}


function testWrapMethodWithArgumentVerifier_method_oneArg_valid() {
  Dog.prototype.exportedEat =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('eat',
      Dog.prototype.eat,
      [fireauth.args.string('food')]);
  var snoopy = new Dog('Snoopy');
  assertEquals('*Snoopy eats pizza*', snoopy.exportedEat('pizza'));
}


function testWrapMethodWithArgumentVerifier_method_oneArg_invalid() {
  Dog.prototype.exportedEat =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('eat',
      Dog.prototype.eat,
      [fireauth.args.string('food')]);
  assertThrows(function() {
    snoopy.exportedEat(13);
  });
}


function testWrapMethodWithArgumentVerifier_static_oneArg_valid() {
  obj.exportedFunc =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('myFunc', obj.myFunc,
      [fireauth.args.bool('myBool')]);
  assertEquals('I got the boolean true', obj.exportedFunc(true));
}


function testWrapMethodWithArgumentVerifier_static_oneArg_invalid() {
  obj.exportedFunc =
      fireauth.exportlib.wrapMethodWithArgumentVerifier_('myFunc', obj.myFunc,
      [fireauth.args.bool('myBool')]);
  assertThrows(function() {
    assertEquals('I got the boolean true', obj.exportedFunc('hello'));
  });
}

function testExportPrototypeProperties() {
  var obj  = {
    originalProp: 10,
    originalProp2: 12
  };
  fireauth.exportlib.exportPrototypeProperties(obj, {
    originalProp: {
      name: 'newProp',
      arg: fireauth.args.number('newProp')
    },
    originalProp2: {
      name: 'newProp2',
      arg: fireauth.args.number('newProp2')
    }
  });

  assertEquals(10, obj.originalProp);
  assertEquals(10, obj['newProp']);
  assertEquals(12, obj.originalProp2);
  assertEquals(12, obj['newProp2']);

  // Changing the new property should update the old.
  obj['newProp'] = 20;
  obj['newProp2'] = 5;
  assertEquals(20, obj.originalProp);
  assertEquals(20, obj['newProp']);
  assertEquals(5, obj.originalProp2);
  assertEquals(5, obj['newProp2']);

  // Changing the old property should update the new.
  obj.originalProp = 30;
  obj.originalProp2 = 4;
  assertEquals(30, obj.originalProp);
  assertEquals(30, obj['newProp']);
  assertEquals(4, obj.originalProp2);
  assertEquals(4, obj['newProp2']);

  // Check argument validation.
  assertThrows(function() {
    obj['newProp'] = false;
  });
  // Previous value should remain.
  assertEquals(30, obj['newProp']);
}

/**
 * Tests that exportPrototypeProperties works when run on an object prototype.
 */
function testExportPrototypeProperties_prototype() {
  var Obj = function() {};
  Obj.prototype.originalProp = 10;
  fireauth.exportlib.exportPrototypeProperties(Obj.prototype, {
    originalProp: {
      name: 'newProp',
      arg: fireauth.args.number('newProp')
    }
  });
  var obj = new Obj();

  assertEquals(10, obj.originalProp);
  assertEquals(10, obj['newProp']);

  // Changing the new property should update the old.
  obj['newProp'] = 20;
  assertEquals(20, obj.originalProp);
  assertEquals(20, obj['newProp']);

  // Changing the old property should update the new.
  obj.originalProp = 30;
  assertEquals(30, obj.originalProp);
  assertEquals(30, obj['newProp']);

  // Check argument validation.
  assertThrows(function() {
    obj['newProp'] = false;
  });
  // Previous value should remain.
  assertEquals(30, obj['newProp']);
}


/**
 * Tests that exportPrototypeProperties works when you try to export a property
 * without changing the symbol.
 */
function testExportPrototypeProperties_exportSelf() {
  var Obj = function() {
    this['propName'] = 10;
  };
  fireauth.exportlib.exportPrototypeProperties(Obj.prototype, {
    propName: {
      name: 'propName',
      arg: fireauth.args.number('newProp')
    }
  });
  var obj = new Obj();

  assertEquals(10, obj['propName']);

  // We should still be able to change the property.
  obj['propName'] = 20;
  assertEquals(20, obj['propName']);

  // Check argument validation. This should not throw since the property name is
  // the same.
  assertNotThrows(function() {
    obj['newProp'] = false;
  });
  assertEquals(false, obj['newProp']);
}
