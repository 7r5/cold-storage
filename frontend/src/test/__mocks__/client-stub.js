// Auto-mock for api/client — used by moduleNameMapper when jest.mock is not explicit
// Actual mock values are set by each test via jest.mock('../../api/client', ...)
// This file just exports a stub so Babel doesn't hit import.meta.env

export const api = {
  baseUrl: 'http://localhost:4000',
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  postPublic: jest.fn(),
};
