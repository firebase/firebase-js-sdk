export const dropdownData = ["12.2.1", "12.2.2", "12.2.3", "12.2.4"];

export const modules = {
    "12.2.1": {
        module1: ["function1"],
        module2: ["function1"],
        module3: ["function1"],
        module4: ["function1"],
        module5: ["function1"]
    },
    "12.2.2": {
        module1: ["function1", "function2"],
        module2: ["function1", "function2"],
        module3: ["function1", "function2"],
        module4: ["function1", "function2"],
        module5: ["function1", "function2"]

    },
    "12.2.3": {
        module1: ["function1", "function2", "function3"],
        module2: ["function1", "function2", "function3"],
        module3: ["function1", "function2", "function3"],
        module4: ["function1", "function2", "function3"],
        module5: ["function1", "function2", "function3"]

    },
    "12.2.4": {
        module1: ["function1", "function2", "function3", "function4"],
        module2: ["function1", "function2", "function3", "function4"],
        module3: ["function1", "function2", "function3", "function4"],
        module4: ["function1", "function2", "function3", "function4"],
        module5: ["function1", "function2", "function3", "function4"]

    }


}

export const sample_bundle = {
    "getFunctions": {
        "dependencies": {
            "functions": [
                "getFunctions",
                "registerFunctions"
            ],
            "classes": [
                "ContextProvider",
                "FunctionsService"
            ],
            "variables": [
                "DEFAULT_REGION",
                "FUNCTIONS_TYPE",
                "factory",
                "name",
                "version"
            ],
            "enums": [],
            "externals": [
                {
                    "'@firebase/app-exp'": [
                        "_getProvider",
                        "registerVersion",
                        "_registerComponent"
                    ],
                    "'@firebase/component'": [
                        "Component"
                    ]
                }
            ]
        },
        "sizeInBytes": 2060,
        "sizeInBytesWithExternalDeps": 6730
    },
    "httpsCallable": {
        "dependencies": {
            "functions": [
                "_errorForResponse",
                "call",
                "codeForHTTPStatus",
                "decode",
                "encode",
                "failAfter",
                "httpsCallable",
                "httpsCallable$1",
                "mapValues",
                "postJSON",
                "registerFunctions"
            ],
            "classes": [
                "ContextProvider",
                "FunctionsError",
                "FunctionsService"
            ],
            "variables": [
                "DEFAULT_REGION",
                "FUNCTIONS_TYPE",
                "LONG_TYPE",
                "UNSIGNED_LONG_TYPE",
                "errorCodeMap",
                "factory",
                "name",
                "version"
            ],
            "enums": [],
            "externals": [
                {
                    "'@firebase/app-exp'": [
                        "registerVersion",
                        "_registerComponent"
                    ],
                    "'@firebase/util'": [
                        "FirebaseError"
                    ],
                    "'@firebase/component'": [
                        "Component"
                    ]
                }
            ]
        },
        "sizeInBytes": 5809,
        "sizeInBytesWithExternalDeps": 11285
    },
    "useFunctionsEmulator": {
        "dependencies": {
            "functions": [
                "registerFunctions",
                "useFunctionsEmulator",
                "useFunctionsEmulator$1"
            ],
            "classes": [
                "ContextProvider",
                "FunctionsService"
            ],
            "variables": [
                "DEFAULT_REGION",
                "FUNCTIONS_TYPE",
                "factory",
                "name",
                "version"
            ],
            "enums": [],
            "externals": [
                {
                    "'@firebase/app-exp'": [
                        "registerVersion",
                        "_registerComponent"
                    ],
                    "'@firebase/component'": [
                        "Component"
                    ]
                }
            ]
        },
        "sizeInBytes": 2069,
        "sizeInBytesWithExternalDeps": 6691
    }
}




