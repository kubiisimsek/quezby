const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * react-native-dotenv inlines apps/mobile/.env while Metro transforms, and
 * Metro keeps transforms across restarts. Keyed on the file, the cache follows
 * `pnpm switch-<env>`: restarting Metro is enough, no `--reset-cache`.
 */
function envFingerprint() {
  try {
    const env = fs.readFileSync(path.join(projectRoot, '.env'));
    return crypto.createHash('sha256').update(env).digest('hex').slice(0, 16);
  } catch {
    return 'none';
  }
}

/**
 * Monorepo-aware Metro. Workspace packages resolve from source through their
 * `react-native` export condition, so `pnpm build:packages` is not needed to
 * run the app.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  cacheVersion: `env-${envFingerprint()}`,
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: true,
    // `@/…` is an alias, not a scoped package. Keep in sync with
    // tsconfig.json and jest.config.js.
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName.startsWith('@/')) {
        return context.resolveRequest(
          context,
          path.resolve(projectRoot, 'src', moduleName.slice(2)),
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
