// Tests for ProtectedRoute component
jest.mock('../api/client', () => ({
  api: { postPublic: jest.fn(), get: jest.fn() },
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function Wrapper({ initialUser, children, requireRole }) {
  if (initialUser) {
    localStorage.setItem('ccc_user', JSON.stringify(initialUser));
  }
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requireRole={requireRole}>
                {children}
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route path="/" element={<div>HOME PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => localStorage.clear());

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    Wrapper({ initialUser: null, children: <div>SECRET</div> });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    Wrapper({
      initialUser: { id: 1, username: 'admin', role: 'USER' },
      children: <div>SECRET</div>,
    });
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });

  it('redirects to / when user lacks required role', () => {
    Wrapper({
      initialUser: { id: 1, username: 'admin', role: 'USER' },
      requireRole: 'ROOT',
      children: <div>ROOT ONLY</div>,
    });
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ROOT ONLY')).not.toBeInTheDocument();
  });

  it('renders children when user has the required role', () => {
    Wrapper({
      initialUser: { id: 2, username: 'root', role: 'ROOT' },
      requireRole: 'ROOT',
      children: <div>ROOT CONTENT</div>,
    });
    expect(screen.getByText('ROOT CONTENT')).toBeInTheDocument();
  });
});
