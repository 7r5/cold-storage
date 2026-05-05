// Leaflet mock for Jest (jsdom does not support canvas/SVG APIs that Leaflet needs)
const L = {
  divIcon: jest.fn(() => ({})),
  latLngBounds: jest.fn(() => ({ extend: jest.fn(), isValid: jest.fn(() => true) })),
  Icon: {
    Default: {
      prototype: { _getIconUrl: jest.fn() },
      mergeOptions: jest.fn(),
    },
  },
};
module.exports = L;
module.exports.default = L;
