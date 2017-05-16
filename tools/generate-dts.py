# coding=utf-8

# Copyright 2017 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""clutz-human --- Filter the output of clutz to make a publishable .d.ts file.

Args: Alternating input (externs.js) and output (.d.ts) file names.
"""

from collections import defaultdict
import re
import sys

def main(argv):
  # Collect alternating input and output file names into a list of pairs.
  file_pairs = zip(argv[1::2], argv[2::2])

  for input_file_name, output_file_name in file_pairs:
    with open(input_file_name, "r") as input_file:
      result = ClutzFile(input_file.read().decode("utf-8")).process()

      with open(output_file_name, "w") as output_file:
        output_file.write(result.encode("utf-8"))


reg_directive = re.compile(r"^//!!")
reg_clutz_prefix = re.compile(u"ಠ_ಠ\\.clutz\\.")
reg_clutz_namespace = re.compile(u"^declare namespace ಠ_ಠ\\.clutz {")
reg_end_block = re.compile(r"^}")
reg_start_namespace = (
    re.compile(r"^declare namespace (?P<namespace>[a-zA-Z0-9_.]+) {")
)
reg_global_error = re.compile(r"GlobalError")
reg_comment_start = re.compile(r"\s*/\*")
reg_comment_end = re.compile(r"\s*\*/")
reg_no_structural = re.compile(r".*noStructuralTyping_")


class ClutzFile(object):
  """A Clutz-generated TypeScript .d.ts file-scanner."""

  def __init__(self, contents, strip_comments=True):
    self.contents = contents
    self.strip_comments = strip_comments
    self.result = []
    self.namespaces = defaultdict(list)

  def process(self):
    """Process all the parts of a clutz file.

    Returns:
      A string result after proccessing the file.
    """
    self.contents = reg_clutz_prefix.sub("", self.contents)

    self.lines = self.contents.split("\n")

    state = "init"
    for line in self.lines:
      # Ignore directives
      if reg_directive.match(line):
        continue

      if state == "init":
        if reg_clutz_namespace.match(line):
          state = "ignore_block"
          continue

        match = reg_start_namespace.match(line)
        if match:
          state = "collect_namespace"
          namespace_name = match.group("namespace")
          if self.namespaces[namespace_name]:
            self.namespaces[namespace_name].append("")
          continue

      if state == "ignore_block":
        if reg_end_block.match(line):
          state = "init"
        continue

      if state == "collect_namespace":
        if reg_end_block.match(line):
          state = "init"
          continue
        if reg_comment_start.match(line):
          state = "ignore_comment_block"
          continue
        if reg_no_structural.match(line):
          continue
        line = reg_global_error.sub("Error", line)
        self.namespaces[namespace_name].append(line)
        continue

      if state == "ignore_comment_block":
        if reg_comment_end.match(line):
          state = "collect_namespace"
        continue

      # Catch-all include line in output
      if line:
        self.result.append(line)

    sep = None
    for namespace_name in sorted(self.namespaces.keys()):
      if sep is not None:
        self.result.append(sep)
      self.result.append("declare namespace %s {" % namespace_name)
      self.result.extend(self.namespaces[namespace_name])
      self.result.append("}")
      sep = ""

    self.result.append("")
    return "\n".join(self.result)

if __name__ == "__main__":
  main(sys.argv)