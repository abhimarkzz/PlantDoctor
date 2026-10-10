import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionBanner } from '../ConnectionBanner';

vi.mock('../../hooks/useBackendHealth', () => ({
  useBackendHealth: vi.fn(),
}));

import { useBackendHealth } from '../../hooks/useBackendHealth';

describe('ConnectionBanner', () => {
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

  it('renders nothing when online and backend is connected', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    vi.mocked(useBackendHealth).mockReturnValue('connected');

    const { container } = render(<ConnectionBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline banner when device is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    vi.mocked(useBackendHealth).mockReturnValue('unavailable');

    render(<ConnectionBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByText(/You are offline\. Application shell is cached/i)).toBeInTheDocument();
  });

  it('renders backend unavailable banner when online but backend is down', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    vi.mocked(useBackendHealth).mockReturnValue('unavailable');

    render(<ConnectionBanner />);
    expect(screen.getByTestId('backend-unavailable-banner')).toBeInTheDocument();
    expect(screen.getByText(/Backend is not connected/i)).toBeInTheDocument();
  });
});
