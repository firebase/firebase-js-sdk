# Copyright 2016 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Common methods and constants for generating test files."""
import os


# The directory in which test HTML files are generated.
TESTS_BASE_PATH = "./generated/tests/"


def cd_to_firebaseauth_root():
  """Changes the current directory to the firebase-auth root directory.
  This method assumes that this script is in the buildtools/ directory, which is
  a direct child of the root directory.
  This allows us to avoid writing to the wrong files.
  """
  root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  os.chdir(root_dir)


def get_files_with_suffix(root, suffix):
  """Yields file names under a directory with a given suffix.
  Args:
    root: The path to the directory where we wish to search.
    suffix: The suffix we wish to search for.
  Yields:
    The paths to files under the directory that have the given suffix.
  """
  for root, _, files in os.walk(root):
    for file_name in files:
      if file_name.endswith(suffix):
        yield os.path.join(root, file_name)
