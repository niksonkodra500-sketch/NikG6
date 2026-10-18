import { useCallback, useEffect, useState } from 'react';
import {
  GITHUB_REPO,
  CURRENT_VERSION,
  type GitHubRelease,
  isNewer,
  isVersionTag,
} from './UpdateChecker.constants';

export interface UpdateCheckResult {
  checking: boolean;
  updateAvailable: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  error: string | null;
  check: () => Promise<void>;
}

/**
 * Hooks into the GitHub Releases API to surface in-app updates. The CI
 * workflow publishes an APK as a GitHub Release on every push to `main`,
 * so this lets users update without uninstalling.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAppUpdates(): UpdateCheckResult {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`,
        { headers: { Accept: 'application/vnd.github+json' } },
      );
      if (!response.ok) {
        throw new Error(`Update check failed (HTTP ${String(response.status)})`);
      }
      const releases = (await response.json()) as GitHubRelease[];
      // Only consider real semver releases (e.g. v2.1.1), not CI/main/manual builds.
      const versionReleases = releases.filter((r) => isVersionTag(r.tag_name ?? ''));
      const apkRelease = versionReleases.find((release) =>
        (release.assets ?? []).some((asset) => asset.name?.endsWith('.apk')),
      );
      const tag = apkRelease?.tag_name ?? null;
      const url =
        apkRelease?.assets?.find((asset) => asset.name?.endsWith('.apk'))?.browser_download_url ??
        apkRelease?.html_url ??
        null;
      if (tag && isNewer(tag, CURRENT_VERSION)) {
        setLatestVersion(tag);
        setDownloadUrl(url);
        setUpdateAvailable(true);
      } else {
        setLatestVersion(tag);
        setDownloadUrl(url);
        setUpdateAvailable(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check for updates');
      setUpdateAvailable(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { checking, updateAvailable, latestVersion, downloadUrl, error, check };
}

interface UpdateBannerProps {
  updates: UpdateCheckResult;
}

/** Inline banner shown when a newer APK release is available. */
export function UpdateBanner({ updates }: UpdateBannerProps) {
  if (!updates.updateAvailable || !updates.downloadUrl) return null;
  return (
    <div className="update-banner">
      <span>
        A new version is available ({updates.latestVersion}). Install it over your current app — no
        need to uninstall.
      </span>
      <a
        href={updates.downloadUrl}
        rel="noopener"
        className="update-download"
      >
        Download APK
      </a>
    </div>
  );
}
