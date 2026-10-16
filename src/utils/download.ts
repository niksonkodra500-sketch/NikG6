import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Downloads a data URL as a file (browser) or saves + shares it (native). */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (Capacitor.isNativePlatform()) {
    void saveAndShareNative(dataUrl, filename);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Shares a data URL via the Capacitor Share plugin (native) or Web Share (browser). */
export async function shareDataUrl(dataUrl: string, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await saveAndShareNative(dataUrl, filename);
    return;
  }
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    await navigator.share({ title: 'Edited with NikG6 Photo Editor', text: 'Check out my edited photo!', files: [file] });
    return;
  }
  // Fallback: trigger a download
  downloadDataUrl(dataUrl, filename);
}

async function saveAndShareNative(dataUrl: string, filename: string): Promise<void> {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : '';
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title: 'Share photo', url: result.uri });
}
