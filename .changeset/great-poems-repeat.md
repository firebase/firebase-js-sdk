---
'@firebase/auth': patch
'@firebase/database-compat': patch
'@firebase/firestore': patch
'@firebase/messaging': patch
'@firebase/webchannel-wrapper': patch
'firebase': patch
---

Add the license field to placeholder sub-package.json files so that SBOM tools like Syft can detect the license of these entry points.
