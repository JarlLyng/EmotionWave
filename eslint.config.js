import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

// Globals provided by Nuxt/Nitro auto-imports
const nuxtGlobals = {
  defineNuxtConfig: 'readonly',
  defineEventHandler: 'readonly',
  defineCachedEventHandler: 'readonly',
  useRuntimeConfig: 'readonly',
  getRequestHeader: 'readonly',
  getRequestURL: 'readonly',
  setResponseHeader: 'readonly',
  setHeader: 'readonly',
  createError: 'readonly',
  useHead: 'readonly'
}

const sharedRules = {
  // The base rule misreads TypeScript type annotations (it flags parameter
  // names inside function-type positions); use the TS-aware rule instead,
  // with the conventional underscore escape hatch
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrors: 'none'
  }],
  'no-console': 'off',
  'prefer-const': 'warn',
  'no-empty': ['error', { allowEmptyCatch: true }]
}

export default [
  {
    ignores: ['.nuxt/**', '.output/**', 'dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...nuxtGlobals
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: sharedRules
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...nuxtGlobals
      }
    },
    plugins: {
      vue,
      '@typescript-eslint': tseslint
    },
    rules: sharedRules
  }
]
