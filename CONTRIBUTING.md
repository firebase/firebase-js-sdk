# Contributing to the Firebase JS SDK

We'd love for you to contribute to our source code and to help make the Firebase JS SDK even better
than it is today! Here are the guidelines we'd like you to follow:

 - [Code of Conduct](#coc)
 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Submission Guidelines](#submit)
 - [Updating Documentation](#docs)

## <a name="coc"></a> Code of Conduct

As contributors and maintainers of the Firebase JS SDK project, we pledge to respect everyone who
contributes by posting issues, updating documentation, submitting pull requests, providing feedback
in comments, and any other activities.

Communication through any of Firebase's channels (GitHub, StackOverflow, Google+, Twitter, etc.)
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

### Submitting a Pull Request

#### Before you contribute

Before we can use your code, you must sign the
[Google Individual Contributor License Agreement][google-cla] (CLA), which you can do online. The
CLA is necessary mainly because you own the copyright to your changes, even after your contribution
becomes part of our codebase, so we need your permission to use and distribute your code. We also
need to be sure of various other things, for instance, that you'll tell us if you know that your
code infringes on other people's patents. You don't have to sign the CLA until after you've
submitted your code for review and a member has approved it, but you must do it before we can put
your code into our codebase. There is also a nifty CLA bot that will guide you through this process
if you are going through it for the first time.

Before you start working on a larger contribution, you should get in touch with us first through the
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
  git checkout -b my-fix-branch master
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

* In GitHub, create a pull request against the `firebase-js-sdk:master` branch.
* Add changeset. See [Adding changeset to PR](#adding-changeset-to-pr).
* All pull requests must be reviewed by a member of the Firebase JS SDK team, who will merge it
when/if they feel it is good to go.

That's it! Thank you for your contribution!

#### Adding changeset to PR
The repository uses changesets to associate PR contributions with major and minor version releases
adn patch releases. If your change is a feature or a behavioral change (either of which should
correspond to a version bump) then you will need to generate a changeset in your PR to track the
change.

Start the changeset creation process by running the following command in the base directory of the
repository:

```shell
yarn changeset
```

You will be asked to create a description (here's an
[example]((https://github.com/firebase/firebase-js-sdk/pull/3284#issuecomment-649718617)). You
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
[firebase index.d.ts type definition file](packages/firebase/index.d.ts).  Any updates to
documentation should be made in that file.

If any pages are added or removed by your change (by adding or removing a class or interface), the
[js/toc.yaml](scripts/docgen/content-sources/js/toc.yaml) and/or
[node/toc.yaml](scripts/docgen/content-sources/node/toc.yaml) need to be modified to reflect this.

# Formatting Code
A Formatting Check CI failure in your PR indicates that the code does not follow the repo's
formatting guidelines. In your local build environment, please run the code formatting tool locally
by executing the command `yarn format`. Once the code is formatted, commit the changes and push your
branch. The push should cause the CI to re-check your PR's changes.

### Generating Documentation HTML Files

If the Doc Change Check fails in your PR, it indicates that the documentation has not been generated
correctly for the changes. In your local build environment, please run `yarn docgen devsite` to
generate the documentation locally. Once the documentation has been generated, commit the changes
and push your branch. The push should cause the CI to re-check your PR's changes.

In order to generate the HTML documentation files locally, go to the root of this repo, and run:

```
yarn install
yarn docgen
```

This will generate both js and node (client) reference docs. To just generate js
docs, replace the last line with:

```
yarn docgen:js
```

To just generate node docs, replace the last line with:

```
yarn docgen:node
```

Files will be written to `scripts/docgen/html` - js docs will go into the `/js`
subdirectory and node docs into the `/node` subdirectory.

**NOTE:** These files are formatted to be inserted into Google's documentation site, which adds some
styling and navigation, so the raw files will be missing navigation elements and may not look
polished. However, it should be enough to preview the content.

This process will generate warnings for files that are generated but not listed in the `toc.yaml`,
or files that are in the `toc.yaml` but were not generated (which means something is missing in
`index.d.ts`).  If this happens during the JS documentation generation, it probably means either the
`toc.yaml` or `index.d.ts` is incorrect.  But in the Node process, some generated files not being
found in `toc.yaml` are to be expected, since Node documentation is a subset of the full JS
documentation.

Follow the [PR submission guidelines](#submit) above to submit any documentation changes.

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
