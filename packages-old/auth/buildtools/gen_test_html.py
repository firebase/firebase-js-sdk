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

"""Generates *_test.html files from *_test.js files.
This modifies files in place and will overwrite existing *_test.html files.
Usage:
$ python ./buildtools/gen_test_html.py
"""

from collections import namedtuple
import os
import re
from string import Template
import common


# Stores the paths of files related to a test file
# (e.g. *_test.html, *_test_dom.html)
RelatedPaths = namedtuple("RelatedPaths", ["html", "dom"])


# The root-level directories containing JS tests.
DIRECTORIES_WITH_TESTS = ["test"]


def main():
  common.cd_to_firebaseauth_root()
  template_data = _read_file("./buildtools/test_template.html")
  template = Template(template_data)
  for directory in DIRECTORIES_WITH_TESTS:
    for js_path in common.get_files_with_suffix(directory, "_test.js"):
      _gen_html(js_path, template)


def _gen_html(js_path, template):
  """Generates a Closure test HTML wrapper file and saves it to the filesystem.
  Args:
    js_path: The path to the JS test (*_test.js) file.
    template: The template for the HTML wrapper.
  """
  try:
    related_paths = _get_related_paths_from_js_path(js_path)
    js_data = _read_file(js_path)
    dom = (_read_file(related_paths.dom)
           if os.path.isfile(related_paths.dom) else "")
    package = _extract_closure_package(js_data)
    generated_html = template.substitute(package=package, dom=dom)

    _write_file(related_paths.html, generated_html)

  except:  # pylint: disable=bare-except
    print "HTML generation failed for: %s" % js_path


def _get_related_paths_from_js_path(js_path):
  """Converts the JS test file path to paths of related files.
  For example, ./path/to/foo_test.js becomes
  ./generated/tests/path/to/foo_test.html
  ./path/to/foo_test_dom.html
  Args:
    js_path: The path to the JS test (*_test.js) file.
  Returns:
    The paths to the related files, as a RelatedPaths.
  """
  base_name = os.path.splitext(js_path)[0]
  return RelatedPaths(common.TESTS_BASE_PATH + base_name + ".html",
                      base_name + "_dom.html")


def _extract_closure_package(js_data):
  """Extracts the package name that is goog.provide()d in the JS file.
  Args:
    js_data: The contents of a JS test (*_test.js) file.
  Returns:
    The closure package goog.provide()d by the file.
  Raises:
    ValueError: The JS does not contain a goog.provide().
  """
  matches = re.search(r"goog\.provide\('(.+)'\);", js_data)
  if matches is None:
    raise ValueError("goog.provide() not found in file")
  return matches.group(1)


def _read_file(path):
  """Reads a file into a string.
  Args:
    path: The path to a file.
  Returns:
    The contents of the file.
  """
  with open(path) as f:
    return f.read()


def _write_file(path, contents):
  """Writes a string to file, overwriting existing content.
  Intermediate directories are created if not present.
  Args:
    path: The path to a file.
    contents: The string to write to the file.
  """
  dir_name = os.path.dirname(path)
  if not os.path.exists(dir_name):
    os.makedirs(dir_name)
  with open(path, "w") as f:
    f.write(contents)


if __name__ == "__main__":
  main()
