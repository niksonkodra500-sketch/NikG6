/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from './UpdateChecker';
import type { UpdateCheckResult } from './UpdateChecker';

describe('UpdateBanner', () => {
  const base: UpdateCheckResult = {
    checking: false,
    updateAvailable: true,
    latestVersion: 'v2.2.12',
    downloadUrl: 'https://github.com/niksonkodra500-sketch/NikG6/releases/download/v2.2.12/app-debug.apk',
    error: null,
    check: vi.fn(),
  };

  it('renders nothing when no update available', () => {
    render(<UpdateBanner updates={{ ...base, updateAvailable: false }} />);
    expect(screen.queryByText(/new version is available/i)).toBeNull();
  });

  it('renders banner with version and download link', () => {
    render(<UpdateBanner updates={base} />);
    expect(screen.getByText(/new version is available/i)).toBeTruthy();
    expect(screen.getByText('v2.2.12')).toBeTruthy();
    const link = screen.getByText('Download APK');
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toBe(base.downloadUrl);
  });
});
