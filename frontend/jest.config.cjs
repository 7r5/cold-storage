// Jest config (CommonJS, since package.json has type: module)
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEach: ['<rootDir>/src/test/setup.js'],
  setupFiles: ['<rootDir>/src/test/globals.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    'leaflet': '<rootDir>/src/test/__mocks__/leaflet.js',
    'react-leaflet': '<rootDir>/src/test/__mocks__/react-leaflet.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/*.test.(js|jsx)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/test/**',
    '!src/App.jsx',
    '!src/api/client.js',
    '!src/api/socket.js',
    // Pages with heavy map/socket deps — tested via integration/e2e
    '!src/pages/Monitors.jsx',
    '!src/pages/NuevaRuta.jsx',
    '!src/pages/Root.jsx',
    '!src/pages/TruckDetail.jsx',
    '!src/components/Layout.jsx',
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
};
