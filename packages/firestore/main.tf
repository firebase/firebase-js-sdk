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

variable "projectId" {}

provider "google" {
  project = var.projectId
}

resource "google_firestore_index" "default_db_index" {
  collection = "composite-index-test-collection"

  for_each = local.indexes
  dynamic "fields" {
    for_each = distinct(flatten([for k, v in local.indexes : [
      for i in each.value : {
        field_path   = i.field_path
        order        = can(i.order) ? i.order : null
        array_config = can(i.array_config) ? i.array_config : null
    }]]))
    content {
      field_path   = fields.value.field_path
      order        = fields.value.order
      array_config = fields.value.array_config
    }
  }
}

resource "google_firestore_index" "default_db_collection_group_index" {
  collection  = "composite-index-test-collection"
  query_scope = "COLLECTION_GROUP"

  for_each = local.collection_group_indexes
  dynamic "fields" {
    for_each = distinct(flatten([for k, v in local.indexes : [
      for i in each.value : {
        field_path   = i.field_path
        order        = can(i.order) ? i.order : null
        array_config = can(i.array_config) ? i.array_config : null
    }]]))
    content {
      field_path   = fields.value.field_path
      order        = fields.value.order
      array_config = fields.value.array_config
    }
  }
}

resource "google_firestore_index" "named_db_index" {
  collection = "composite-index-test-collection"
  database   = "test-db"

  for_each = local.indexes
  dynamic "fields" {
    for_each = distinct(flatten([for k, v in local.indexes : [
      for i in each.value : {
        field_path   = i.field_path
        order        = can(i.order) ? i.order : null
        array_config = can(i.array_config) ? i.array_config : null
    }]]))
    content {
      field_path   = fields.value.field_path
      order        = fields.value.order
      array_config = fields.value.array_config
    }
  }
}

resource "google_firestore_index" "named_db_collection_group_index" {
  collection  = "composite-index-test-collection"
  database    = "test-db"
  query_scope = "COLLECTION_GROUP"

  for_each = local.collection_group_indexes
  dynamic "fields" {
    for_each = distinct(flatten([for k, v in local.indexes : [
      for i in each.value : {
        field_path   = i.field_path
        order        = can(i.order) ? i.order : null
        array_config = can(i.array_config) ? i.array_config : null
    }]]))
    content {
      field_path   = fields.value.field_path
      order        = fields.value.order
      array_config = fields.value.array_config
    }
  }
}
