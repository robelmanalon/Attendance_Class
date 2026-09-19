import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const MediaSave = registerPlugin('MediaSave');

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

function mimeOf(blob, fileName) {
  if (blob && blob.type) return blob.type;
  const ext = String(fileName).split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}

/**
 * Save a file either natively (Android/iOS app -> Download folder) or via
 * browser download (web). Returns the destination summary.
 *
 * On Android this writes through the MediaStore Downloads collection (the same
 * mechanism Chrome and DownloadManager use), so the file lands in the public
 * "Download" folder even on Android 10+ scoped storage. The Capacitor
 * Filesystem plugin can't do that (it writes raw file paths that are blocked
 * on Android 11+), so we only fall back to it when MediaSave is unavailable.
 */
export async function saveBlob(blob, fileName) {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('MediaSave')) {
      await MediaSave.saveToDownloads({
        fileName,
        mimeType: mimeOf(blob, fileName),
        data: await blobToBase64(blob),
      });
      return { source: 'native', location: `Download/${fileName}` };
    }

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