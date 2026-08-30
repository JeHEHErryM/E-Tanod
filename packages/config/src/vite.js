const path = require('node:path');

/**
 * Shared Vite configuration extension.
 * @param {import('vite').UserConfig} config
 * @returns {import('vite').UserConfig}
 */
function withViteBase(config = {}) {
  return {
    ...config,
    resolve: {
      ...(config.resolve ?? {}),
      alias: {
        ...(config.resolve?.alias ?? {}),
        '@': path.resolve(__dirname, '../../apps/web/src'),
      },
    },
  };
}

module.exports = { withViteBase };
