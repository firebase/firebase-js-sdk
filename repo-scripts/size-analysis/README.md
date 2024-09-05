# Modular Export Binary Size Calculator 

The library supports two main features:
- Analyze the size of individual exports from a given package.
- Analyze the size of predefined bundle definitions. A bundle definition is a group of imports from different Firebase packages to support a certain use case. For example, to support Google signin and read from Firestore once.

## Analyze the size of individual exports
### CLI Usage

Flags

-  `--version`               Show version number                         [boolean]
-  `--inputModule, --im`      The name of the module(s) to be analyzed. example: --inputModule "@firebase/functions" "firebase/auth" [array]
-  `--inputDtsFile, --if`     Support for adhoc analysis. requires a path to dts file [string]
-  `--inputBundleFile, --ib`  Support for adhoc analysis. requires a path to a bundle file [string]
- `--output, -o`            The location where report(s) will be generated, a directory path if module(s) are analyzed; a file path if ad hoc analysis is to be performed [string]
- `--help `                  Show help [boolean]

#### To Do Analysis On One or Multiple Firebase Packages

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script cli.ts --im "@firebase/app" "@firebase/auth" -o <path to output DIRECTORY>`.

#### To Do Analysis On All Firebase Packages

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script cli.ts  -o <path to output DIRECTORY>`
#### Adhoc Support

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script cli.ts --if <path to dts file> --ib <path to bundle file> -o <path to output FILE>`


### Use the Tool Programatically 
### `async generateReportForModule(moduleLocation: string): Promise<Report>`
#### This function generates size analysis report for the given module specified by the `moduleLocation` argument.
#### `@param moduleLocation: an absolute path to location of a firebase module`
```
try {
  const moduleLocation: string = "absoulte/path/to/firebase/module";
  const report: Report = await generateReportForModule(moduleLocation);
  console.log(report);


}catch (error) {


  console.log(error);
}


```

### `async generateReportForModules(moduleLocations: string[]): Promise<Report[]>`
#### This function recursively generates a size analysis report for every module (and its submodules) listed in moduleLocations array 
#### `@param moduleLocations: an array of strings where each is a path to location of a firebase module`

```
try {
  const moduleLocations: string[] = ['...module1', '...module2'];
  const reports: Report[] = await generateReportForModules(moduleLocations);
  console.log(reports);


}catch (error) {


  console.log(error);
}


```

### `async generateReport(name: string, dtsFile: string, bundleFile: string): Promise<Report>`
#### Use this function for adhoc analysis. This function generates a size analysis report from the given definition file. 
#### `@param name: name to be displayed on the report`
#### `@param: dtsFile: absolute path to a definition file of interest.`
#### `@param bundleFile: absolute path to the bundle file of given definition file`


```
try {
  const name: string = "adhoc";
  const dtsFile: string = '.../index.d.ts';
  const bundleFile: string = '.../index.esm2017.js';
  const report: Report = await generateReport(name, dtsFile, bundleFile);
  console.log(report);


}catch (error) {


  console.log(error);
}


```


## Analyze the Size of Bundles

A bundle is defined by a bundle definition. A bundle definition is a group of imports from different Firebase packages to support a certain use case.

You can find some sample bundle definitions in the `/bundle-definitions` folder.

### CLI Usage

To analyze bundles, you would use the command `bundle`:
$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script cli.ts bundle [FLAGs]`.

Flags

- `--input`, or `-i`  Path to the bundle definition file'

- `--mode`, or `-m` Possible values are `npm` and `local`
  - `npm`: analyze packages published to npm
  - `local`: ignore the version defined in bundle definition and analyze the corresponding local packages
- `--bundler`, or `-b`. Possible values are `rollup`, `webpack`, `both`. Decides which bundlers to be used to create bundles.
- `--output`, or `-o` The output file location of the bundle analysis result.
- `--debug`, or `-d` Enables the debug mode which output additional data in the bundle analysis result.
