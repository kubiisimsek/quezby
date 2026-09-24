const fs = require('fs');
const path = require('path');

/**
 * react-native-dotenv would also merge `.env.local`, `.env.<NODE_ENV>` and
 * `.env.<NODE_ENV>.local` over `.env` — a `.env.production` would slip into
 * every release bundle, whatever `.env` is switched to. Quezby keeps every
 * environment in the one `.env` (`pnpm switch-<env>`), so any of those is a
 * mistake worth stopping the build for.
 */
function refuseShadowingEnvFiles() {
  const shadowing = [
    '.env.local',
    '.env.development',
    '.env.development.local',
    '.env.production',
    '.env.production.local',
  ].filter((name) => fs.existsSync(path.join(__dirname, name)));
  if (shadowing.length > 0) {
    throw new Error(
      `apps/mobile/${shadowing.join(', ')} would override apps/mobile/.env in the bundle. ` +
        'Keep every environment in .env and switch with pnpm switch-local | switch-staging | switch-production.',
    );
  }
}

module.exports = (api) => {
  // Under Jest `@env` is src/types/env.mock.ts (jest.config.js), never the
  // real .env: tests must not depend on which environment it is switched to.
  const testing = api.env('test');
  if (!testing) refuseShadowingEnvFiles();

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      ...(testing
        ? []
        : [
            [
              'module:react-native-dotenv',
              {
                moduleName: '@env',
                path: '.env',
                safe: false,
                allowUndefined: true,
              },
            ],
          ]),
      'react-native-worklets/plugin',
    ],
  };
};
