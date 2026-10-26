import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import jsdoc from 'eslint-plugin-jsdoc'
import nPlugin from 'eslint-plugin-n'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const testOnlyImports = {
  group: ['**/test-helpers/**', '\\#vite/**'],
  message: 'Test helpers and fixtures are for tests only.'
}

/**
 * Each brand is minted only where its value enters the app; everywhere else
 * takes it already branded.
 */
const brandConstructors = [
  {
    name: 'toBackendToken',
    module: 'backend-token.js',
    mintedIn: [
      'src/server/auth/plugins/defra-id.js',
      'src/server/auth/plugins/entra-id.js'
    ],
    message:
      'Only a sign-in provider mints a backend token - take one from the session instead.'
  },
  {
    name: 'toOrganisationNumber',
    module: 'organisation-number.js',
    mintedIn: [
      'src/server/common/helpers/organisations/organisation-number-of.js'
    ],
    message:
      'An organisation number arrives branded from route params or the backend - type it there, or read a numeric orgId with organisationNumberOf.'
  },
  {
    name: 'toRegistrationNumber',
    module: 'registration-number.js',
    mintedIn: [
      'src/server/common/helpers/organisations/registration-in-view.js'
    ],
    message:
      'A registration number arrives branded from route params or the backend - type it there instead.'
  },
  {
    name: 'toAccreditationNumber',
    module: 'accreditation-number.js',
    mintedIn: [],
    message:
      'An accreditation number arrives branded from the backend - type it there instead.'
  }
]

/**
 * @param {typeof brandConstructors} constructors
 */
const restrictedImports = (constructors) => [
  'error',
  {
    patterns: [
      testOnlyImports,
      ...constructors.map(({ name, module, message }) => ({
        group: [`**/${module}`],
        importNames: [name],
        message
      }))
    ]
  }
]

const mintingFiles = [
  ...new Set(brandConstructors.flatMap(({ mintedIn }) => mintedIn))
]

export default [
  // ESLint recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  jsdoc.configs['flat/recommended'],
  nPlugin.configs['flat/recommended-script'],

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
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'object-shorthand': ['error', 'properties'],
      // Turn off strict type checking rules
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // JSDoc blocks are optional by default
      'jsdoc/require-jsdoc': 'off',

      // Prefer `@import { X } from '...'` over inline `import('...').X` in types.
      // named-import avoids the fixer's mangled namespace output; do not rely on
      // --fix (wrong placement, no block merge) - hoist by hand when flagged.
      'jsdoc/prefer-import-tag': [
        'error',
        { outputType: 'named-import', exemptTypedefs: false }
      ],

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

      // Web Fetch globals provided by @types/node — recognise without @import
      'jsdoc/no-undefined-types': [
        'error',
        {
          definedTypes: [
            'BodyInit',
            'HeadersInit',
            'NodeJS',
            'RequestInfo',
            'RequestInit',
            'Response'
          ]
        }
      ],

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

  // Production code takes nothing from tests, and mints a brand only where
  // its value enters the app
  {
    files: ['src/**/*.js'],
    ignores: ['src/**/test-helpers/**', '**/*.test.js'],
    rules: {
      'no-restricted-imports': restrictedImports(brandConstructors)
    }
  },
  ...mintingFiles.map((file) => ({
    files: [file],
    rules: {
      'no-restricted-imports': restrictedImports(
        brandConstructors.filter(({ mintedIn }) => !mintedIn.includes(file))
      )
    }
  })),

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
    files: ['**/*.test.{cjs,js}', '.vite/setup-files.js'],
    plugins: {
      vitest
    },
    settings: {
      vitest: {
        vitestImports: ['#vite/fixtures/server.js']
      }
    },
    rules: {
      ...vitest.configs.all.rules,

      // Allow import devDependencies
      'n/no-unpublished-import': [
        'error',
        {
          allowModules: ['vitest', '@testing-library/jest-dom']
        }
      ],

      // Custom vitest rule overrides
      'vitest/consistent-test-it': 'off',
      'vitest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expectTypeOf'] }
      ],
      'vitest/no-hooks': 'off',
      'vitest/padding-around-all': 'off', // Let Prettier handle formatting
      'vitest/padding-around-expect-groups': 'off', // Let Prettier handle formatting
      'vitest/prefer-expect-assertions': 'off',
      'vitest/prefer-importing-vitest-globals': 'off', // Incompatible with test.extend() fixtures
      'vitest/prefer-lowercase-title': 'off', // Allow #ControllerName convention
      'vitest/require-mock-type-parameters': 'off',
      'vitest/valid-title': [
        'error',
        {
          allowArguments: true
        }
      ]
    }
  },

  // Apply prettier config last to override conflicting rules
  eslintPluginPrettierRecommended
]
