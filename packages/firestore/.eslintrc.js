module.exports = {
    "extends": "../../config/.eslintrc.json",
    "parserOptions": {
        "project": "tsconfig.json",
        // to make vscode-eslint work with monorepo
        // https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-463943250
        "tsconfigRootDir": __dirname
    },
    "plugins": [
        "import"
    ],
    "rules": {
        "no-console":[ "error", { "allow": ["warn", "error"] }],
        "import/no-default-export": "error",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                "varsIgnorePattern": "^_",
                "args": "none"
            }
        ]
    },
    "overrides": [
        {
            "files": [
                "**/*.test.ts",
                "**/test/**/*.ts"
            ],
            "rules": {
                "@typescript-eslint/no-explicit-any": "error"
            }
        }
    ]
}