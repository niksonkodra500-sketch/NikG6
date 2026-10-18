export const GITHUB_REPO = 'niksonkodra500-sketch/NikG6';
export const CURRENT_VERSION = '2.2.3';

/** Tags that are not user-facing version releases (CI/manual builds). */
export const NON_VERSION_TAGS = ['main-', 'manual-'];

export interface GitHubRelease {
  tag_name?: string;
  name?: string;
  html_url?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
}

export function parseVersion(tag: string): number[] {
  return tag
    .replace(/^v/, '')
    .split('.')
    .map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

export function isNewer(a: string, b: string): boolean {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  for (let i = 0; i < Math.max(av.length, bv.length); i += 1) {
    const an = av[i] ?? 0;
    const bn = bv[i] ?? 0;
    if (an !== bn) return an > bn;
  }
  return false;
}

/** Returns true if a tag looks like a real semver release (e.g. v2.1.1). */
export function isVersionTag(tag: string): boolean {
  return /^v?\d+\.\d+\.\d+$/.test(tag);
}
