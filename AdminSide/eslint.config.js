// eslint.config.js

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    // Ignores are now a top-level property of the configuration object
    ignores: ['dist'],
  },
  {
    files: ['**/*.{js,jsx}'],
    // Instead of `extends`, use `...` to spread the configuration objects
    // from the imported plugins.
    ...js.configs.recommended,
    ...reactHooks.configs['recommended-latest'],
    ...reactRefresh.configs.vite,

    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
];