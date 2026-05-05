// Tests for Alerts page
jest.mock('../api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('../api/socket', () => ({
  getSocket: () => ({ on: jest.fn(), off: jest.fn() }),
}));

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Alerts from '../pages/Alerts';
import { api } from '../api/client';

function setup() {
  return render(
    <MemoryRouter>
      <Alerts />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
});

describe('Alerts page', () => {
  it('shows empty state when no alerts', async () => {
    api.get.mockResolvedValue([]);
    setup();
    expect(await screen.findByText(/sin alertas activas/i)).toBeInTheDocument();
  });

  it('renders alert cards', async () => {
    api.get.mockResolvedValue([
      { id: 1, type: 'TEMP', severity: 'HIGH', message: 'Temperatura alta', box: { code: 'BOX-A' } },
    ]);
    setup();
    expect(await screen.findByText(/temperatura alta/i)).toBeInTheDocument();
    expect(screen.getByText(/temperatura · high/i)).toBeInTheDocument();
  });

  it('removes alert on ack click', async () => {
    api.get.mockResolvedValue([
      { id: 2, type: 'HUM', severity: 'MEDIUM', message: 'Humedad elevada', box: { code: 'BOX-B' } },
    ]);
    api.post.mockResolvedValue({ id: 2, acknowledged: true });
    const user = userEvent.setup();
    setup();
    const btn = await screen.findByRole('button', { name: /atender/i });
    await user.click(btn);
    await waitFor(() => expect(screen.queryByText(/humedad elevada/i)).not.toBeInTheDocument());
  });

  it('renders HUM type label correctly', async () => {
    api.get.mockResolvedValue([
      { id: 3, type: 'HUM', severity: 'LOW', message: 'Low humidity', box: { code: 'BOX-C' } },
    ]);
    setup();
    expect(await screen.findByText(/humedad · low/i)).toBeInTheDocument();
  });
});
