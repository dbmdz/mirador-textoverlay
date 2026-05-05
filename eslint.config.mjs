import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    extends: fixupConfigRules(
      compat.extends(
        'eslint:recommended',
        'plugin:prettier/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
      ),
    ),
    plugins: {
      'react-refresh': reactRefresh.plugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'require-jsdoc': 'off',
    },
  },
  globalIgnores([
    '**/dist',
    '**/demo/dist',
    '**/coverage',
    '**/node_modules',
    '**/package-lock.json',
    '**/pnpm-lock.yaml',
    '**/eslint.config.mjs',
    '**/vite.config.js',
    '__tests__/**',
  ]),
]);
