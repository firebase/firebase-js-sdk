/**
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

let validatedVersion = false;

function validateNamespace(definition, candidate) {
  const __expect = require('chai').expect;
  const keys = Object.keys(definition).filter(key => !~key.indexOf('__'));

  if (!validatedVersion) {
    describe('Firebase SDK Version', function() {
      it('Should be properly defined', function() {
        __expect(candidate.SDK_VERSION).to.equal(
          require('../../packages/firebase/package.json').version
        );
      });
    });
    validatedVersion = true;
  }

  // Validate Keys
  keys.forEach(key => {
    /**
     * This object that we capture here could potentially
     * contain multiple layers of APIs. We recursively
     * spin up the validations as needed but defer them
     * till after we have validated the current API
     */
    const definitionChunk = definition[key];
    const candidateChunk = candidate[key];

    /**
     * Grab all of the keys that aren't meta properties and capture
     * them for more testing later
     */
    const internalKeys = Object.keys(definitionChunk).filter(
      iKey => !~iKey.indexOf('__')
    );
    const returnKeys = Object.keys(definitionChunk).filter(
      iKey => ~iKey.indexOf('__return')
    );

    describe(`${key}`, function() {
      /**
       * Tests of the actual API
       */
      if (definitionChunk.__type) {
        it(`Should be a \`${definitionChunk.__type}\``, function() {
          __expect(candidateChunk).to.be.a(definitionChunk.__type);
        });
      }

      /**
       * If both the definition and candidate pieces are truthy
       * then we can continue validation of the nested layers
       */
      if (definitionChunk && candidateChunk) {
        validateNamespace(definitionChunk, candidateChunk);
      }

      /**
       * Keys marked with `__return` allow us to validate the
       * return value of a specific part of the API
       *
       * e.g.
       * {
       *   ...
       *   app: {
       *     __return: {
       *       <PROPERTIES OF AN APP>
       *     }
       *   }
       * }
       */
      if (
        definitionChunk.__type === 'function' &&
        definitionChunk.__return &&
        typeof candidateChunk === 'function'
      ) {
        try {
          candidateChunk();
        } catch (e) {
          it(`Throws because current browser is unsupported`, () => {
            __expect(e.code).to.have.string('unsupported-browser');
          });
          return;
        }
        validateNamespace(definitionChunk.__return, candidateChunk());
      }
    });
  });
}

module.exports = validateNamespace;
