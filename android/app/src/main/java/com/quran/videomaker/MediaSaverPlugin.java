package com.quran.videomaker;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "MediaSaver",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            },
            alias = "audio"
        ),
        @Permission(
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            },
            alias = "storageLegacy"
        ),
        @Permission(
            strings = {
                Manifest.permission.READ_MEDIA_VIDEO,
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_MEDIA_IMAGES
            },
            alias = "storageMedia"
        )
    }
)
public class MediaSaverPlugin extends Plugin {
    private static final String TAG = "MediaSaverPlugin";
    private static final int PERMISSION_REQ_CODE = 9081;

    /**
     * Checks current status of Sound/Voice and Media/Storage permissions.
     */
    @PluginMethod
    public void checkAppPermissions(PluginCall call) {
        Context context = getContext();
        boolean audioGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;

        boolean storageGranted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
            boolean videoGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_MEDIA_VIDEO
            ) == PackageManager.PERMISSION_GRANTED;
            boolean audioMediaGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_MEDIA_AUDIO
            ) == PackageManager.PERMISSION_GRANTED;
            storageGranted = videoGranted || audioMediaGranted;
        } else {
            storageGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED;
        }

        JSObject ret = new JSObject();
        ret.put("audio", audioGranted);
        ret.put("storage", storageGranted);
        ret.put("allGranted", audioGranted && storageGranted);
        call.resolve(ret);
    }

    /**
     * Triggers standard Android system runtime permission dialog for Voice/Audio and Storage.
     */
    @PluginMethod
    public void requestAppPermissions(PluginCall call) {
        try {
            List<String> permsToRequest = new ArrayList<>();
            Context context = getContext();

            // Audio / Voice
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                permsToRequest.add(Manifest.permission.RECORD_AUDIO);
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.MODIFY_AUDIO_SETTINGS) != PackageManager.PERMISSION_GRANTED) {
                permsToRequest.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            }

            // Storage / Media
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) {
                    permsToRequest.add(Manifest.permission.READ_MEDIA_VIDEO);
                }
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    permsToRequest.add(Manifest.permission.READ_MEDIA_AUDIO);
                }
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                    permsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES);
                }
            } else {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    permsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                        permsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                    }
                }
            }

            if (!permsToRequest.isEmpty()) {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    permsToRequest.toArray(new String[0]),
                    PERMISSION_REQ_CODE
                );
            }

            JSObject ret = new JSObject();
            ret.put("requested", true);
            ret.put("requestedCount", permsToRequest.size());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to request permissions", e);
            call.reject("Could not request permissions: " + e.getMessage());
        }
    }

    /**
     * Safely decodes Base64 string with automatic padding and standard NO_WRAP decoding.
     */
    private byte[] safeDecodeBase64(String input) {
        String clean = input.trim();
        if (clean.contains(",")) {
            clean = clean.substring(clean.indexOf(',') + 1);
        }
        // Normalize any URL-safe characters to standard Base64 alphabet
        clean = clean.replace('-', '+').replace('_', '/');
        // Strip any whitespace or non-base64 characters
        clean = clean.replaceAll("[^A-Za-z0-9+/=]", "");
        // Pad to multiple of 4
        while (clean.length() % 4 != 0) {
            clean += "=";
        }
        // Decode using standard alphabet (Base64.NO_WRAP)
        return Base64.decode(clean, Base64.NO_WRAP);
    }

    /**
     * Saves video chunk-by-chunk directly into app cache and appends bytes.
     * On final chunk, moves the complete file into MediaStore (Movies/QuranStudio).
     */
    @PluginMethod
    public void saveVideoChunk(PluginCall call) {
        String chunk = call.getString("chunk");
        String fileName = call.getString("fileName");
        boolean isFirst = Boolean.TRUE.equals(call.getBoolean("isFirst", false));
        boolean isLast = Boolean.TRUE.equals(call.getBoolean("isLast", false));
        Long duration = call.getLong("duration", null);

        if (chunk == null) {
            call.reject("Chunk data is required");
            return;
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "quran_video_" + System.currentTimeMillis() + ".mp4";
        }
        if (!fileName.endsWith(".mp4") && !fileName.endsWith(".webm")) {
            fileName += ".mp4";
        }
        fileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");

        File tempFile = null;
        try {
            byte[] decodedBytes = safeDecodeBase64(chunk);
            Context context = getContext();
            File cacheDir = context.getCacheDir();
            tempFile = new File(cacheDir, "temp_quran_" + fileName);

            if (isFirst && tempFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFile.delete();
            }

            // Append chunk bytes to the temporary file
            try (FileOutputStream fos = new FileOutputStream(tempFile, true)) {
                fos.write(decodedBytes);
                fos.flush();
            }

            if (isLast) {
                // Transfer assembled file directly to MediaStore with exact duration
                saveFileToGalleryInternal(tempFile, fileName, duration, call);

                // Clean up temp file
                if (tempFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempFile.delete();
                }
            } else {
                JSObject ret = new JSObject();
                ret.put("chunkSaved", true);
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in saveVideoChunk", e);
            if (tempFile != null && tempFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFile.delete();
            }
            call.reject("Failed to save video: " + e.getMessage());
        }
    }

    /**
     * Saves video directly to Android Gallery (Movies/QuranStudio) via MediaStore or public directory.
     * Supports single-payload base64Data or filePath.
     */
    @PluginMethod
    public void saveVideoToGallery(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String filePath = call.getString("filePath");
        String fileName = call.getString("fileName");
        Long duration = call.getLong("duration", null);

        if ((base64Data == null || base64Data.trim().isEmpty()) && (filePath == null || filePath.trim().isEmpty())) {
            call.reject("Either base64Data or filePath must be provided");
            return;
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "quran_video_" + System.currentTimeMillis() + ".mp4";
        }
        if (!fileName.endsWith(".mp4") && !fileName.endsWith(".webm")) {
            fileName += ".mp4";
        }
        fileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");

        InputStream inputStream = null;
        File tempFileToClean = null;
        try {
            if (base64Data != null && !base64Data.trim().isEmpty()) {
                byte[] decodedBytes = safeDecodeBase64(base64Data);
                if (duration != null && duration > 0) {
                    Context context = getContext();
                    tempFileToClean = new File(context.getCacheDir(), "temp_to_save_" + fileName);
                    try (FileOutputStream fos = new FileOutputStream(tempFileToClean)) {
                        fos.write(decodedBytes);
                        fos.flush();
                    }
                    patchMp4DurationInFile(tempFileToClean, duration);
                    inputStream = new FileInputStream(tempFileToClean);
                } else {
                    inputStream = new ByteArrayInputStream(decodedBytes);
                }
            } else {
                String cleanPath = filePath.trim();
                if (cleanPath.startsWith("file://")) {
                    cleanPath = cleanPath.substring(7);
                }
                File sourceFile = new File(cleanPath);
                if (!sourceFile.exists()) {
                    call.reject("Source file does not exist at: " + cleanPath);
                    return;
                }
                if (duration != null && duration > 0) {
                    patchMp4DurationInFile(sourceFile, duration);
                }
                inputStream = new FileInputStream(sourceFile);
            }

            saveStreamToGalleryInternal(inputStream, fileName, duration, call);

        } catch (Exception e) {
            Log.e(TAG, "Error saving video to gallery", e);
            call.reject("Failed to save video to gallery: " + e.getMessage());
        } finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (Exception ignored) {}
            }
            if (tempFileToClean != null && tempFileToClean.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFileToClean.delete();
            }
        }
    }

    /**
     * Shares a video file using Android's native Intent.ACTION_SEND chooser with FileProvider.
     * Supports either an existing filePath, a fileName in app cache, or streams.
     */
    @PluginMethod
    public void shareVideo(PluginCall call) {
        String filePath = call.getString("filePath");
        String fileName = call.getString("fileName");
        String title = call.getString("title", "Quran Video");
        String text = call.getString("text", "Created with Quran Video Studio");
        Long duration = call.getLong("duration", null);

        Context context = getContext();
        File fileToShare = null;

        if (filePath != null && !filePath.trim().isEmpty()) {
            String cleanPath = filePath.trim();
            if (cleanPath.startsWith("file://")) {
                cleanPath = cleanPath.substring(7);
            }
            fileToShare = new File(cleanPath);
        }

        if (fileToShare == null || !fileToShare.exists()) {
            if (fileName != null && !fileName.trim().isEmpty()) {
                File cached = new File(context.getCacheDir(), fileName);
                if (cached.exists()) {
                    fileToShare = cached;
                } else {
                    File tempCached = new File(context.getCacheDir(), "temp_quran_" + fileName);
                    if (tempCached.exists()) {
                        fileToShare = tempCached;
                    }
                }
            }
        }

        if (fileToShare == null || !fileToShare.exists()) {
            call.reject("File to share does not exist");
            return;
        }

        if (duration != null && duration > 0) {
            patchMp4DurationInFile(fileToShare, duration);
        }

        try {
            Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                fileToShare
            );

            String mimeType = fileToShare.getName().endsWith(".webm") ? "video/webm" : "video/mp4";

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(shareIntent, "Share Quran Video to...");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error sharing video natively", e);
            call.reject("Could not open share dialog: " + e.getMessage());
        }
    }

    private void saveFileToGalleryInternal(File sourceFile, String fileName, Long durationMs, PluginCall call) throws Exception {
        if (durationMs != null && durationMs > 0) {
            patchMp4DurationInFile(sourceFile, durationMs);
        }
        try (InputStream in = new FileInputStream(sourceFile)) {
            saveStreamToGalleryInternal(in, fileName, durationMs, call);
        }
    }

    private void saveStreamToGalleryInternal(InputStream inputStream, String fileName, Long durationMs, PluginCall call) throws Exception {
        Context context = getContext();
        ContentResolver resolver = context.getContentResolver();
        Uri savedUri = null;
        String savedPathDescription = "Movies/QuranStudio/" + fileName;
        String mimeType = fileName.endsWith(".webm") ? "video/webm" : "video/mp4";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Video.Media.MIME_TYPE, mimeType);
            values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/QuranStudio");
            values.put(MediaStore.Video.Media.IS_PENDING, 1);
            if (durationMs != null && durationMs > 0) {
                values.put(MediaStore.Video.Media.DURATION, durationMs);
            }

            Uri collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            savedUri = resolver.insert(collection, values);

            if (savedUri == null) {
                call.reject("Failed to create MediaStore entry for video");
                return;
            }

            try (OutputStream out = resolver.openOutputStream(savedUri)) {
                if (out == null) {
                    call.reject("Failed to open output stream for MediaStore");
                    return;
                }
                byte[] buffer = new byte[65536];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                out.flush();
            }

            values.clear();
            values.put(MediaStore.Video.Media.IS_PENDING, 0);
            if (durationMs != null && durationMs > 0) {
                values.put(MediaStore.Video.Media.DURATION, durationMs);
            }
            resolver.update(savedUri, values, null, null);
        } else {
            File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            File quranDir = new File(moviesDir, "QuranStudio");
            if (!quranDir.exists()) {
                //noinspection ResultOfMethodCallIgnored
                quranDir.mkdirs();
            }
            File destFile = new File(quranDir, fileName);

            try (OutputStream out = new FileOutputStream(destFile)) {
                byte[] buffer = new byte[65536];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                out.flush();
            }

            savedUri = Uri.fromFile(destFile);
            savedPathDescription = destFile.getAbsolutePath();

            MediaScannerConnection.scanFile(
                context,
                new String[]{destFile.getAbsolutePath()},
                new String[]{mimeType},
                (path, uri) -> {
                    if (uri != null && durationMs != null && durationMs > 0) {
                        try {
                            ContentValues updateValues = new ContentValues();
                            updateValues.put(MediaStore.Video.Media.DURATION, durationMs);
                            resolver.update(uri, updateValues, null, null);
                        } catch (Exception ignored) {}
                    }
                }
            );
        }

        Log.i(TAG, "Video successfully saved to gallery: " + savedPathDescription);
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("uri", savedUri != null ? savedUri.toString() : "");
        ret.put("path", savedPathDescription);
        ret.put("message", "Video saved to Gallery (Movies/QuranStudio)");
        call.resolve(ret);
    }

    /**
     * In-place patches duration metadata in MP4 container headers (mvhd, tkhd, mdhd, mehd)
     * directly in the file so Android's MPEG4Extractor / MediaScanner reads the exact duration
     * instead of falling back to the 3-second first fragment.
     */
    private static void patchMp4DurationInFile(File file, long durationMs) {
        if (file == null || !file.exists() || durationMs <= 0) return;
        try (java.io.RandomAccessFile raf = new java.io.RandomAccessFile(file, "rw")) {
            long fileLength = raf.length();
            if (fileLength < 16) return;

            // Check if MP4 (ftyp at offset 4)
            byte[] magic = new byte[8];
            raf.seek(0);
            raf.readFully(magic);
            boolean isMp4 = (magic[4] == 'f' && magic[5] == 't' && magic[6] == 'y' && magic[7] == 'p');
            if (!isMp4) return;

            long pos = 0;
            long mvhdTimescale = 1000;
            double durationSec = durationMs / 1000.0;

            // Find moov
            while (pos + 8 <= fileLength) {
                raf.seek(pos);
                long boxSize = raf.readInt() & 0xFFFFFFFFL;
                byte[] typeBytes = new byte[4];
                raf.readFully(typeBytes);
                String type = new String(typeBytes, java.nio.charset.StandardCharsets.ISO_8859_1);
                long headerSize = 8;
                if (boxSize == 1) {
                    boxSize = raf.readLong();
                    headerSize = 16;
                } else if (boxSize == 0) {
                    boxSize = fileLength - pos;
                }
                if (boxSize < headerSize || pos + boxSize > fileLength) break;

                if ("moov".equals(type)) {
                    long moovDataPos = pos + headerSize;
                    long moovEnd = pos + boxSize;

                    // Pass 1: find mvhd to extract timescale and patch duration
                    long subPos = moovDataPos;
                    while (subPos + 8 <= moovEnd) {
                        raf.seek(subPos);
                        long subBoxSize = raf.readInt() & 0xFFFFFFFFL;
                        byte[] subTypeBytes = new byte[4];
                        raf.readFully(subTypeBytes);
                        String subType = new String(subTypeBytes, java.nio.charset.StandardCharsets.ISO_8859_1);
                        long subHeaderSize = 8;
                        if (subBoxSize == 1) {
                            subBoxSize = raf.readLong();
                            subHeaderSize = 16;
                        } else if (subBoxSize == 0) {
                            subBoxSize = moovEnd - subPos;
                        }
                        if (subBoxSize < subHeaderSize || subPos + subBoxSize > moovEnd) break;

                        if ("mvhd".equals(subType)) {
                            long dataPos = subPos + subHeaderSize;
                            raf.seek(dataPos);
                            int version = raf.readByte() & 0xFF;
                            if (version == 0) {
                                raf.seek(dataPos + 12);
                                mvhdTimescale = raf.readInt() & 0xFFFFFFFFL;
                                if (mvhdTimescale <= 0) mvhdTimescale = 1000;
                                long targetDur = Math.round(durationSec * mvhdTimescale);
                                raf.seek(dataPos + 16);
                                raf.writeInt((int) targetDur);
                            } else if (version == 1) {
                                raf.seek(dataPos + 20);
                                mvhdTimescale = raf.readInt() & 0xFFFFFFFFL;
                                if (mvhdTimescale <= 0) mvhdTimescale = 1000;
                                long targetDur = Math.round(durationSec * mvhdTimescale);
                                raf.seek(dataPos + 24);
                                raf.writeLong(targetDur);
                            }
                        }
                        subPos += subBoxSize;
                    }

                    // Pass 2: trak (tkhd, mdhd) and mvex (mehd)
                    subPos = moovDataPos;
                    while (subPos + 8 <= moovEnd) {
                        raf.seek(subPos);
                        long subBoxSize = raf.readInt() & 0xFFFFFFFFL;
                        byte[] subTypeBytes = new byte[4];
                        raf.readFully(subTypeBytes);
                        String subType = new String(subTypeBytes, java.nio.charset.StandardCharsets.ISO_8859_1);
                        long subHeaderSize = 8;
                        if (subBoxSize == 1) {
                            subBoxSize = raf.readLong();
                            subHeaderSize = 16;
                        } else if (subBoxSize == 0) {
                            subBoxSize = moovEnd - subPos;
                        }
                        if (subBoxSize < subHeaderSize || subPos + subBoxSize > moovEnd) break;

                        if ("trak".equals(subType)) {
                            long trakDataPos = subPos + subHeaderSize;
                            long trakEnd = subPos + subBoxSize;
                            long p3 = trakDataPos;
                            while (p3 + 8 <= trakEnd) {
                                raf.seek(p3);
                                long s3 = raf.readInt() & 0xFFFFFFFFL;
                                byte[] t3Bytes = new byte[4];
                                raf.readFully(t3Bytes);
                                String t3 = new String(t3Bytes, java.nio.charset.StandardCharsets.ISO_8859_1);
                                long h3 = 8;
                                if (s3 == 1) { s3 = raf.readLong(); h3 = 16; }
                                if (s3 < h3 || p3 + s3 > trakEnd) break;

                                if ("tkhd".equals(t3)) {
                                    long dPos = p3 + h3;
                                    raf.seek(dPos);
                                    int ver = raf.readByte() & 0xFF;
                                    long targetDur = Math.round(durationSec * mvhdTimescale);
                                    if (ver == 0) {
                                        raf.seek(dPos + 20);
                                        raf.writeInt((int) targetDur);
                                    } else if (ver == 1) {
                                        raf.seek(dPos + 28);
                                        raf.writeLong(targetDur);
                                    }
                                } else if ("mdia".equals(t3)) {
                                    long mdiaDataPos = p3 + h3;
                                    long mdiaEnd = p3 + s3;
                                    long p4 = mdiaDataPos;
                                    while (p4 + 8 <= mdiaEnd) {
                                        raf.seek(p4);
                                        long s4 = raf.readInt() & 0xFFFFFFFFL;
                                        byte[] t4Bytes = new byte[4];
                                        raf.readFully(t4Bytes);
                                        String t4 = new String(t4Bytes, java.nio.charset.StandardCharsets.ISO_8859_1);
                                        long h4 = 8;
                                        if (s4 == 1) { s4 = raf.readLong(); h4 = 16; }
                                        if (s4 < h4 || p4 + s4 > mdiaEnd) break;

                                        if ("mdhd".equals(t4)) {
                                            long dPos = p4 + h4;
                                            raf.seek(dPos);
                                            int ver = raf.readByte() & 0xFF;
                                            if (ver == 0) {
                                                raf.seek(dPos + 12);
                                                long mediaScale = raf.readInt() & 0xFFFFFFFFL;
                                                if (mediaScale <= 0) mediaScale = mvhdTimescale;
                                                long targetDur = Math.round(durationSec * mediaScale);
                                                raf.seek(dPos + 16);
                                                raf.writeInt((int) targetDur);
                                            } else if (ver == 1) {
                                                raf.seek(dPos + 20);
                                                long mediaScale = raf.readInt() & 0xFFFFFFFFL;
                                                if (mediaScale <= 0) mediaScale = mvhdTimescale;
                                                long targetDur = Math.round(durationSec * mediaScale);
                                                raf.seek(dPos + 24);
                                                raf.writeLong(targetDur);
                                            }
                                        }
                                        p4 += s4;
                                    }
                                }
                                p3 += s3;
                            }
                        } else if ("mvex".equals(subType)) {
                            long mvexDataPos = subPos + subHeaderSize;
                            long mvexEnd = subPos + subBoxSize;
                            long p3 = mvexDataPos;
                            while (p3 + 8 <= mvexEnd) {
                                raf.seek(p3);
                                long s3 = raf.readInt() & 0xFFFFFFFFL;
                                byte[] t3Bytes = new byte[4];
                                raf.readFully(t3Bytes);
                                String t3 = new String(t3Bytes, java.nio.charset.StandardCharsets.ISO_8859_1);
                                long h3 = 8;
                                if (s3 == 1) { s3 = raf.readLong(); h3 = 16; }
                                if (s3 < h3 || p3 + s3 > mvexEnd) break;

                                if ("mehd".equals(t3)) {
                                    long dPos = p3 + h3;
                                    raf.seek(dPos);
                                    int ver = raf.readByte() & 0xFF;
                                    long targetDur = Math.round(durationSec * mvhdTimescale);
                                    if (ver == 0) {
                                        raf.seek(dPos + 4);
                                        raf.writeInt((int) targetDur);
                                    } else if (ver == 1) {
                                        raf.seek(dPos + 4);
                                        raf.writeLong(targetDur);
                                    }
                                }
                                p3 += s3;
                            }
                        }
                        subPos += subBoxSize;
                    }
                    break;
                }
                pos += boxSize;
            }
            Log.i(TAG, "Successfully patched MP4 duration in file to " + durationMs + "ms");
        } catch (Exception e) {
            Log.w(TAG, "Failed to patch MP4 duration in file: " + e.getMessage());
        }
    }
}
