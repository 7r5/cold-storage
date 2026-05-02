// Smoke test for BottomNav: renders 5 items with Spanish labels
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

function setup() {
  return render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('renders the 5 navigation items in Spanish', () => {
    setup();
    ['Inicio', 'Monitores', 'Inventario', 'Alertas', 'Más'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
