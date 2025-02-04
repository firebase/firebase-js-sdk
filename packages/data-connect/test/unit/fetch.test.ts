/**
 * @license
 * Copyright 2024 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

import { dcFetch, initializeFetch } from '../../src/network/fetch';
import { CallerSdkType, CallerSdkTypeEnum } from '../../src/network/transport';
use(chaiAsPromised);
function mockFetch(json: object, reject: boolean): sinon.SinonStub {
  const fakeFetchImpl = sinon.stub().returns(
    Promise.resolve({
      json: () => {
        return Promise.resolve(json);
      },
      status: reject ? 401 : 200
    } as Response)
  );
  initializeFetch(fakeFetchImpl);
  return fakeFetchImpl;
}
describe('fetch', () => {
  it('should throw an error with just the message when the server responds with an error with a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    mockFetch(
      {
        code: 401,
        message
      },
      true
    );
    await expect(
      dcFetch(
        'http://localhost',
        {
          name: 'n',
          operationName: 'n',
          variables: {}
        },
        {} as AbortController,
        null,
        null,
        null,
        false,
        CallerSdkTypeEnum.Base
      )
    ).to.eventually.be.rejectedWith(message);
  });
  it('should throw a stringified message when the server responds with an error without a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    const json = {
      code: 401,
      message1: message
    };
    mockFetch(json, true);
    await expect(
      dcFetch(
        'http://localhost',
        {
          name: 'n',
          operationName: 'n',
          variables: {}
        },
        {} as AbortController,
        null,
        null,
        null,
        false,
        CallerSdkTypeEnum.Base
      )
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
  });
  it('should assign different values to custom headers based on the _callerSdkType argument (_isUsingGen is false)', async () => {
    const json = {
      code: 200,
      message1: 'success'
    };
    const fakeFetchImpl = mockFetch(json, false);

    const callerSdkTypesUsed: string[] = [];

    for (const callerSdkType in CallerSdkTypeEnum) {
      if (
        Object.prototype.hasOwnProperty.call(CallerSdkTypeEnum, callerSdkType)
      ) {
        callerSdkTypesUsed.push(callerSdkType);
        await dcFetch(
          'http://localhost',
          {
            name: 'n',
            operationName: 'n',
            variables: {}
          },
          {} as AbortController,
          null,
          null,
          null,
          false, // _isUsingGen is false
          callerSdkType as CallerSdkType
        );
      }
    }

    // an example of the args to fetch():
    // [
    //    "http://localhost",
    //    {
    //      "body": "{\"name\":\"n\",\"operationName\":\"n\",\"variables\":{}}",
    //      "headers": {
    //        "Content-Type": "application/json",
    //        "X-Goog-Api-Client": "gl-js/ fire/11.2.0"
    //      },
    //      "method": "POST",
    //      "signal": [undefined]
    //    }
    // ]
    for (let i = 0; i < fakeFetchImpl.args.length; i++) {
      const args = fakeFetchImpl.args[i];
      expect(args.length).to.equal(2);
      expect(Object.prototype.hasOwnProperty.call(args[1], 'headers')).to.be
        .true;
      expect(
        Object.prototype.hasOwnProperty.call(
          args[1]['headers'],
          'X-Goog-Api-Client'
        )
      ).to.be.true;
      expect(typeof args[1]['headers']['X-Goog-Api-Client']).to.equal('string');

      const xGoogApiClientValue: string =
        args[1]['headers']['X-Goog-Api-Client'];
      // the sdk type headers are always of the form "js/xxx", where xxx is _callerSdkType.toLower()
      // when the _callerSdkType is Base, we do not set any header
      // when the _callerSdkType is Generated, we use "js/gen" instead of "js/generated"
      if (callerSdkTypesUsed[i] === CallerSdkTypeEnum.Base) {
        expect(xGoogApiClientValue).to.not.match(RegExp(`js\/w`));
      } else if (callerSdkTypesUsed[i] === CallerSdkTypeEnum.Generated) {
        expect(xGoogApiClientValue).to.match(RegExp(`js\/gen`));
      } else {
        expect(xGoogApiClientValue).to.match(
          RegExp(`js\/${callerSdkTypesUsed[i].toLowerCase()}`)
        );
      }
    }
  });
  it('should assign custom headers based on _callerSdkType before checking to-be-deprecated _isUsingGen', async () => {
    const json = {
      code: 200,
      message1: 'success'
    };
    const fakeFetchImpl = mockFetch(json, false);

    const callerSdkTypesUsed: string[] = [];

    for (const callerSdkType in CallerSdkTypeEnum) {
      if (
        Object.prototype.hasOwnProperty.call(CallerSdkTypeEnum, callerSdkType)
      ) {
        callerSdkTypesUsed.push(callerSdkType);
        await dcFetch(
          'http://localhost',
          {
            name: 'n',
            operationName: 'n',
            variables: {}
          },
          {} as AbortController,
          null,
          null,
          null,
          true, // _isUsingGen is true
          callerSdkType as CallerSdkType
        );
      }
    }

    for (let i = 0; i < fakeFetchImpl.args.length; i++) {
      const args = fakeFetchImpl.args[i];
      expect(args.length).to.equal(2);
      expect(Object.prototype.hasOwnProperty.call(args[1], 'headers')).to.be
        .true;
      expect(
        Object.prototype.hasOwnProperty.call(
          args[1]['headers'],
          'X-Goog-Api-Client'
        )
      ).to.be.true;
      expect(typeof args[1]['headers']['X-Goog-Api-Client']).to.equal('string');

      const xGoogApiClientValue: string =
        args[1]['headers']['X-Goog-Api-Client'];
      // despite _isUsingGen being true, the headers should be based on _callerSdkType
      // _isUsingGen should only take precedence when _callerSdkType is "Base"
      if (
        callerSdkTypesUsed[i] === CallerSdkTypeEnum.Generated ||
        callerSdkTypesUsed[i] === CallerSdkTypeEnum.Base
      ) {
        expect(xGoogApiClientValue).to.match(RegExp(`js\/gen`));
      } else {
        expect(xGoogApiClientValue).to.match(
          RegExp(`js\/${callerSdkTypesUsed[i].toLowerCase()}`)
        );
      }
    }
  });
});
