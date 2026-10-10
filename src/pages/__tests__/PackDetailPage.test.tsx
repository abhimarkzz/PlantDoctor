import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PackDetailPage } from '../PackDetailPage';
import { ToastProvider } from '../../components/Toast';

describe('PackDetailPage', () => {
  it('renders pack details and honest disabled download notice', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/library/pack-demo-001']}>
          <Routes>
            <Route path="/library/:id" element={<PackDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Tropical Vegetable Crops/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText(/Illustrative example — not real guidance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download for offline use/i })).toBeInTheDocument();
    expect(screen.getByText(/Not available in this milestone/i)).toBeInTheDocument();
  });

  it('renders empty state when pack is not found', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/library/unknown-pack']}>
          <Routes>
            <Route path="/library/:id" element={<PackDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Pack not found/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    expect(screen.getByRole('link', { name: /Back to Library/i })).toBeInTheDocument();
  });
});
