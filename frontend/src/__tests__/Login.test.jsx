// Login form: validates submit happy path with mocked api
jest.mock('../api/client', () => ({
  api: {
    baseUrl: 'http://test',
    postPublic: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Login from '../pages/Login';
import { api } from '../api/client';

function setup() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Login page', () => {
  beforeEach(() => {
    api.postPublic.mockReset();
    localStorage.clear();
  });

  it('shows the form fields', () => {
    setup();
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('logs in and navigates home', async () => {
    api.postPublic.mockResolvedValue({
      token: 'tok123',
      user: { id: 1, username: 'admin', role: 'USER' },
    });
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(screen.getByLabelText(/contraseña/i), 'admin');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(localStorage.getItem('ccc_token')).toBe('tok123');
  });

  it('shows error message on failure', async () => {
    api.postPublic.mockRejectedValue(new Error('Credenciales inválidas'));
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/usuario/i), 'x');
    await user.type(screen.getByLabelText(/contraseña/i), 'x');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/credenciales/i);
  });
});
