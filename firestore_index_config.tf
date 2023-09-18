locals {
  project = jsondecode(file("config/project.json"))
  indexes = {
    index1 = [
      {
        field_path = "key"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "ASCENDING"
      },
      {
        field_path = "sort"
        order      = "ASCENDING"
      },
    ],
    index2 = [
      {
        field_path = "key"
        order      = "ASCENDING"
      },
      {
        field_path = "testId"
        order      = "DESCENDING"
      },
      {
        field_path = "sort"
        order      = "DESCENDING"
      },
    ],
  }
}
