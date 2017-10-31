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

"""Generates the all_tests.js file.
all_tests.js tells all_tests.html the paths to the files to test.
Usage:
$ python ./buildtools/gen_all_tests_js.py > generated/all_tests.js
"""

import common


def main():
  common.cd_to_firebaseauth_root()
  print "var allTests = ["
  _print_test_files_under_root(common.TESTS_BASE_PATH)
  print "];"
  # The following is required in the context of protractor.
  print "if (typeof module !== 'undefined' && module.exports) {"
  print "  module.exports = allTests;"
  print "}"


def _print_test_files_under_root(root):
  """Prints all test HTML files found under a given directory (recursively).
  Args:
    root: The path to the directory.
  """
  for file_name in common.get_files_with_suffix(root, "_test.html"):
    print "  '%s'," % file_name[2:]  # Ignore the beginning './'.


if __name__ == "__main__":
  main()
