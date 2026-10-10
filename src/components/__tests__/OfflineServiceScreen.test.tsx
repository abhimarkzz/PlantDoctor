import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfflineServiceScreen } from '../OfflineServiceScreen';

describe('OfflineServiceScreen', () => {
  it('renders default title, message, and scope boundary note', () => {
    render(<OfflineServiceScreen />);
    expect(screen.getByText('Network service unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Offline shell active · Remote service disconnected/i)).toBeInTheDocument();
    expect(screen.getByText(/Offline scope boundary/i)).toBeInTheDocument();
    expect(screen.getByText(/Local knowledge pack storage \(IndexedDB\)/i)).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(
      <OfflineServiceScreen
        title="Custom Offline Title"
        message="Custom offline explanation"
      />,
    );
    expect(screen.getByText('Custom Offline Title')).toBeInTheDocument();
    expect(screen.getByText('Custom offline explanation')).toBeInTheDocument();
  });

  it('triggers onRetry callback when clicked', () => {
    const handleRetry = vi.fn();
    render(<OfflineServiceScreen onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /Check connection & retry/i });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action', () => {
    render(
      <OfflineServiceScreen
        secondaryAction={<button type="button">Secondary Action</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();
  });
});
