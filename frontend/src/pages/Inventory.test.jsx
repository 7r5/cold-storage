// Tests for Inventory page
jest.mock('../api/client', () => ({
  api: {
    get: jest.fn(),
  },
}));

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Inventory from '../pages/Inventory';
import { api } from '../api/client';

function setup() {
  return render(
    <MemoryRouter>
      <Inventory />
    </MemoryRouter>,
  );
}

const mockRoutes = [
  {
    id: 1,
    status: 'ACTIVE',
    originName: 'CEDIS Norte',
    destinationName: 'Farmacia Central',
    truck: { id: 1, plate: 'UKG-001', driverName: 'Juan' },
    loads: [
      {
        id: 1,
        box: { id: 1, code: 'BOX-A' },
        product: { id: 1, name: 'Insulina Glargina', sku: 'INS-001', category: 'Insulinas' },
        quantity: 10,
      },
    ],
  },
];

const mockBranches = [
  { id: 1, name: 'CEDIS Norte', city: 'Querétaro', type: 'DISTRIBUTION_CENTER', address: 'Av. Principal 1' },
  { id: 2, name: 'Farmacia Central', city: 'Querétaro', type: 'PHARMACY', address: 'Calle 2' },
];

beforeEach(() => {
  api.get.mockReset();
});

describe('Inventory page', () => {
  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    setup();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders routes tab with data', async () => {
    api.get
      .mockResolvedValueOnce(mockRoutes)
      .mockResolvedValueOnce(mockBranches);
    setup();
    expect(await screen.findByText(/cedis norte.*farmacia/i)).toBeInTheDocument();
  });

  it('renders branches tab when clicked', async () => {
    api.get
      .mockResolvedValueOnce(mockRoutes)
      .mockResolvedValueOnce(mockBranches);
    const user = userEvent.setup();
    setup();
    // wait for initial load
    await screen.findByText('Carga por ruta');
    await user.click(screen.getByText('Sucursales'));
    await waitFor(() =>
      expect(screen.getAllByText('Farmacia Central').length).toBeGreaterThanOrEqual(1),
    );
  });

  it('shows filter chips for route status', async () => {
    api.get
      .mockResolvedValueOnce(mockRoutes)
      .mockResolvedValueOnce(mockBranches);
    setup();
    // Wait for filters to appear — they render after loading completes
    expect(await screen.findByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Activas')).toBeInTheDocument();
  });

  it('expands a route load card on click', async () => {
    api.get
      .mockResolvedValueOnce(mockRoutes)
      .mockResolvedValueOnce(mockBranches);
    const user = userEvent.setup();
    setup();
    // Click the route card button to expand loads
    const cardBtn = await screen.findByRole('button', { name: /cedis norte/i });
    await user.click(cardBtn);
    await waitFor(() =>
      expect(screen.getByText('Insulina Glargina')).toBeInTheDocument(),
    );
  });

  it('shows empty state when filter has no matches', async () => {
    api.get.mockResolvedValueOnce(mockRoutes).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    setup();
    await screen.findByText('Todas');
    // Filter to PENDING — no routes match since all are ACTIVE
    await user.click(screen.getByText('Pendientes'));
    await waitFor(() =>
      expect(screen.getByText(/no hay rutas con ese filtro/i)).toBeInTheDocument(),
    );
  });
});
