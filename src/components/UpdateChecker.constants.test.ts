import { describe, expect, it } from 'vitest';
import { isNewer, isVersionTag } from './UpdateChecker.constants';

describe('isVersionTag', () => {
  it('returns true for valid semver tags', () => {
    expect(isVersionTag('v2.2.12')).toBe(true);
    expect(isVersionTag('v1.0.0')).toBe(true);
    expect(isVersionTag('2.2.12')).toBe(true);
  });

  it('returns false for non-version tags', () => {
    expect(isVersionTag('main')).toBe(false);
    expect(isVersionTag('manual-build')).toBe(false);
    expect(isVersionTag('not-a-version')).toBe(false);
    expect(isVersionTag('')).toBe(false);
  });
});

describe('isNewer', () => {
  it('returns true when first version is newer', () => {
    expect(isNewer('v2.2.13', 'v2.2.12')).toBe(true);
    expect(isNewer('v2.3.0', 'v2.2.12')).toBe(true);
    expect(isNewer('v3.0.0', 'v2.9.9')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isNewer('v2.2.12', 'v2.2.12')).toBe(false);
    expect(isNewer('v1.0.0', 'v1.0.0')).toBe(false);
  });

  it('returns false when first version is older', () => {
    expect(isNewer('v2.2.11', 'v2.2.12')).toBe(false);
    expect(isNewer('v1.0.0', 'v2.0.0')).toBe(false);
  });

  it('handles non-semver gracefully', () => {
    expect(isNewer('not-a-version', 'v2.2.12')).toBe(false);
    expect(isNewer('v2.2.12', 'not-a-version')).toBe(false);
  });
});
