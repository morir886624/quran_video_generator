package com.quran.videomaker;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "MediaSaver")
public class MediaSaverPlugin extends Plugin {
    private static final String TAG = "MediaSaverPlugin";

    @PluginMethod
    public void saveVideoToGallery(PluginCall call) {
        String filePath = call.getString("filePath");
        String fileName = call.getString("fileName");

        if (filePath == null || filePath.trim().isEmpty()) {
            call.reject("filePath is required");
            return;
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "quran_video_" + System.currentTimeMillis() + ".mp4";
        }
        if (!fileName.endsWith(".mp4") && !fileName.endsWith(".webm")) {
            fileName += ".mp4";
        }

        try {
            // Strip file:// prefix if present
            String cleanPath = filePath.trim();
            if (cleanPath.startsWith("file://")) {
                cleanPath = cleanPath.substring(7);
            }

            File sourceFile = new File(cleanPath);
            if (!sourceFile.exists()) {
                Log.e(TAG, "Source file does not exist: " + cleanPath);
                call.reject("Source file does not exist at: " + cleanPath);
                return;
            }

            Context context = getContext();
            ContentResolver resolver = context.getContentResolver();
            Uri savedUri = null;
            String savedPathDescription = "Movies/QuranStudio/" + fileName;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Modern Android 10+ (API 29+) MediaStore scoped storage - zero runtime permissions required
                ContentValues values = new ContentValues();
                values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/QuranStudio");
                values.put(MediaStore.Video.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                savedUri = resolver.insert(collection, values);

                if (savedUri == null) {
                    call.reject("Failed to create MediaStore entry for video");
                    return;
                }

                try (OutputStream out = resolver.openOutputStream(savedUri);
                     InputStream in = new FileInputStream(sourceFile)) {
                    if (out == null) {
                        call.reject("Failed to open output stream for video");
                        return;
                    }

                    byte[] buffer = new byte[65536];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();
                }

                values.clear();
                values.put(MediaStore.Video.Media.IS_PENDING, 0);
                resolver.update(savedUri, values, null, null);
            } else {
                // Legacy Android 9 and lower
                File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
                File quranDir = new File(moviesDir, "QuranStudio");
                if (!quranDir.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    quranDir.mkdirs();
                }
                File destFile = new File(quranDir, fileName);

                try (InputStream in = new FileInputStream(sourceFile);
                     OutputStream out = new FileOutputStream(destFile)) {
                    byte[] buffer = new byte[65536];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();
                }

                savedUri = Uri.fromFile(destFile);
                savedPathDescription = destFile.getAbsolutePath();

                MediaScannerConnection.scanFile(
                    context,
                    new String[]{destFile.getAbsolutePath()},
                    new String[]{"video/mp4"},
                    null
                );
            }

            Log.i(TAG, "Video successfully saved to gallery: " + savedPathDescription);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("uri", savedUri != null ? savedUri.toString() : "");
            ret.put("path", savedPathDescription);
            ret.put("message", "Video saved directly to Gallery (" + savedPathDescription + ")");
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error saving video to gallery", e);
            call.reject("Failed to save video: " + e.getMessage());
        }
    }
}

