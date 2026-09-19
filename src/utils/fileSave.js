import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export function isNative() {
  return Capacitor.isNativePlatform();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Save a file either natively (Android/iOS app -> Download folder) or via
 * browser download (web). Returns the destination summary.
 * Note: Android public directories (Downloads) don't support sub-folders, so
 * files are written straight into the Download folder.
 */
export async function saveBlob(blob, fileName) {
  if (Capacitor.isNativePlatform()) {
    const directory = Directory.Downloads;
    const path = fileName;
    await Filesystem.writeFile({
      path,
      data: await blobToBase64(blob),
      directory,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ directory, path });
    return { source: 'native', location: `Download/${fileName}`, uri };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { source: 'web', location: fileName };
}