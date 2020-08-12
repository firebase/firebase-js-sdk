# Modular Export Binary Size Calculator 

## Command Line Option

-  `--version`               Show version number                         [boolean]
-  `--inputModule, --im`      The name of the module(s) to be analyzed. example: --inputModule "@firebase/functions-exp" "firebase/auth-exp" [array]
-  `--inputDtsFile, --if`     Support for adhoc analysis. requires a path to dts file [string]
-  `--inputBundleFile, --ib`  Support for adhoc analysis. requires a path to a bundle file [string]
- `--output, -o`            The location where report(s) will be generated, a directory path if module(s) are analyzed; a file path if ad hoc analysis is to be performed [string]
- `--help `                  Show help [boolean]



## Commands To Run The Tool 

### Adhoc Support 

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --if <path to dts file> --ib <path to bundle file> -o <path to output FILE>`

### To Do Analysis On One to Many Firebase Modules

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --im "@firebase/module1-exp" "@firebase/module2-exp" -o <path to output DIRECTORY>`

### To Do Analysis On All Firebase-Exp Modules

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts  -o <path to output DIRECTORY>`


