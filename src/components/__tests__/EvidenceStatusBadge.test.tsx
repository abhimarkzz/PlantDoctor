import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EvidenceStatusBadge } from '../EvidenceStatusBadge';

describe('EvidenceStatusBadge', () => {
  it('renders the label for applicable status', () => {
    render(<EvidenceStatusBadge status="applicable" />);
    expect(screen.getByText('Applicable')).toBeInTheDocument();
  });

  it('renders description when showDescription is true', () => {
    render(<EvidenceStatusBadge status="conflicting_evidence" showDescription />);
    expect(screen.getByText('Conflicting Evidence')).toBeInTheDocument();
    expect(screen.getByText(/contradictory guidance/)).toBeInTheDocument();
  });

  it('has accessible role="status"', () => {
    render(<EvidenceStatusBadge status="insufficient_evidence" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAccessibleName(/Evidence status: Insufficient Evidence/);
  });
});
