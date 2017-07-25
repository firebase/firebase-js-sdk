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
function toBase64(arrayBuffer) {
  const uint8Version = new Uint8Array(arrayBuffer);
  return window.btoa(String.fromCharCode.apply(null, uint8Version));
}

export default arrayBuffer => {
  const base64String = toBase64(arrayBuffer);
  return base64String.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};
