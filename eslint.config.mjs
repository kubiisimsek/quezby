import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      'apps/mobile/vendor/**',
      'apps/api/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js,cjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-const': 'off',
    },
  },
  {
    // The admin panel judges nothing (every score comes from the API) and is
    // a web app that shares packages with the phone, never code.
    files: ['apps/admin/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@quezby/engine', '@quezby/engine/*'],
              message: 'The admin panel computes no score: every number comes from the API.',
            },
            {
              group: ['react-native', 'react-native-*', '**/apps/mobile/**'],
              message: 'The admin panel is a web app; it shares packages with the phone, never code.',
            },
          ],
        },
      ],
    },
  },
  {
    // Pages and components read the API through hooks and the SDK only.
    files: ['apps/admin/src/pages/**/*.{ts,tsx}', 'apps/admin/src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Read the API through a hook in src/hooks/api and the SDK client.' },
      ],
    },
  },
  eslintConfigPrettier,
);
