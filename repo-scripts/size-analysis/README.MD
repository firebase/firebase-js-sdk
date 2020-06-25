# Modular Export Binary Size Calculator 





## Commands To Run The Tool 

### Adhoc Support 

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --if <path to dts file> --ib <path to bundle file> -o <path to output FILE>`

### To Do Analysis On Some Firebase Modules 

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --im "@firebase/module1-exp" -o <path to output FILE>`

firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts --im "@firebase/module1-exp" "@firebase/module2-exp" -o <path to output DIRECTORY>`


### To Do Analysis On All Firebase-Exp Modules

$firebase-js-sdk/repo-scripts/size-analysis  `ts-node-script analysis.ts  -o <path to output DIRECTORY>`


