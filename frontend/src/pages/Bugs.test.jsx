// Tests for Bugs page
jest.mock('../api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Bugs from '../pages/Bugs';
import { api } from '../api/client';

function setup() {
  return render(
    <MemoryRouter>
      <Bugs />
    </MemoryRouter>,
  );
}

const mockBugs = [
  {
    id: 1,
    title: 'Mapa no carga',
    location: 'Monitores',
    expected: 'Ver mapa',
    actual: 'Pantalla blanca',
    status: 'OPEN',
    reportedBy: 'max',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.patch.mockReset();
});

describe('Bugs page', () => {
  it('renders list tab heading', async () => {
    api.get.mockResolvedValue([]);
    setup();
    expect(screen.getByText(/reporte de bugs/i)).toBeInTheDocument();
  });

  it('shows empty state when no bugs', async () => {
    api.get.mockResolvedValue([]);
    setup();
    expect(await screen.findByText('No hay bugs reportados.')).toBeInTheDocument();
  });

  it('renders bug list', async () => {
    api.get.mockResolvedValue(mockBugs);
    setup();
    expect(await screen.findByText('Mapa no carga')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
  });

  it('switches to new bug form tab', async () => {
    api.get.mockResolvedValue([]);
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('+ Reportar bug'));
    expect(screen.getByText('Título del bug')).toBeInTheDocument();
  });

  it('shows validation error on empty submit', async () => {
    api.get.mockResolvedValue([]);
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('+ Reportar bug'));
    await user.click(screen.getByRole('button', { name: /enviar reporte/i }));
    expect(await screen.findByText(/todos los campos son obligatorios/i)).toBeInTheDocument();
  });

  it('changes bug status via action button', async () => {
    api.get.mockResolvedValue(mockBugs);
    api.patch.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });
    const user = userEvent.setup();
    setup();
    await screen.findByText('Mapa no carga');
    // Click bug to expand
    await user.click(screen.getByText('Mapa no carga'));
    // EN PROGRESO action button should appear
    const actionBtn = await screen.findByRole('button', { name: /en progreso/i });
    await user.click(actionBtn);
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
  });

  it('submits bug form successfully and returns to list tab', async () => {
    // Initial load + reload after submit
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({
      id: 2, title: 'Crash', location: 'Inicio', status: 'OPEN',
    });
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('+ Reportar bug'));
    await user.type(screen.getByPlaceholderText(/mapa se queda/i), 'Crash al abrir');
    await user.selectOptions(
      screen.getByRole('combobox'),
      'Inicio',
    );
    await user.type(screen.getByPlaceholderText(/qué debería pasar/i), 'Carga OK');
    await user.type(screen.getByPlaceholderText(/qué pasó en realidad/i), 'Pantalla negra');
    await user.click(screen.getByRole('button', { name: /enviar reporte/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    // After submit, setTab('list') is called — list tab should be visible
    await waitFor(() =>
      expect(screen.getByText('No hay bugs reportados.')).toBeInTheDocument(),
    );
  });
});
