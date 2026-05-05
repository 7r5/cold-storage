// react-leaflet mock for Jest
const React = require('react');

const MapContainer = ({ children }) => React.createElement('div', { 'data-testid': 'map' }, children);
const TileLayer = () => null;
const Marker = ({ children }) => React.createElement('div', { 'data-testid': 'marker' }, children);
const Popup = ({ children }) => React.createElement('div', null, children);
const Polyline = () => null;
const Circle = () => null;
const useMap = () => ({ invalidateSize: jest.fn(), setView: jest.fn(), fitBounds: jest.fn() });
const useMapEvents = (handlers) => { void handlers; return null; };

module.exports = {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
};
