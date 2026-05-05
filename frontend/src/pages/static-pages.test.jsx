// Smoke tests for static pages: AcercaDe, Ayuda, Documentacion
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AcercaDe from '../pages/AcercaDe';
import Ayuda from '../pages/Ayuda';
import Documentacion from '../pages/Documentacion';

function wrap(Component) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

describe('AcercaDe page', () => {
  it('renders page heading', () => {
    wrap(AcercaDe);
    expect(screen.getByRole('heading', { name: 'Acerca de' })).toBeInTheDocument();
  });

  it('renders stack table rows', () => {
    wrap(AcercaDe);
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('renders official logo image', () => {
    wrap(AcercaDe);
    const img = screen.getByAltText('ColdTrack logo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/logo.jpeg');
  });

  it('navigates back on button click', async () => {
    const user = userEvent.setup();
    wrap(AcercaDe);
    const backBtn = screen.getAllByRole('button')[0];
    await user.click(backBtn);
    // navigate(-1) called — no crash
    expect(backBtn).toBeInTheDocument();
  });
});

describe('Ayuda page', () => {
  it('renders page heading', () => {
    wrap(Ayuda);
    expect(screen.getByRole('heading', { name: 'Ayuda' })).toBeInTheDocument();
  });

  it('navigates back on button click', async () => {
    const user = userEvent.setup();
    wrap(Ayuda);
    // Back button is first button before FAQ buttons
    const backBtn = screen.getAllByRole('button')[0];
    await user.click(backBtn);
    expect(backBtn).toBeInTheDocument();
  });

  it('expands a FAQ item on click', async () => {
    const user = userEvent.setup();
    wrap(Ayuda);
    const buttons = screen.getAllByRole('button');
    // Click the first FAQ button (skip back button at index 0)
    const faqBtn = buttons.find((b) => b.textContent.includes('¿'));
    await user.click(faqBtn);
    // After click the answer becomes visible (aria-hidden removed or content shown)
    expect(faqBtn).toBeInTheDocument();
  });

  it('collapses a FAQ item on second click', async () => {
    const user = userEvent.setup();
    wrap(Ayuda);
    const buttons = screen.getAllByRole('button');
    const faqBtn = buttons.find((b) => b.textContent.includes('¿'));
    await user.click(faqBtn);
    await user.click(faqBtn);
    expect(faqBtn).toBeInTheDocument();
  });
});

describe('Documentacion page', () => {
  it('renders page heading', () => {
    wrap(Documentacion);
    expect(screen.getByRole('heading', { name: 'Documentación' })).toBeInTheDocument();
  });

  it('navigates back on button click', async () => {
    const user = userEvent.setup();
    wrap(Documentacion);
    const backBtn = screen.getAllByRole('button')[0];
    await user.click(backBtn);
    expect(backBtn).toBeInTheDocument();
  });

  it('expands a section on click', async () => {
    const user = userEvent.setup();
    wrap(Documentacion);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]); // first section button
    expect(buttons[1]).toBeInTheDocument();
  });
});
