
/**
 * The Capacitor App plugin provides the *real installed* app version at
 * runtime (App.getInfo().versionName). This is the source of truth for the
 * in-app update banner.
 *
 * We import it lazily and defensively because:
 *  - On the web (browser/PWA) the plugin is not available.
 *  - The Android WebView may not have it synced yet.
 * If the plugin is unavailable, we fall back to the build-time constant.
 */
export async function getInstalledVersion(): Promise<string> {
  try {
    // Dynamic import keeps the plugin out of the web bundle when unused and
    // avoids a hard dependency at module-evaluation time.
    const mod = (await import('@capacitor/app')) as {
      App?: { getInfo(): Promise<{ version: string }> };
    };
    const info = await mod.App?.getInfo();
    if (info?.version) return info.version;
  } catch {
    // Plugin not installed / not synced on this platform — fall through.
  }
  return CURRENT_VERSION;
}

/** Build-time fallback version (kept in sync with package.json + build.gradle). */
export const CURRENT_VERSION = '2.1.3';

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