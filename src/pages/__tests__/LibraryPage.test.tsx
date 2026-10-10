import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LibraryPage } from '../LibraryPage';

describe('LibraryPage offline behavior', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
      writable: true,
    });
  });

  it('renders offline screen when loading while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('library-offline-screen')).toBeInTheDocument();
      expect(screen.getByText(/Knowledge pack catalog unavailable offline/i)).toBeInTheDocument();
    });
  });

  it('allows previewing illustrative packs when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('library-offline-screen')).toBeInTheDocument();
    });

    const previewBtn = screen.getByRole('button', { name: /Preview illustrative packs/i });
    fireEvent.click(previewBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Illustrative preview/i)).toBeInTheDocument();
        expect(screen.getByText(/Tropical Vegetable Crops/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
