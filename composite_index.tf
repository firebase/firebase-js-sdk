locals {
    data = jsondecode(file("config/project.json"))
}

provider "google" {
  project     = local.data.projectId
  region      = "us-central1"
}

resource "google_firestore_index" "my-index" {
  project = local.data.projectId
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