import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AskPage } from '../AskPage';
import { ToastProvider } from '../../components/Toast';

vi.mock('../../services', async () => {
  const actual = await vi.importActual<typeof import('../../services')>('../../services');
  return {
    ...actual,
    demoService: {
      ...actual.demoService,
      ask: vi.fn().mockImplementation(async (q: { query: string }) => ({
        id: 'demo-001',
        query: q.query,
        summary: 'Leaf yellowing in tomato plants can result from multiple factors.',
        overallStatus: 'context_incomplete' as const,
        evidenceChunks: [],
        caveats: [],
        isIllustrative: true,
        generatedAt: new Date().toISOString(),
      })),
    },
  };
});

describe('AskPage offline behavior', () => {
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

  it('renders offline banner when device is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AskPage />
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(screen.getByTestId('ask-offline-banner')).toBeInTheDocument();
    expect(screen.getByText(/Device is offline — Application shell cached/i)).toBeInTheDocument();
  });

  it('shows helpful offline screen when submitting while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AskPage />
        </MemoryRouter>
      </ToastProvider>,
    );

    const textarea = screen.getByLabelText(/Your question/i);
    fireEvent.change(textarea, { target: { value: 'My tomato plants have yellow leaves and brown spots' } });

    const submitBtn = screen.getByRole('button', { name: /^Ask$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('ask-offline-screen')).toBeInTheDocument();
      expect(screen.getByText(/Question submission unavailable offline/i)).toBeInTheDocument();
    });
  });

  it('allows viewing illustrative example from offline screen', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AskPage />
        </MemoryRouter>
      </ToastProvider>,
    );

    const textarea = screen.getByLabelText(/Your question/i);
    fireEvent.change(textarea, { target: { value: 'My tomato plants have yellow leaves and brown spots' } });

    const submitBtn = screen.getByRole('button', { name: /^Ask$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('ask-offline-screen')).toBeInTheDocument();
    });

    const offlineScreen = screen.getByTestId('ask-offline-screen');
    const demoBtn = within(offlineScreen).getByRole('button', { name: /View illustrative example/i });
    fireEvent.click(demoBtn);

    await waitFor(
      () => {
        expect(screen.getAllByText(/Illustrative example — not real guidance/i).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 4000 },
    );
  });
});
