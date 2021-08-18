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
 * @fileoverview Provides utilities for exporting public APIs, with error
 *     checking.
 */

goog.provide('fireauth.exportlib');
goog.provide('fireauth.exportlib.ExportedMethod');

goog.require('fireauth.args');


/**
 * Type constant for Firebase Auth.
 * @const {string}
 */
fireauth.exportlib.AUTH_TYPE = 'auth';


/**
 * Represents an exported method, with the exported name of the method and the
 * expected arguments to that method.
 * @typedef {{
 *   name: string,
 *   args: (Array<!fireauth.args.Argument>|null|undefined)
 * }}
 */
fireauth.exportlib.ExportedMethod;


/**
 * Represents an exported property, with the exported name of the property and
 * the expected argument to the setter of this property.
 * @typedef {{
 *   name: string,
 *   arg: !fireauth.args.Argument
 * }}
 */
fireauth.exportlib.ExportedProperty;


/**
 * Exports prototype methods of an object.
 * @param {!Object} protObj The prototype of an object.
 * @param {!Object<string, fireauth.exportlib.ExportedMethod>} fnMap The map of
 *     prototype functions to their export name and expected arguments.
 */
fireauth.exportlib.exportPrototypeMethods = function(protObj, fnMap) {
  // This method exports methods by aliasing the unobfuscated function name
  // (specified as a string in the "name" field of ExportedMethod) to the
  // obfuscated function name (specified as a key of the fnMap object).
  //
  // To give a concrete example, let's say that we have this method:
  // fireauth.Auth.prototype.fetchProvidersForEmail = function() { ... };
  //
  // In the exports file, we export as follows:
  // fireauth.exportlib.exportPrototypeMethods(fireauth.Auth.prototype, {
  //   fetchProvidersForEmail: {name: 'fetchProvidersForEmail', args: ...}
  // });
  //
  // When the compiler obfuscates the code, the code above will become something
  // like this:
  // fireauth.Auth.prototype.qZ = function() { ... };
  // fireauth.exportlib.exportPrototypeMethods(fireauth.Auth.prototype, {
  //   qZ: {name: 'fetchProvidersForEmail', args: ...}
  // });
  //
  // (Of course, fireauth.Auth and fireauth.exportlib.exportPrototypeMethods
  // would also be obfuscated). Note that the key in fnMap is obfuscated but the
  // "name" field in the ExportedMethod is not. Now, exportPrototypeMethods can
  // export fetchProvidersForEmail by reading the key ("qZ") and the "name"
  // field ("fetchProvidersForEmail") and essentially executing this:
  // fireauth.Auth.prototype['fetchProvidersForEmail'] =
  //     fireauth.Auth.prototype['qZ'];
  for (var obfuscatedFnName in fnMap) {
    var unobfuscatedFnName = fnMap[obfuscatedFnName].name;
    protObj[unobfuscatedFnName] =
        fireauth.exportlib.wrapMethodWithArgumentVerifier_(
        unobfuscatedFnName, protObj[obfuscatedFnName],
        fnMap[obfuscatedFnName].args);
  }
};


/**
 * Exports properties of an object. See the docs for exportPrototypeMethods for
 * more information about how this works.
 * @param {!Object} protObj The prototype of an object.
 * @param {!Object<string, !fireauth.exportlib.ExportedProperty>} propMap The
 *     map of properties to their export names.
 */
fireauth.exportlib.exportPrototypeProperties = function(protObj, propMap) {
  for (var obfuscatedPropName in propMap) {
    var unobfuscatedPropName = propMap[obfuscatedPropName].name;
    // Don't alias a property to itself.
    // Downside is that argument validation will not be possible. For now, to
    // get around it, ensure unobfuscated property names are different
    // than the corresponding obfuscated property names.
    if (unobfuscatedPropName === obfuscatedPropName) {
      continue;
    }
    /**
     * @this {!Object}
     * @param {string} obfuscatedPropName The obfuscated property name.
     * @return {*} The value of the property.
     */
    var getter = function(obfuscatedPropName) {
      return this[obfuscatedPropName];
    };
    /**
     * @this {!Object}
     * @param {string} unobfuscatedPropName The unobfuscated property name.
     * @param {string} obfuscatedPropName The obfuscated property name.
     * @param {!fireauth.args.Argument} expectedArg The expected argument to the
     *     setter of this property.
     * @param {*} value The new value of the property.
     */
    var setter = function(unobfuscatedPropName, obfuscatedPropName,
                          expectedArg, value) {
      // Validate the argument before setting it.
      fireauth.args.validate(
          unobfuscatedPropName, [expectedArg], [value], true);
      this[obfuscatedPropName] = value;
    };
    // Get the expected argument.
    var expectedArg = propMap[obfuscatedPropName].arg;
    Object.defineProperty(protObj, unobfuscatedPropName, {
      /**
       * @this {!Object}
       * @return {*} The value of the property.
       */
      get: goog.partial(getter, obfuscatedPropName),
      /**
       * @this {!Object}
       * @param {*} value The new value of the property.
       */
      set: goog.partial(setter, unobfuscatedPropName, obfuscatedPropName,
                        expectedArg),
      enumerable: true
    });
  }
};


/**
 * Export a static method as a public API.
 * @param {!Object} parentObj The parent object to patch.
 * @param {string} name The public name of the method.
 * @param {!Function} func The method.
 * @param {?Array<!fireauth.args.Argument>=} opt_expectedArgs The expected
 *     arguments to the method.
 */
fireauth.exportlib.exportFunction = function(parentObj, name, func,
    opt_expectedArgs) {
  parentObj[name] = fireauth.exportlib.wrapMethodWithArgumentVerifier_(
      name, func, opt_expectedArgs);
};


/**
 * Wraps a method with a function that first verifies the arguments to the
 * method and then calls the original method.
 * @param {string} methodName The name of the method, which will be displayed
 *     on the error message if the arguments are not valid.
 * @param {!Function} method The method to be wrapped.
 * @param {?Array<!fireauth.args.Argument>=} opt_expectedArgs The expected
 *     arguments.
 * @return {!Function} The wrapped method.
 * @private
 */
fireauth.exportlib.wrapMethodWithArgumentVerifier_ = function(methodName,
    method, opt_expectedArgs) {
  if (!opt_expectedArgs) {
    return method;
  }
  var shortName = fireauth.exportlib.extractMethodNameFromFullPath_(methodName);
  var wrapper = function() {
    var argumentsAsArray = Array.prototype.slice.call(arguments);
    fireauth.args.validate(shortName,
        /** @type {!Array<!fireauth.args.Argument>} */ (opt_expectedArgs),
        argumentsAsArray);
    return method.apply(this, argumentsAsArray);
  };
  // Reattach all static stuff to wrapper.
  for (var key in method) {
    wrapper[key] = method[key];
  }
  // Reattach all prototype stuff to wrapper.
  for (var key in method.prototype) {
    wrapper.prototype[key] = method.prototype[key];
  }
  // Return wrapper with all of method's static and prototype methods and
  // properties.
  return wrapper;
};


/**
 * From a full path to a method (e.g. "fireauth.GoogleAuthProvider.credential"),
 * get just the method name ("credential").
 * @param {string} path The full path.
 * @return {string} The method name.
 * @private
 */
fireauth.exportlib.extractMethodNameFromFullPath_ = function(path) {
  var parts = path.split('.');
  return parts[parts.length - 1];
};
