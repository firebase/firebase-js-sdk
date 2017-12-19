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
const fetchMock = {
  jsonOk: function(body: string): Promise<Response> {
    var mockResponse = new (window as any).Response(body, {
      status: 200,
      headers: {
        'Content-type': 'application/json'
      }
    });
    return Promise.resolve(mockResponse);
  },
  jsonError: function(status: number, msg: string): Promise<Response> {
    const errorMsg = { error: { message: msg } };
    var mockResponse = new (window as any).Response(JSON.stringify(errorMsg), {
      status: status,
      headers: {
        'Content-type': 'application/json'
      }
    });
    return Promise.resolve(mockResponse);
  },
  htmlError: function(status: number, msg: string): Promise<Response> {
    var mockResponse = new (window as any).Response(msg, {
      status: status,
      headers: {
        'Content-type': 'text/html'
      }
    });
    return Promise.resolve(mockResponse);
  }
};
export { fetchMock };
