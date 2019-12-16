const path = require('path');

module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'node': true
  },
  'parser': '@typescript-eslint/parser',
  'plugins': ['@typescript-eslint', '@typescript-eslint/tslint', 'import'],
  'parserOptions': {
    'ecmaVersion': 2015,
    'sourceType': 'module'
  },
  'overrides': [
    {
      'files': ['**/*.test.ts', '**/{test,testing}/**/*.ts'],
      'rules': {
        // TODO: Use https://www.npmjs.com/package/eslint-plugin-chai-friendly instead
        'no-unused-expressions': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ],
  'rules': {
    'curly': ['error', 'all'],
    'guard-for-in': 'error',
    'no-extra-label': 'error',
    'no-unused-labels': 'error',
    'new-parens': 'error',
    'no-new-wrappers': 'error',
    'no-debugger': 'error',
    'no-duplicate-case': 'error',
    'no-throw-literal': 'error',
    'no-return-await': 'error',
    'no-unsafe-finally': 'error',
    'no-unused-expressions': [
      'error',
      {
        'allowShortCircuit': true
      }
    ],
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': [
      'error',
      {
        'allowNamedFunctions': true
      }
    ],
    'prefer-const': [
      'error',
      {
        'destructuring': 'all'
      }
    ],
    'radix': 'error',
    'default-case': 'error',
    'eqeqeq': [
      'error',
      'always',
      {
        'null': 'ignore'
      }
    ],
    'no-caller': 'error',
    'no-cond-assign': ['error', 'always'],
    'use-isnan': 'error',
    'camelcase': 'error',
    'id-blacklist': ['error', 'any', 'number', 'string', 'boolean'],
    'constructor-super': 'error',
    'no-restricted-properties': [
      'error',
      {
        'object': 'it',
        'property': 'skip'
      },
      {
        'object': 'it',
        'property': 'only'
      },
      {
        'object': 'describe',
        'property': 'skip'
      },
      {
        'object': 'describe',
        'property': 'only'
      },
      {
        'object': 'xit'
      }
    ],
    'no-restricted-globals': [
      'error',
      { 'name': 'xit' },
      { 'name': 'xdescribe' },
      { 'name': 'parseInt', 'message': 'tsstyle#type-coercion' },
      { 'name': 'parseFloat', 'message': 'tsstyle#type-coercion' }
    ],
    'no-array-constructor': 'error',
    'import/no-default-export': 'error',
    'import/no-duplicates': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        // Check dependencies from both local package.json
        // and from root package.json.
        'packageDir': [path.join(__dirname, '../'), './'],
        'devDependencies': [
          '**/*.test.ts',
          '**/test/**/*.ts',
          '**/testing/**/*.ts'
        ],
        'peerDependencies': true
      }
    ],
    '@typescript-eslint/array-type': [
      'error',
      {
        'default': 'array-simple'
      }
    ],
    '@typescript-eslint/ban-types': [
      'error',
      {
        'types': {
          'Object': "Use {} or 'object' instead.",
          'String': "Use 'string' instead.",
          'Number': "Use 'number' instead.",
          'Boolean': "Use 'boolean' instead."
        }
      }
    ],
    '@typescript-eslint/class-name-casing': 'error',
    '@typescript-eslint/interface-name-prefix': ['error', 'never'],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        'accessibility': 'no-public',
        'overrides': {
          'parameterProperties': 'off'
        }
      }
    ],
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        'assertionStyle': 'as'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-namespace': [
      'error',
      {
        'allowDeclarations': true
      }
    ],
    '@typescript-eslint/triple-slash-reference': [
      'error',
      {
        'path': 'never',
        'types': 'never',
        'lib': 'never'
      }
    ],
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/semi': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        'allowExpressions': true,
        'allowTypedFunctionExpressions': true,
        'allowHigherOrderFunctions': true
      }
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        'varsIgnorePattern': '^_',
        'argsIgnorePattern': '^_'
      }
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/tslint/config': [
      'error',
      {
        'rules': {
          'jsdoc-format': true,
          'arrow-return-shorthand': true
        }
      }
    ]
  }
};
