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
import { assert } from 'chai';
import { TaskEvent } from '../src/implementation/taskenums';
import { XhrIoPool } from '../src/implementation/xhriopool';
import { Service } from '../src/service';
import * as testShared from './testshared';

const fakeAppGs = testShared.makeFakeApp(null, 'gs://mybucket');
const fakeAppGsEndingSlash = testShared.makeFakeApp(null, 'gs://mybucket/');
const fakeAppInvalidGs = testShared.makeFakeApp(null, 'gs://mybucket/hello');
const xhrIoPool = new XhrIoPool();

function makeGsUrl(child: string = ''): string {
  return 'gs://' + testShared.bucket + '/' + child;
}

describe('Firebase Storage > Service', () => {
  describe('simple constructor', () => {
    const service = new Service(testShared.fakeApp, xhrIoPool);
    it('Root refs point to the right place', () => {
      const ref = service.ref();
      assert.equal(ref.toString(), makeGsUrl());
    });
    it('Child refs point to the right place', () => {
      const ref = service.ref('path/to/child');
      assert.equal(ref.toString(), makeGsUrl('path/to/child'));
    });
    it('Throws calling ref with a gs:// URL', () => {
      const error = testShared.assertThrows(() => {
        service.ref('gs://bucket/object');
      }, 'storage/invalid-argument');
      assert.match(error.message, /refFromURL/);
    });
    it('Throws calling ref with an http:// URL', () => {
      const error = testShared.assertThrows(() => {
        service.ref('http://firebasestorage.googleapis.com/etc');
      }, 'storage/invalid-argument');
      assert.match(error.message, /refFromURL/);
    });
    it('Throws calling ref with an https:// URL', () => {
      const error = testShared.assertThrows(() => {
        service.ref('https://firebasestorage.googleapis.com/etc');
      }, 'storage/invalid-argument');
      assert.match(error.message, /refFromURL/);
    });
  });
  describe('custom bucket constructor', () => {
    it('gs:// custom bucket constructor refs point to the right place', () => {
      const service = new Service(
        testShared.fakeApp,
        xhrIoPool,
        'gs://foo-bar.appspot.com'
      );
      const ref = service.ref();
      assert.equal(ref.toString(), 'gs://foo-bar.appspot.com/');
    });
    it('http:// custom bucket constructor refs point to the right place', () => {
      const service = new Service(
        testShared.fakeApp,
        xhrIoPool,
        'http://firebasestorage.googleapis.com/v1/b/foo-bar.appspot.com/o'
      );
      const ref = service.ref();
      assert.equal(ref.toString(), 'gs://foo-bar.appspot.com/');
    });
    it('https:// custom bucket constructor refs point to the right place', () => {
      const service = new Service(
        testShared.fakeApp,
        xhrIoPool,
        'https://firebasestorage.googleapis.com/v1/b/foo-bar.appspot.com/o'
      );
      const ref = service.ref();
      assert.equal(ref.toString(), 'gs://foo-bar.appspot.com/');
    });

    it('Bare bucket name constructor refs point to the right place', () => {
      const service = new Service(
        testShared.fakeApp,
        xhrIoPool,
        'foo-bar.appspot.com'
      );
      const ref = service.ref();
      assert.equal(ref.toString(), 'gs://foo-bar.appspot.com/');
    });
    it('Child refs point to the right place', () => {
      const service = new Service(
        testShared.fakeApp,
        xhrIoPool,
        'foo-bar.appspot.com'
      );
      const ref = service.ref('path/to/child');
      assert.equal(ref.toString(), 'gs://foo-bar.appspot.com/path/to/child');
    });
    it('Throws trying to construct with a gs:// URL containing an object path', () => {
      const error = testShared.assertThrows(() => {
        new Service(testShared.fakeApp, xhrIoPool, 'gs://bucket/object/');
      }, 'storage/invalid-default-bucket');
      assert.match(error.message, /Invalid default bucket/);
    });
  });
  describe('default bucket config', () => {
    it('gs:// works without ending slash', () => {
      const service = new Service(fakeAppGs, xhrIoPool);
      assert.equal(service.ref().toString(), 'gs://mybucket/');
    });
    it('gs:// works with ending slash', () => {
      const service = new Service(fakeAppGsEndingSlash, xhrIoPool);
      assert.equal(service.ref().toString(), 'gs://mybucket/');
    });
    it('Throws when config bucket is gs:// with an object path', () => {
      const error = testShared.assertThrows(() => {
        new Service(fakeAppInvalidGs, xhrIoPool);
      }, 'storage/invalid-default-bucket');
    });
  });
  describe('refFromURL', () => {
    const service = new Service(testShared.fakeApp, xhrIoPool);
    it('Throws on non-URL arg', () => {
      const error = testShared.assertThrows(() => {
        service.refFromURL('path/to/child');
      }, 'storage/invalid-argument');
      assert.match(error.message, /invalid/i);
    });
    it('Works with gs:// URLs', () => {
      const ref = service.refFromURL('gs://mybucket/child/path/image.png');
      assert.equal(ref.toString(), 'gs://mybucket/child/path/image.png');
    });
    it('Works with http:// URLs', () => {
      const ref = service.refFromURL(
        'http://firebasestorage.googleapis.com/v0/b/' +
          'mybucket/o/child%2Fpath%2Fimage.png?downloadToken=hello'
      );
      assert.equal(ref.toString(), 'gs://mybucket/child/path/image.png');
    });
    it('Works with https:// URLs', () => {
      const ref = service.refFromURL(
        'https://firebasestorage.googleapis.com/v0/b/' +
          'mybucket/o/child%2Fpath%2Fimage.png?downloadToken=hello'
      );
      assert.equal(ref.toString(), 'gs://mybucket/child/path/image.png');
    });
  });
  describe('Argument verification', () => {
    const service = new Service(testShared.fakeApp, xhrIoPool);
    describe('ref', () => {
      it('Throws with two args', () => {
        testShared.assertThrows(
          testShared.bind(service.ref, service, 1, 2),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on gs:// argument', () => {
        testShared.assertThrows(
          testShared.bind(service.ref, service, 'gs://yo'),
          'storage/invalid-argument'
        );
      });
      it('Throws on number argument', () => {
        testShared.assertThrows(
          testShared.bind(service.ref, service, 3),
          'storage/invalid-argument'
        );
      });
      it('Throws on null argument', () => {
        testShared.assertThrows(
          testShared.bind(service.ref, service, null),
          'storage/invalid-argument'
        );
      });
    });
    describe('refFromURL', () => {
      it('Throws with no args', () => {
        testShared.assertThrows(
          testShared.bind(service.refFromURL, service),
          'storage/invalid-argument-count'
        );
      });
      it('Throws with two args', () => {
        testShared.assertThrows(
          testShared.bind(service.refFromURL, service, 'a', 'b'),
          'storage/invalid-argument-count'
        );
      });
      it('Throws with a non-URL string arg', () => {
        testShared.assertThrows(
          testShared.bind(service.refFromURL, service, 'child'),
          'storage/invalid-argument'
        );
      });
      it('Throws with a null arg', () => {
        testShared.assertThrows(
          testShared.bind(service.refFromURL, service, null),
          'storage/invalid-argument'
        );
      });
      it('Throws with an invalid URL arg', () => {
        testShared.assertThrows(
          testShared.bind(service.refFromURL, service, 'notlegit://url'),
          'storage/invalid-argument'
        );
      });
    });
    describe('setMaxUploadRetryTime', () => {
      it('Throws on no args', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxUploadRetryTime, service),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on two args', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxUploadRetryTime, service, 1, 2),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on string arg', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxUploadRetryTime, service, 'a'),
          'storage/invalid-argument'
        );
      });
      it('Throws on negative arg', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxUploadRetryTime, service, -10),
          'storage/invalid-argument'
        );
      });
    });
    describe('setMaxOperationRetryTime', () => {
      it('Throws on no args', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxOperationRetryTime, service),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on two args', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxOperationRetryTime, service, 1, 2),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on string arg', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxOperationRetryTime, service, 'a'),
          'storage/invalid-argument'
        );
      });
      it('Throws on negative arg', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxOperationRetryTime, service, -10),
          'storage/invalid-argument'
        );
      });
    });
  });

  describe('Deletion', () => {
    const service = new Service(testShared.fakeApp, xhrIoPool);
    it('In-flight requests are canceled when the service is deleted', () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      const toReturn = ref.getMetadata().then(
        met => {
          assert.fail('Promise succeeded, should have been canceled');
        },
        err => {
          assert.equal(err.code, 'storage/app-deleted');
        }
      );
      service.INTERNAL.delete();
      return toReturn;
    });
    it('Requests fail when started after the service is deleted', () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      service.INTERNAL.delete();
      const toReturn = ref.getMetadata().then(
        met => {
          assert.fail('Promise succeeded, should have been canceled');
        },
        err => {
          assert.equal(err.code, 'storage/app-deleted');
        }
      );
      return toReturn;
    });
    it('Running uploads fail when the service is deleted', () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      const toReturn = new Promise(function(resolve, reject) {
        ref.put(new Blob(['a'])).on(
          TaskEvent.STATE_CHANGED,
          null,
          err => {
            assert.equal(err.code, 'storage/app-deleted');
            resolve();
          },
          () => {
            assert.fail('Upload completed, should have been canceled');
          }
        );
        service.INTERNAL.delete();
      });
      return toReturn;
    });
  });
});
