import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { EvidenceDetailPage } from '../EvidenceDetailPage';

describe('EvidenceDetailPage', () => {
  it('renders evidence details for demo result', () => {
    render(
      <MemoryRouter initialEntries={['/evidence/demo-001']}>
        <Routes>
          <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Evidence Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative example — not real guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/What causes yellowing leaves on tomato plants\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Important caveats/i)).toBeInTheDocument();
  });

  it('renders not found empty state for invalid id', () => {
    render(
      <MemoryRouter initialEntries={['/evidence/non-existent-id']}>
        <Routes>
          <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Evidence not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ask a question/i })).toBeInTheDocument();
  });
});
