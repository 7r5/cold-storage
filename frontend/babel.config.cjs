// Babel only for Jest (Vite uses its own transform via @vitejs/plugin-react)
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    // Replace `import.meta` with `({ env: process.env })` so Jest can handle Vite files
    function importMetaPlugin() {
      return {
        visitor: {
          MetaProperty(path) {
            if (
              path.node.meta.name === 'import' &&
              path.node.property.name === 'meta'
            ) {
              path.replaceWithSourceString('({ env: process.env })');
            }
          },
        },
      };
    },
  ],
};
