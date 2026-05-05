// Tests for AuthContext: login, logout, localStorage persistence
jest.mock('../api/client', () => ({
  api: {
    baseUrl: 'http://test',
    postPublic: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import '@testing-library/jest-dom';
import { render, act, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

function TestConsumer() {
  const { user, loading, error, login, logout } = useAuth();

  async function handleLogin() {
    try { await login('admin', 'admin'); } catch { /* error stored in context */ }
  }

  return (
    <div>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error || ''}</span>
      <button onClick={handleLogin}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function setup() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  api.postPublic.mockReset();
  localStorage.clear();
});

describe('AuthContext', () => {
  it('starts with user=null when localStorage is empty', () => {
    setup();
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('restores user from localStorage', () => {
    localStorage.setItem('ccc_user', JSON.stringify({ id: 1, username: 'cached', role: 'USER' }));
    setup();
    expect(screen.getByTestId('user').textContent).toBe('cached');
  });

  it('login sets user and stores token', async () => {
    api.postPublic.mockResolvedValue({
      token: 'tok999',
      user: { id: 1, username: 'admin', role: 'USER' },
    });
    setup();
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('user').textContent).toBe('admin');
    expect(localStorage.getItem('ccc_token')).toBe('tok999');
  });

  it('login sets error on failure', async () => {
    api.postPublic.mockRejectedValue(new Error('Credenciales inválidas'));
    setup();
    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toMatch(/credenciales/i),
    );
  });

  it('logout clears user and token', async () => {
    localStorage.setItem('ccc_token', 'old');
    localStorage.setItem('ccc_user', JSON.stringify({ id: 1, username: 'admin', role: 'USER' }));
    setup();
    await act(async () => {
      screen.getByText('logout').click();
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorage.getItem('ccc_token')).toBeNull();
  });
});
