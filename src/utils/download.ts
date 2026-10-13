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

async function saveAndShareNative(dataUrl: string, filename: string): Promise<void> {
  const base64 = dataUrl.split(',')[1] ?? '';
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title: 'Share photo', url: result.uri });
}
