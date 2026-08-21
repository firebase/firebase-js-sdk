---
"@firebase/auth": patch
---

Prepare user for redirect with optional resolver

WHAT the change is:
Added optional resolver parameter to prepareUserForRedirect function.

WHY the change was made:
To provide more flexibility in handling redirects with different resolvers.

HOW a consumer should update their code:
Update the function calls to include the resolver parameter if needed.
