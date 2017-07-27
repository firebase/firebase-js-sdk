# Contributing to the Firebase JS SDK

We'd love for you to contribute to our source code and to help make the Firebase JS SDK even better than it is today! Here are the guidelines we'd like you to follow:

 - [Code of Conduct](#coc)
 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Submission Guidelines](#submit)
 - [Coding Rules](#rules)
 - [Signing the CLA](#cla)

## <a name="coc"></a> Code of Conduct

As contributors and maintainers of the Firebase JS SDK project, we pledge to respect everyone who contributes by posting issues, updating documentation, submitting pull requests, providing feedback in comments, and any other activities.

Communication through any of Firebase's channels (GitHub, StackOverflow, Google+, Twitter, etc.) must be constructive and never resort to personal attacks, trolling, public or private harassment, insults, or other unprofessional conduct.

We promise to extend courtesy and respect to everyone involved in this project regardless of gender, gender identity, sexual orientation, disability, age, race, ethnicity, religion, or level of experience. We expect anyone contributing to the project to do the same.

If any member of the community violates this code of conduct, the maintainers of the Firebase JS SDK project may take action, removing issues, comments, and PRs or blocking accounts as deemed appropriate.

If you are subject to or witness unacceptable behavior, or have any other concerns, please drop us a line at firebase-code-of-conduct@google.com. 

## <a name="question"></a> Got a Question?

If you have questions about how to use the Firebase JS SDK, please direct these to [StackOverflow][stackoverflow] and use the `firebase` and `javascript` tags. You can also use the [Firebase Google Group][firebase-google-group] or [Slack][slack] to contact members of the Firebase team for help.

## <a name="issue"></a> Found an Issue?

If you find a bug in the source code, a mistake in the documentation, or some other issue, you can help us by submitting an issue to our [GitHub Repository][github]. Even better you can submit a Pull Request with a test demonstrating the bug and a fix!

See [below](#submit) for some guidelines.

## <a name="other-issue"></a> Production Issues

If you have a production issue, please [contact Firebase support][support] who will work with you to resolve the issue. 

## <a name="submit"></a> Submission Guidelines

### Submitting an Issue

Before you submit your issue, try searching [past issues][archive], [StackOverflow][stackoverflow], and the [Firebase Google Group][firebase-google-group] for issues similar to your own. You can help us to maximize the effort we spend fixing issues, and adding new features, by not reporting duplicate issues. 

If your issue appears to be a bug, and hasn't been reported, open a new issue. Providing the following information will increase the chances of your issue being dealt with quickly:

* **Description of the Issue** - if an error is being thrown a non-minified stack trace helps
* **Motivation for or Use Case** - explain why this is a bug for you
* **Related Issues** - has a similar issue been reported before?
* **Environment Configuration** - is this a problem with Node.js, or only a specific browser? Is this only in a specific version of the SDK?
* **Reproduce the Error** - provide a live example (like [JSBin][jsbin]), a Github repo, or an unambiguous set of steps
* **Suggest a Fix** - if you can't fix the bug yourself, perhaps you can point to what might be causing the problem (line of code or commit)

There is an issue template provided to help capture all of this information. Following the template will also help us to route your issue to the appropriate teams faster, helping us to better help you!

Also as a great rule of thumb:

**If you get help, help others. Good karma rulez!**

### Submitting a Pull Request

### Before you contribute

Before we can use your code, you must sign the [Google Individual Contributor License Agreement][google-cla] (CLA), which you can do online. The CLA is necessary mainly because you own the copyright to your changes, even after your contribution becomes part of our codebase, so we need your permission to use and distribute your code. We also need to be sure of various other things, for instance, that you'll tell us if you know that your code infringes on other people's patents. You don't have to sign the CLA until after you've submitted your code for review and a member has approved it, but you must do it before we can put your code into our codebase. There is also a nifty CLA bot that will guide you through this process if you are going through it for the first time.

Before you start working on a larger contribution, you should get in touch with us first through the issue tracker with your idea so that we can help out and possibly guide you. Coordinating up front makes it much easier to avoid frustration later on. Some pull requests (large contributions, API additions/changes, etc) may be subject to additional internal review, we appreciate your patience as we fully validate your contribution.

### Pull Request Guidelines

* Search [GitHub](https://github.com/firebase/firebase-js-sdk/pulls) for an open or closed Pull Request that relates to your submission. You don't want to duplicate effort.
* Create an issue to discuss a change before submitting a PR. We'd hate to have to turn down your contributions because of something that could have been communicated early on.
* [Create a fork of the GitHub repo][fork-repo] to ensure that you can push your changes for us to review.
* Make your changes in a new git branch:

  ```shell
  git checkout -b my-fix-branch master
  ```

* Create your patch, **including appropriate test cases**. Patches with tests are more likely to be merged.
* Avoid checking in files that shouldn't be tracked (e.g `node_modules`, `gulp-cache`, `.tmp`, `.idea`). If your development setup automatically creates some of these files, please add them to the `.gitignore` at the root of the package (click [here][gitignore] to read more on how to add entries to the `.gitignore`).
* Commit your changes using a commit message that follows our [commit message guidelines](#commit-message-guidelines).

     ```shell
     git commit -a
     ```
  _Note: the optional commit `-a` command line option will automatically "add" and "rm" edited files._

* Test your changes locally to ensure everything is in good working order:

    ```shell
   npm test
    ```

* Push your branch to your fork on GitHub:

    ```shell
    git push origin my-fix-branch
    ```

* In GitHub, send a pull request to `firebase-js-sdk:master`.
* All pull requests must be reviewed by a member of the Firebase JS SDK team, who will merge it when/if they feel it is good to go.

That's it! Thank you for your contribution!

## <a name="commit-message-guidelines"></a> Commit Message Guidelines

This repository follows the commit message format defined by the 
[validate-commit-msg](https://npm.im/validate-commit-msg) package on NPM. This is
to make the git history easy to follow, and make it easier to identify which
commits are associated with features, bugfixes, etc.

We are also Commitizen friendly! If you have the [Commitizen CLI](https://npm.im/commitizen) installed
you can simply use `git cz` to create properly formatted commit messages.

[archive]: https://github.com/firebase/firebase-js-sdk/issues?utf8=%E2%9C%93&q=is%3Aissue
[file-an-issue]: https://github.com/firebase/firebase-js-sdk/issues/new
[firebase-google-group]: https://groups.google.com/forum/#!forum/firebase-talk
[fork-repo]: https://github.com/firebase/firebase-js-sdk/fork
[github]: https://github.com/firebase/firebase-js-sdk
[gitignore]: https://git-scm.com/docs/gitignore
[google-cla]: https://cla.developers.google.com/about/google-individual
[js-style-guide]: http://google.github.io/styleguide/javascriptguide.xml
[jsbin]: http://jsbin.com/rinilu/edit?js,console
[slack]: https://firebase-community.appspot.com/
[stackoverflow]: http://stackoverflow.com/questions/tagged/firebase
[support]: https://firebase.google.com/support/