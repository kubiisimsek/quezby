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
  {
    // Every word a player sees comes from the catalogs, in six languages
    // (apps/mobile/src/i18n/messages, docs/rules/react-native-rules.md): no
    // text in a screen, a kit piece or a hook. The brand is the one word left.
    files: ['apps/mobile/src/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/i18n/**', 'apps/mobile/src/**/__tests__/**', 'apps/mobile/src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/\\p{L}/u]:not([value=/^\\s*Quezby\\s*$/])',
          message: 'Words come from the catalogs: `const t = useT()`, then `t.<area>.<line>`.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(label|title|subtitle|body|hint|placeholder|message|description|eyebrow|prefix|accessibilityLabel|accessibilityHint)$/] > Literal[value=/\\p{L}/u]',
          message: 'Words come from the catalogs: `const t = useT()`, then `t.<area>.<line>`.',
        },
        {
          selector: 'Literal[value=/[çğıöşüÇĞİÖŞÜ]/]',
          message: 'Turkish belongs in the catalogs (src/i18n/messages), with the other five languages.',
        },
        {
          selector: 'TemplateElement[value.raw=/[çğıöşüÇĞİÖŞÜ]/]',
          message: 'Turkish belongs in the catalogs (src/i18n/messages), with the other five languages.',
        },
        {
          selector: 'TemplateLiteral[quasis.0.value.raw="@"]',
          message: "A player's name is written with `handle(name)` — it stays whole in Arabic.",
        },
      ],
    },
  },
  eslintConfigPrettier,
);
