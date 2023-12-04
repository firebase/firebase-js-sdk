# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

locals {
  indexes = {
    index1 = [
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "a"
        order      = "ASCENDING"
      },
    ]
    index2 = [
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "b"
        order      = "ASCENDING"
      },
    ]
    index3 = [
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "b"
        order      = "DESCENDING"
      },
    ]
    index4 = [
      {
        field_path = "a"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "b"
        order      = "ASCENDING"
      },
    ]
    index5 = [
      {
        field_path = "a"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "b"
        order      = "DESCENDING"
      },
    ]
    index6 = [
      {
        field_path = "a"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "a"
        order      = "DESCENDING"
      },
    ]
    index7 = [
      {
        field_path = "b"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "a"
        order      = "ASCENDING"
      },
    ]
    index8 = [
      {
        field_path = "b"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "a"
        order      = "DESCENDING"
      },
    ]
    index9 = [
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "pages"
        order      = "ASCENDING"
      },
      {
        field_path = "year"
        order      = "ASCENDING"
      },
    ]
    index10 = [
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "pages"
        order      = "ASCENDING"
      },
      {
        field_path = "rating"
        order      = "ASCENDING"
      },
      {
        field_path = "year"
        order      = "ASCENDING"
      },
    ]
    index11 = [
      {
        field_path   = "rating"
        array_config = "CONTAINS"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "pages"
        order      = "ASCENDING"
      },
      {
        field_path = "rating"
        order      = "ASCENDING"
      },
    ]
  }
}
