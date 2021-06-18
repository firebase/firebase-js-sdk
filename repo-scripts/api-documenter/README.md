# @firebase/api-documenter

It is a fork of [API Documenter](https://github.com/microsoft/rushstack/tree/master/apps/api-documenter)
It reads the *.api.json data files produced by [API Extractor](https://api-extractor.com/),
and then generates files in [Markdown](https://en.wikipedia.org/wiki/Markdown) format suitable for displaying in Firebase Devsite.

## Generate toc for Firebase devsite
`api-documenter-fire toc -i temp -p "/docs/reference/js/v9"`

`-i` and `-p` (`--host-path`) are required parameters.
Use `-i` to specify the folder that contains api.json files.
Use `-p` to specify the g3 path that contains the reference docs.

By default, the command will create `toc.yaml` in folder `/toc`. To change the output folder, use the flag `-o`.

To generate toc for the Firebase JS SDK, also set the flag `-j` to create the top level `firebase` toc item.