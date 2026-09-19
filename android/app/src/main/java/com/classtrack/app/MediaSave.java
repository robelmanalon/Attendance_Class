package com.classtrack.app;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import java.io.File;
import java.io.OutputStream;

/**
 * Saves a file directly into the public "Download" folder using the Android
 * MediaStore API (the same mechanism Chrome and DownloadManager use). This
 * works on Android 10+ scoped storage without any special permissions.
 */
public final class MediaSave {

    private MediaSave() {}

    public static String saveToDownloads(Context context, String fileName, String mimeType, byte[] bytes)
            throws Exception {
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);

        Uri collection;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        } else {
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) {
                throw new Exception("External storage is not available");
            }
            if (!dir.exists() && !dir.mkdirs()) {
                throw new Exception("Could not create Download folder");
            }
            values.put(MediaStore.MediaColumns.DATA, new File(dir, fileName).getAbsolutePath());
            collection = MediaStore.Files.getContentUri("external");
        }

        Uri uri = context.getContentResolver().insert(collection, values);
        if (uri == null) {
            throw new Exception("Could not create file entry in Downloads");
        }

        OutputStream os = context.getContentResolver().openOutputStream(uri);
        if (os == null) {
            throw new Exception("Could not open output stream for file");
        }
        try {
            os.write(bytes);
            os.flush();
        } finally {
            try {
                os.close();
            } catch (Exception ignored) {
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues done = new ContentValues();
            done.put(MediaStore.MediaColumns.IS_PENDING, 0);
            context.getContentResolver().update(uri, done, null, null);
        }

        return uri.toString();
    }
}