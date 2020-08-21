# Modular Export Binary Size Calculator 

## Command Line Option

-  `--version`               Show version number                         [boolean]
-  `--inputModule, --im`      The name of the module(s) to be analyzed. example: --inputModule "@firebase/functions-exp" "firebase/auth-exp" [array]
-  `--inputDtsFile, --if`     Support for adhoc analysis. requires a path to dts file [string]
-  `--inputBundleFile, --ib`  Support for adhoc analysis. requires a path to a bundle file [string]
- `--output, -o`            The location where report(s) will be generated, a directory path if module(s) are analyzed; a file path if ad hoc analysis is to be performed [string]
- `--help `                  Show help [boolean]



## Command Line Interface

### Adhoc Support 

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --if <path to dts file> --ib <path to bundle file> -o <path to output FILE>`

### To Do Analysis On One to Many Firebase Modules

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --im "@firebase/module1-exp" "@firebase/module2-exp" -o <path to output DIRECTORY>`

### To Do Analysis On All Firebase-Exp Modules

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts  -o <path to output DIRECTORY>`


## Use the Tool Programatically 
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

