import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  const Boom = () => {
    throw new Error('kaboom');
  };

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <span>hello</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('shows fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByText('kaboom')).toBeTruthy();
  });

  it('uses custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom fallback')).toBeTruthy();
  });
});
