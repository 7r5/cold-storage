// Tests for Home (dashboard) page
jest.mock('../api/client', () => ({
  api: {
    get: jest.fn(),
  },
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { api } from '../api/client';

function setup() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

beforeEach(() => api.get.mockReset());

describe('Home page', () => {
  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {})); // never resolves
    setup();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('shows truck and alert counts after load', async () => {
    api.get
      .mockResolvedValueOnce([
        { id: 1, plate: 'UKG-001', model: 'Isuzu', driverName: 'Juan', status: 'ON_ROUTE' },
        { id: 2, plate: 'ADF-002', model: 'Ford', driverName: 'Ana', status: 'IDLE' },
      ])
      .mockResolvedValueOnce([{ id: 1, type: 'TEMP' }]);
    setup();
    // Wait for data to load — text '2' is unique (total trucks)
    expect(await screen.findByText('2')).toBeInTheDocument();
    // '1' appears multiple times (on_route count + alert count); verify at least one
    const ones = await screen.findAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no trucks', async () => {
    api.get.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    setup();
    expect(await screen.findByText(/sin camiones registrados/i)).toBeInTheDocument();
  });

  it('renders truck list links', async () => {
    api.get
      .mockResolvedValueOnce([
        { id: 1, plate: 'UKG-001', model: 'Isuzu', driverName: 'Pedro', status: 'IDLE' },
      ])
      .mockResolvedValueOnce([]);
    setup();
    const link = await screen.findByText('UKG-001');
    expect(link.closest('a')).toHaveAttribute('href', '/camiones/1');
  });
});
