import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HomePage } from '../HomePage';

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Plant Doctor/i })).toBeInTheDocument();
  });

  it('renders the evidence status gate section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Evidence Status Gate/)).toBeInTheDocument();
    expect(screen.getByText(/Applicable/)).toBeInTheDocument();
    expect(screen.getByText(/Conflicting Evidence/)).toBeInTheDocument();
  });

  it('has links to Ask and Library pages', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Ask Plant Doctor/i })).toHaveAttribute('href', '/ask');
    expect(screen.getByRole('link', { name: /Offline Library/i })).toHaveAttribute('href', '/library');
  });

  it('shows current limitations', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/frontend milestone/i)).toBeInTheDocument();
  });
});
