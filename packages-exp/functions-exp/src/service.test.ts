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
import { createTestService } from '../test/utils';
import { FunctionsService, useFunctionsEmulator } from './service';

describe('Firebase Functions > Service', () => {
  describe('simple constructor', () => {
    let app: any;
    let service: FunctionsService;

    beforeEach(() => {
      app = {
        options: {
          projectId: 'my-project'
        }
      };
    });

    it('has valid urls', () => {
      service = createTestService(app);
      assert.equal(
        service._url('foo'),
        'https://us-central1-my-project.cloudfunctions.net/foo'
      );
    });

    it('can use emulator', () => {
      service = createTestService(app);
      useFunctionsEmulator(service, 'http://localhost:5005');
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/us-central1/foo'
      );
    });

    it('correctly sets region', () => {
      service = createTestService(app, 'my-region');
      assert.equal(
        service._url('foo'),
        'https://my-region-my-project.cloudfunctions.net/foo'
      );
    });

    it('correctly sets region with emulator', () => {
      service = createTestService(app, 'my-region');
      useFunctionsEmulator(service, 'http://localhost:5005');
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/my-region/foo'
      );
    });

    it('correctly sets custom domain', () => {
      service = createTestService(app, 'https://mydomain.com');
      assert.equal(
        service._url('foo'),
        'https://mydomain.com/foo'
      );
    });

    it('prefers emulator to custom domain', () => {
      const service = createTestService(app, 'https://mydomain.com');
      useFunctionsEmulator(service, 'http://localhost:5005');
      assert.equal(
        service._url('foo'),
        'http://localhost:5005/my-project/us-central1/foo'
      );
    });
  });
});
