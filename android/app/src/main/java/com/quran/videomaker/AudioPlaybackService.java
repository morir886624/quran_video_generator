package com.quran.videomaker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Media Playback Service that keeps CPU, Wifi, and WebView audio
 * alive when the phone screen is locked or the app is in the background.
 */
public class AudioPlaybackService extends Service {
    private static final String TAG = "AudioPlaybackService";
    public static final String CHANNEL_ID = "quran_playback_channel";
    public static final int NOTIFICATION_ID = 4401;

    public static final String ACTION_START_OR_UPDATE = "com.quran.videomaker.ACTION_START_OR_UPDATE";
    public static final String ACTION_STOP = "com.quran.videomaker.ACTION_STOP";
    public static final String ACTION_MEDIA_CONTROL = "com.quran.videomaker.ACTION_MEDIA_CONTROL";

    public static volatile boolean isPlaybackActive = false;

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private String currentTitle = "Quran Recitation";
    private String currentArtist = "Quran Video Studio";
    private boolean isPlaying = true;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireLocks();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                isPlaybackActive = false;
                releaseLocks();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            if (title != null && !title.isEmpty()) {
                currentTitle = title;
            }
            if (artist != null && !artist.isEmpty()) {
                currentArtist = artist;
            }
            isPlaying = intent.getBooleanExtra("isPlaying", true);
        }

        isPlaybackActive = isPlaying;
        if (isPlaying) {
            acquireLocks();
        }

        Notification notification = buildNotification(currentTitle, currentArtist, isPlaying);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service", e);
        }

        return START_STICKY;
    }

    private void acquireLocks() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "QuranVideoStudio::AudioWakeLock"
                    );
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L); // up to 4 hours
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to acquire WakeLock", e);
        }

        try {
            if (wifiLock == null) {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    int lockType = WifiManager.WIFI_MODE_FULL_HIGH_PERF;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        lockType = WifiManager.WIFI_MODE_FULL_LOW_LATENCY;
                    }
                    wifiLock = wm.createWifiLock(lockType, "QuranVideoStudio::AudioWifiLock");
                    wifiLock.setReferenceCounted(false);
                }
            }
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to acquire WifiLock", e);
        }
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Quran Recitation Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps Quran recitation playing when the screen is locked");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private PendingIntent createControlPendingIntent(String command, int requestCode) {
        Intent intent = new Intent(ACTION_MEDIA_CONTROL);
        intent.setPackage(getPackageName());
        intent.putExtra("command", command);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(this, requestCode, intent, flags);
    }

    private Notification buildNotification(String title, String artist, boolean playing) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openIntent, flags);

        PendingIntent prevIntent = createControlPendingIntent("prev", 101);
        PendingIntent playPauseIntent = createControlPendingIntent(playing ? "pause" : "play", 102);
        PendingIntent nextIntent = createControlPendingIntent("next", 103);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText("Quran Video Studio")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
            .addAction(
                playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                playing ? "Pause" : "Play",
                playPauseIntent
            )
            .addAction(android.R.drawable.ic_media_next, "Next", nextIntent);

        return builder.build();
    }

    @Override
    public void onDestroy() {
        isPlaybackActive = false;
        releaseLocks();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

