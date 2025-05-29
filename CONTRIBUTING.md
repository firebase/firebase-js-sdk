# Contributing to the Firebase JS SDK

We'd love for you to contribute to our source code and to help make the Firebase JS SDK even better
than it is today! Here are the guidelines we'd like you to follow:

 - [Code of Conduct](#coc)
 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Submission Guidelines](#submit)
 - [Updating Documentation](#docs)

## <a name="coc"></a> Code of Conduct

As contributors and maintainers of the Firebase JS SDK project, we pledge to respect everyone who
contributes by posting issues, updating documentation, submitting pull requests, providing feedback
in comments, and any other activities.

Communication through any of Firebase's channels (GitHub, StackOverflow, X, etc.)
must be constructive and never resort to personal attacks, trolling, public or private harassment,
insults, or other unprofessional conduct.

We promise to extend courtesy and respect to everyone involved in this project regardless of gender,
gender identity, sexual orientation, disability, age, race, ethnicity, religion, or level of
experience. We expect anyone contributing to the project to do the same.

If any member of the community violates this code of conduct, the maintainers of the Firebase JS SDK
project may take action, removing issues, comments, and PRs or blocking accounts as deemed
appropriate.

If you are subject to or witness unacceptable behavior, or have any other concerns, please drop us a
line at firebase-code-of-conduct@google.com.

## <a name="question"></a> Got a Question?

If you have questions about how to use the Firebase JS SDK, please direct these to
[StackOverflow][stackoverflow] and use the `firebase` and `javascript` tags. You can also use the
[Firebase Google Group][firebase-google-group] or [Slack][slack] to contact members of the Firebase
team for help.

## <a name="issue"></a> Found an Issue?

If you find a bug in the source code, a mistake in the documentation, or some other issue, you can
help us by submitting an issue to our [GitHub Repository][github]. Even better you can submit a Pull
Request with a test demonstrating the bug and a fix!

See [below](#submit) for some guidelines.

## <a name="other-issue"></a> Production Issues

If you have a production issue, please [contact Firebase support][support] who will work with you to
resolve the issue.

## <a name="submit"></a> Submission Guidelines

### Submitting an Issue

Before you submit your issue, try searching [past issues][archive], [StackOverflow][stackoverflow],
and the [Firebase Google Group][firebase-google-group] for issues similar to your own. You can help
us to maximize the effort we spend fixing issues, and adding new features, by not reporting
duplicate issues.

If you encounter an issue that appears to be a bug that has not been reported before, please
[open a new issue in the repo](https://github.com/firebase/firebase-js-sdk/issues/new/choose). When
filling out the new issue report form, be sure to include as much information as possible, such as
reproduction steps, the error message you received, and any screenshots or other relevant data. The
more context you can provide the better we will be able to understand the issue, route it to the
appropriate team, and provide you with the help you need.

Also as a great rule of thumb:

**If you get help, help others. Good karma rulez!**

## Before you Contribute

### Sign our Contributor License Agreement

Contributions to this project must be accompanied by a
[Contributor License Agreement](https://cla.developers.google.com/about) (CLA).
You (or your employer) retain the copyright to your contribution; this simply
gives us permission to use and redistribute your contributions as part of the
project.

If you or your current employer have already signed the Google CLA (even if it
was for a different project), you probably don't need to do it again.

Visit <https://cla.developers.google.com/> to see your current agreements or to
sign a new one.

### Review our community guidelines

This project follows
[Google's Open Source Community Guidelines](https://opensource.google/conduct/).

### Submitting a Pull Request

All submissions, including submissions by project members, require review. We use GitHub pull
requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more information on using
pull requests.

If you plan to work on a larger contribution, you should get in touch with us first through the
issue tracker with your idea so that we can help out and possibly guide you. Coordinating up front
makes it much easier to avoid frustration later on. Some pull requests (large contributions, API
additions/changes, etc) may be subject to additional internal review, we appreciate your patience as
we fully validate your contribution.

#### Pull Request Guidelines

* Search [GitHub](https://github.com/firebase/firebase-js-sdk/pulls) for an open or closed Pull
Request that relates to your submission. You don't want to duplicate effort.
* Create an issue to discuss a change before submitting a PR. We'd hate to have to turn down your
contributions because of something that could have been communicated early on.
* [Create a fork of the GitHub repo][fork-repo] to ensure that you can push your changes for us to
review.
* Make your changes in a new git branch:

  ```shell
  git checkout -b my-fix-branch main
  ```

* Create your change, **including appropriate test cases**. Changes with tests are more likely to be
merged.
* Avoid checking in files that shouldn't be tracked (e.g `node_modules`, `gulp-cache`, `.tmp`,
`.idea`). If your development setup automatically creates some of these files, please add them to
the `.gitignore` at the root of the package (click [here][gitignore] to read more on how to add
entries to the `.gitignore`).
* Commit your changes

     ```shell
     git commit -a
     ```
  _Note: the optional commit `-a` command line option will automatically "add" and "rm" edited
  files._

* Test your changes locally to ensure everything is in good working order:

    ```shell
   npm test
    ```

* Push your branch to your fork on GitHub:

    ```shell
    git push origin my-fix-branch
    ```

* In GitHub, create a pull request against the `firebase-js-sdk:main` branch.
* Add changeset. See [Adding changeset to PR](#adding-changeset-to-pr).
* All pull requests must be reviewed by a member of the Firebase JS SDK team, who will merge it
when/if they feel it is good to go.

That's it! Thank you for your contribution!

#### Adding changeset to PR
The repository uses changesets to associate PR contributions with major and minor version releases
and patch releases. If your change is a feature or a behavioral change (either of which should
correspond to a version bump) then you will need to generate a changeset in your PR to track the
change.

Start the changeset creation process by running the following command in the base directory of the
repository:

```shell
yarn changeset
```

You will be asked to create a description (here's an [example](https://github.com/firebase/firebase-js-sdk/pull/3284#issuecomment-649718617)). You
should include the version bump for your package as well as the description for the change. Valid
version bump types are major, minor or patch, where:

 * a major version is an incompatible API change
 * a minor version is a backwards compatible API change
 * a patch version is a backwards compatible bug fix or any change that does not affect the API. A
   refactor, for example.

Please always include the firebase package with the same version bump type as your package. This is
to ensure that the version of the firebase package will be bumped correctly, 

 For example,

```
---
"@firebase/storage": minor
"firebase": minor
---

This is a test.
```

You do not need to create a Changeset for the following changes:

 * the addition or alteration of a test
 * documentation updates
 * updates to the repository’s CI

#### Multiple changeset files

If your PR touches multiple SDKs or addresses multiple issues that require
different version bump or different description, you can create multiple
changeset files in the PR.

## <a name="docs"></a> Updating Documentation

Reference docs for the Firebase [JS SDK](https://firebase.google.com/docs/reference/js/) and
[Node (client) SDK](https://firebase.google.com/docs/reference/node/) are generated by
[Typedoc](https://typedoc.org/).

Typedoc generates this documentation from the main
[firebase index.d.ts type definition file](packages/firebase/compat/index.d.ts).  Any updates to
documentation should be made in that file.

If any pages are added or removed by your change (by adding or removing a class or interface), the
[js/toc.yaml](scripts/docgen/content-sources/js/toc.yaml) and/or
[node/toc.yaml](scripts/docgen/content-sources/node/toc.yaml) need to be modified to reflect this.

# Formatting Code
A Formatting Check CI failure in your PR indicates that the code does not follow the repo's
formatting guidelines. In your local build environment, please run the code formatting tool locally
by executing the command `yarn format`. Once the code is formatted, commit the changes and push your
branch. The push should cause the CI to re-check your PR's changes.

# Generating Documentation HTML Files

If the Doc Change Check fails in your PR, it indicates that the documentation has not been generated
correctly for the changes. In your local build environment, please run the following commands in the
root directory to generate the documentation locally:

```
yarn
yarn docgen:all
```

This will generate reference docs and the toc in `docs-devsite/`. Commit and push the generated
documentation changes to GitHub following the [PR submission guidelines](#submit). Your push
to the remote repository should force any failing documentation checks to execute again.

**NOTE:** These files are formatted to be inserted into Google's documentation site, which adds some
styling and navigation, so the raw files will be missing navigation elements and may not look
polished. However, it should be enough to preview the content.

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
