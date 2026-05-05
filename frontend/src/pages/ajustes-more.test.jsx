// Tests for Ajustes and More pages (use AuthContext)
jest.mock('../api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), postPublic: jest.fn() },
}));

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Ajustes from '../pages/Ajustes';
import More from '../pages/More';

const mockUser = {
  id: 1,
  username: 'max',
  role: 'USER',
  firstName: 'Maximiliano',
  lastName: 'García',
  phone: '555-1234',
  age: 30,
  position: 'Logístico',
};

function setupAjustes(user = mockUser) {
  if (user) localStorage.setItem('ccc_user', JSON.stringify(user));
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Ajustes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function setupMore(user = mockUser) {
  if (user) localStorage.setItem('ccc_user', JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={['/mas']}>
      <AuthProvider>
        <Routes>
          <Route path="/mas" element={<More />} />
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => localStorage.clear());

// ─── Ajustes ─────────────────────────────────────────────────────────────────

describe('Ajustes page', () => {
  it('renders page heading', () => {
    setupAjustes();
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
  });

  it('shows user full name', () => {
    setupAjustes();
    const names = screen.getAllByText('Maximiliano García');
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('shows role label', () => {
    setupAjustes();
    expect(screen.getByText('Operador')).toBeInTheDocument();
  });

  it('shows phone and age', () => {
    setupAjustes();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('30 años')).toBeInTheDocument();
  });

  it('shows dashes for missing optional fields', () => {
    setupAjustes({ id: 2, username: 'anon', role: 'USER' });
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });
});

// ─── More ─────────────────────────────────────────────────────────────────────

describe('More page', () => {
  it('shows full name and username', () => {
    setupMore();
    const names = screen.getAllByText('Maximiliano García');
    expect(names.length).toBeGreaterThanOrEqual(1);
    // Username is rendered as "@max · Operador" in one element
    expect(screen.getByText(/@max/)).toBeInTheDocument();
  });

  it('shows nav links', () => {
    setupMore();
    expect(screen.getByText('Rutas')).toBeInTheDocument();
    expect(screen.getByText('Documentación')).toBeInTheDocument();
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
  });

  it('does NOT show simulator link for non-ROOT user', () => {
    setupMore();
    expect(screen.queryByText(/simulación/i)).not.toBeInTheDocument();
  });

  it('shows simulator link for ROOT user', () => {
    setupMore({ ...mockUser, role: 'ROOT' });
    expect(screen.getByText(/simulación/i)).toBeInTheDocument();
  });

  it('shows logout confirmation modal on cerrar sesión click', async () => {
    const user = userEvent.setup();
    setupMore();
    // The button that triggers the modal is the one in the normal flow (not inside modal)
    const logoutBtns = screen.getAllByText('Cerrar sesión');
    await user.click(logoutBtns[0]);
    expect(screen.getByText(/¿cerrar sesión\?/i)).toBeInTheDocument();
  });

  it('navigates to /login after confirming logout', async () => {
    const user = userEvent.setup();
    setupMore();
    const logoutBtns = screen.getAllByText('Cerrar sesión');
    await user.click(logoutBtns[0]);
    // The confirm button is the last 'Cerrar sesión' button (inside modal)
    const btns = screen.getAllByRole('button', { name: /cerrar sesión/i });
    await user.click(btns[btns.length - 1]);
    await waitFor(() => expect(screen.getByText('LOGIN')).toBeInTheDocument());
  });
});
