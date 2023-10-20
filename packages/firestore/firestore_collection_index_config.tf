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
