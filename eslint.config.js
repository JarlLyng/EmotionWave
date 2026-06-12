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
  'no-unused-vars': 'warn',
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
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser
      }
    },
    rules: sharedRules
  },
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
      vue
    },
    rules: sharedRules
  }
]
