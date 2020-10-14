/**
 * @license
 * Copyright 2017 Google LLC
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
import { assert } from 'chai';
import { createTestService } from './utils';

describe('Firebase Functions > Service', () => {
  describe('simple constructor', () => {
    const app: any = {
      options: {
        projectId: 'my-project'
      }
    };
    const service = createTestService(app);

    it('has valid urls', () => {
      assert.equal(
        service._url('foo'),
        'https://us-central1-my-project.cloudfunctions.net/foo'
      );
    });

    it('can use emulator (deprecated)', () => {
      service.useFunctionsEmulator('http://localhost:5005');
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/us-central1/foo'
      );
    });

    it('can use emulator', () => {
      service.useEmulator('localhost', 5005);
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/us-central1/foo'
      );
    });
  });

  describe('custom region/domain constructor', () => {
    const app: any = {
      options: {
        projectId: 'my-project'
      }
    };

    it('can use custom region', () => {
      const service = createTestService(app, 'my-region');
      assert.equal(
        service._url('foo'),
        'https://my-region-my-project.cloudfunctions.net/foo'
      );
    });

    it('can use custom domain', () => {
      const service = createTestService(app, 'https://mydomain.com');
      assert.equal(service._url('foo'), 'https://mydomain.com/foo');
    });

    it('prefers emulator to custom domain (deprecated)', () => {
      const service = createTestService(app, 'https://mydomain.com');
      service.useFunctionsEmulator('http://localhost:5005');
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/us-central1/foo'
      );
    });

    it('prefers emulator to custom domain', () => {
      const service = createTestService(app, 'https://mydomain.com');
      service.useEmulator('localhost', 5005);
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/us-central1/foo'
      );
    });
  });
});
