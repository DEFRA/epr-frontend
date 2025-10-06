import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import jsdoc from 'eslint-plugin-jsdoc'
import nPlugin from 'eslint-plugin-n'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import promisePlugin from 'eslint-plugin-promise'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // ESLint recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  promisePlugin.configs['flat/recommended'],
  jsdoc.configs['flat/recommended'],

  // Global ignores
  {
    ignores: ['.server', '.public', 'coverage', 'node_modules']
  },

  // Base config for all .js and .cjs files
  {
    files: ['**/*.{cjs,js}'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json']
      },
      globals: {
        ...globals.node
      }
    },
    plugins: {
      n: nPlugin
    },
    rules: {
      'no-console': 'error',

      // Turn off strict type checking rules
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // JSDoc blocks are optional by default
      'jsdoc/require-jsdoc': 'off',

      // JSDoc @param types are mandatory for JavaScript
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-param': 'off',

      // JSDoc @property description is optional
      'jsdoc/require-property-description': 'off',

      // JSDoc @returns is optional
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-returns': 'off',

      // Check for mandatory file extensions
      // https://nodejs.org/api/esm.html#mandatory-file-extensions
      'import/extensions': ['error', 'always', { ignorePackages: true }],

      // Skip rules handled by TypeScript compiler
      'import/default': 'off',
      'import/namespace': 'off',
      'n/no-extraneous-require': 'off',
      'n/no-extraneous-import': 'off',
      'n/no-missing-require': 'off',
      'n/no-missing-import': 'off'
    },
    settings: {
      'import/parsers': {
        'typescript-eslint': ['.cjs', '.js']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        },
        node: true
      }
    }
  },

  // CommonJS type for .cjs files
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',

      // Allow require devDependencies
      'n/no-unpublished-require': [
        'error',
        {
          allowModules: []
        }
      ]
    }
  },

  // Browser environment for client files
  {
    files: ['src/client/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },

  // Test files with vitest
  {
    files: ['**/*.test.{cjs,js}'],
    plugins: {
      vitest
    },
    rules: {
      ...vitest.configs.all.rules,

      // Allow import devDependencies
      'n/no-unpublished-import': [
        'error',
        {
          allowModules: ['vitest']
        }
      ],

      // Custom vitest rule overrides
      'vitest/consistent-test-it': 'off',
      'vitest/no-hooks': 'off',
      'vitest/prefer-expect-assertions': 'off',
      'vitest/require-mock-type-parameters': 'off',
      'vitest/valid-title': [
        'warn',
        {
          allowArguments: true
        }
      ]
    }
  },

  // Apply prettier config last to override conflicting rules
  eslintPluginPrettierRecommended
]
