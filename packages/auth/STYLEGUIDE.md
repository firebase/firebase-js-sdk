# Firebase-auth Web Style Guide

Here are the style rules to follow for Firebase-auth:

## #1 Be consistent with the rest of the codebase

This is the number one rule and should help determine what to do in most cases.

## #2 Respect Google JavaScript style guide

The style guide accessible
[here](https://google.github.io/styleguide/javascriptguide.xml) has to be fully
respected.

## #3 Follow these grammar rules

- Functions descriptions have to start with a verb using the third person of the
singular.
  - *Ex: `/** Tests the validity of the input. */`*
- Inline comments within procedures should always use the imperative.
  - *Ex: `// Check whether the value is true.`*
- Acronyms have to be uppercased in comments.
  - *Ex: `// IP, DOM, CORS, URL...`*
  - *Exception: Identity Provider = IdP*
- Acronyms have to be capitalized (but not uppercased) in variable names.
  - *Ex: `redirectUrl()`, `signInIdp()`*
- Never use login/log in in comments. Use “sign-in” if it’s a noun, “sign in” if
it’s a verb. The same goes for the variable name. Never use `login`; always use
`signIn`.
  - *Ex: `// The sign-in method.`*
  - *Ex: `// Signs in the user.`*
- Always start an inline comment with a capital (unless referring to the name of
a variable/function), and end it with a period.
  - *Ex: `// This is a valid inline comment.`*
