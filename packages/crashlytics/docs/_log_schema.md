## Log Schema

Here is the schema from a sample log with all of the fields that you can expect to see:

```json
{
  "insertId": "insert_id",
  "jsonPayload": {
    "exception.stacktrace": "stacktrace",
    "exception.message": "test error",
    "exception.type": "Error"
  },
  "httpRequest": {
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36,gzip(gfe)"
  },
  "resource": {
    "type": "firebasetelemetry.googleapis.com/App",
    "labels": {
      "resource_container": "projects/YOUR_PROJECT_ID",
      "location": "global",
      "app_id": "YOUR_APP_ID",
      "app_version": ""
    }
  },
  "timestamp": "2026-06-25T21:19:44.619Z",
  "severity": "ERROR",
  "labels": {
    "attr": "value",
    "app.installation.id": "YOUR_INSTALLATION_ID",
    "exception.type": "Error",
    "service.name": "YOUR_APP_ID",
    "app_id": "YOUR_APP_ID",
    "location": "global",
    "session.id": "YOUR_SESSION_ID",
    "exception.stacktrace": "stacktrace",
    "gcp.resource_type": "firebasetelemetry.googleapis.com/App",
    "exception.message": "test error",
    "gcp.telemetry_type": "standard",
    "service.version": "",
    "cloud.resource.id": "//firebasetelemetry.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/",
    "gcp.project.id": "projects/YOUR_PROJECT_ID",
    "user_agent.version": "150",
    "gcp.project_id": "YOUR_PROJECT_ID",
    "resource_container": "projects/YOUR_PROJECT_ID",
    "os.version": "10_15_7",
    "browser.platform": "macintosh",
    "gcp.telemetry_config.service": "firebasetelemetry.googleapis.com",
    "os.name": "intel mac os x",
    "user_agent.name": "chrome",
    "app.build_id": "unset"
  },
  "logName": "projects/YOUR_PROJECT_ID/logs/firebasetelemetry.googleapis.com%2Fevents",
  "receiveTimestamp": "2026-06-25T21:19:45.105200710Z",
  "errorGroups": [
    {
      "id": "error_group_id"
    }
  ],
  "otel": {
    "resource": {
      "attributes": {
        "gcp.resource_type": "firebasetelemetry.googleapis.com/App",
        "service.version": "",
        "user_agent.version": "150",
        "cloud.resource.id": "//firebasetelemetry.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/",
        "gcp.project.id": "projects/YOUR_PROJECT_ID",
        "os.version": "10_15_7",
        "gcp.project_id": "YOUR_PROJECT_ID",
        "resource_container": "projects/YOUR_PROJECT_ID",
        "browser.platform": "macintosh",
        "os.name": "intel mac os x",
        "user_agent.name": "chrome",
        "app.build_id": "",
        "service.name": "firebase_telemetry_service",
        "app_id": "YOUR_APP_ID",
        "location": "global",
        "user_agent.original": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36,gzip(gfe)"
      }
    }
  }
}
```
