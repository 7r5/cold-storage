// Tests for Rutas page (route list)
jest.mock('../api/client', () => ({
  api: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Rutas from '../pages/Rutas';
import { api } from '../api/client';

// Rutas uses window.confirm before deleting
window.confirm = jest.fn(() => true);

function setup() {
  return render(
    <MemoryRouter>
      <Rutas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.get.mockReset();
  api.delete.mockReset();
  window.confirm.mockReturnValue(true);
});

describe('Rutas page', () => {
  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    setup();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('shows empty state when no routes', async () => {
    api.get.mockResolvedValue([]);
    setup();
    expect(await screen.findByText('No hay rutas registradas.')).toBeInTheDocument();
  });

  it('renders route list', async () => {
    api.get.mockResolvedValue([
      {
        id: 1,
        status: 'PENDING',
        originName: 'Queretaro',
        destinationName: 'San Juan',
        truck: { id: 1, plate: 'UKG-001' },
      },
    ]);
    setup();
    expect(await screen.findByText(/queretaro/i)).toBeInTheDocument();
    expect(await screen.findByText(/UKG-001/)).toBeInTheDocument();
    expect(await screen.findByText('Pendiente')).toBeInTheDocument();
  });

  it('shows ACTIVE badge', async () => {
    api.get.mockResolvedValue([
      {
        id: 2, status: 'ACTIVE',
        originName: 'A', destinationName: 'B',
        truck: { id: 1, plate: 'ADF-002' },
      },
    ]);
    setup();
    expect(await screen.findByText('Activa')).toBeInTheDocument();
  });

  it('deletes a PENDING route on confirm', async () => {
    api.get.mockResolvedValue([
      {
        id: 1, status: 'PENDING',
        originName: 'Ori', destinationName: 'Dst',
        truck: { id: 1, plate: 'UKG-001' },
      },
    ]);
    api.delete.mockResolvedValue({});
    const user = userEvent.setup();
    setup();
    const deleteBtn = await screen.findByRole('button', { name: /eliminar/i });
    await user.click(deleteBtn);
    await waitFor(() => expect(api.delete).toHaveBeenCalled());
  });

  it('shows error when load fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    setup();
    expect(await screen.findByText(/no se pudieron cargar/i)).toBeInTheDocument();
  });
});
