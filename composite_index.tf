locals {
    data = jsondecode(file("config/project.json"))
}

 provider "google" {
    project = local.data.projectId
    region  = "us-central1"
 }

 resource "time_sleep" "wait_60_seconds" {
  depends_on = [local.data]
  create_duration = "60s"
}

resource "google_project_service" "firestore" {
  project = local.data.projectId
  service = "firestore.googleapis.com"
  # Needed for CI tests for permissions to propagate, should not be needed for actual usage
  depends_on = [time_sleep.wait_60_seconds]
}

resource "google_firestore_index" "default-db-index" {
  collection = "composite-index-test-collection"

  fields {
    field_path = "key"
    order      = "ASCENDING"
  }

  fields {
    field_path = "testId"
    order      = "DESCENDING"
  }

  fields {
    field_path = "sort"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "named-db-index" {
  collection = "composite-index-test-collection"
  database = "test-db"

  fields {
    field_path = "key"
    order      = "ASCENDING"
  }

  fields {
    field_path = "testId"
    order      = "DESCENDING"
  }

  fields {
    field_path = "sort"
    order      = "DESCENDING"
  }
}