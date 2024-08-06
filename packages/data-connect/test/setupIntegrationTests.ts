


// const TEST_DIR = './test/integration';
// async function setupIntegrationTest(): Promise<void> {
//     const files = fs.readdirSync(TEST_DIR, { withFileTypes: true });
//     for(const fileOrDir of files) {
//         if(fileOrDir.isDirectory()) {
//             void setupDir(fileOrDir.name);
//         }
//     }
// }
// enum FileType {
//     Schema,
//     Query,
//     Mutation,
//     Unknown
// }
// interface FileInfo {
//     contents: string;
//     fileType: FileType;
// }
// async function processFile(filePath: string, fullFileName: string): Promise<FileInfo> {
//     const fullPath = path.join(filePath, fullFileName);
//     let fileType: FileType = FileType.Unknown;
//     const fileName = path.parse(fullFileName).name;
//     if(fileName.endsWith('schema')) {
//         fileType = FileType.Schema;
//     } else if(fileName.endsWith('query')) {
//         fileType = FileType.Query;
//     } else if (fileName.endsWith('mutation')) {
//         fileType = FileType.Mutation;
//     }
//     const fileContents = await fs.promises.readFile(fullPath);
//     return {
//         fileType,
//         contents: fileContents.toString()
//     };
// }
// async function setupDir(dirPath: string): Promise<Response> {
//     // TODO: Make sync
//     const files = await fs.promises.readdir(TEST_DIR + "/" + dirPath, { withFileTypes: true });
//     const promises: Array<Promise<FileInfo>> = [];
//     const fullDirPath = TEST_DIR + "/" + dirPath;
//     for (const fileOrDir of files) {
//       if (fileOrDir.isDirectory()) {
//         throw Error(
//           'We currently do not support tests with nested directory structures'
//         );
//       }
//       promises.push(processFile(fullDirPath, fileOrDir.name));
//     }
//     const res = await Promise.all(promises);
//     const operationFiles: object[] = [];
//     const schemaFiles: object[] = [];
//     res.forEach(fileInfo => {
//         if(fileInfo.fileType === FileType.Query) {
//             const fileObj = {
//                 path: `operations/${dirPath}.query.gql`,
//                 content: fileInfo.contents
//             };
//             operationFiles.push(fileObj);
//         } else if(fileInfo.fileType === FileType.Mutation) {
//             const fileObj = {
//                 path: `operations/${dirPath}.mutation.gql`,
//                 content: fileInfo.contents
//             };
//             operationFiles.push(fileObj);
//         } else if(fileInfo.fileType === FileType.Schema) {
//             // TODO: Fix if there is more than one schema file
//             const fileObj = {
//                 path: `schema/${dirPath}.schema.gql`,
//                 content: fileInfo.contents
//             };
//             schemaFiles.push(fileObj);
//         }
//     });
      
//       /**
//        * Iterate through the directory, and read all of the query and mutation files, put them in a json file
//        * Then in each test, just import that JSON file.
//        */
//     //   const allFiles = Promise.all(await fs.readfiles)
//       const toWrite = {
//         'service_id': 'l',
//         'schema': {
//           'files': schemaFiles
//         },
//         'connectors': {
//           'c': {
//             'files': operationFiles
//           }
//         }
//       // else, create a json file that has the schema information and connectors
//     };
//     await fs.promises.writeFile(fullDirPath + '/test.original.json',JSON.stringify(toWrite));
//     return fetch(`http://localhost:${EMULATOR_PORT}/setupSchema`, {
//         method: 'POST',
//         body: JSON.stringify(toWrite)
//       });
// }
// setupIntegrationTest().then((res) => {
// // eslint-disable-next-line no-console
//     console.log("Result: " + res);
// }).catch(e => {
//     console.error(e);
//     throw e;
// });

// setupPostgresConnectionString().catch(e => {
//     console.error(e);
//     throw e;
// });