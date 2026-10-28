package com.quran.videomaker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.Icon;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.Nullable;

/**
 * Rich Native Android Media Player Service with MediaSession, Notification.MediaStyle,
 * interactive seekbar, custom Surah artwork, and lock-screen / Bluetooth controls.
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
    private MediaSession mediaSession;

    private String currentTitle = "Quran Recitation";
    private String currentArtist = "Mishari Rashid Al-Afasy";
    private String currentAlbum = "Quran Video Studio";
    private boolean isPlaying = true;
    private long currentDurationMs = 0L;
    private long currentPositionMs = 0L;
    private float currentPlaybackSpeed = 1.0f;

    private String cachedArtKey = null;
    private Bitmap cachedArtwork = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
        acquireLocks();
    }

    private void initMediaSession() {
        try {
            mediaSession = new MediaSession(this, "QuranVideoStudioMediaSession");
            mediaSession.setCallback(new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    sendControlBroadcast("play", -1L);
                }

                @Override
                public void onPause() {
                    sendControlBroadcast("pause", -1L);
                }

                @Override
                public void onSkipToNext() {
                    sendControlBroadcast("next", -1L);
                }

                @Override
                public void onSkipToPrevious() {
                    sendControlBroadcast("prev", -1L);
                }

                @Override
                public void onSeekTo(long pos) {
                    currentPositionMs = Math.max(0L, pos);
                    updateMediaSessionState();
                    sendControlBroadcast("seek", currentPositionMs);
                }
            });
            mediaSession.setFlags(
                MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
            );
            mediaSession.setActive(true);
        } catch (Exception e) {
            Log.w(TAG, "Failed to initialize MediaSession", e);
        }
    }

    private void sendControlBroadcast(String command, long seekMs) {
        Intent intent = new Intent(ACTION_MEDIA_CONTROL);
        intent.setPackage(getPackageName());
        intent.putExtra("command", command);
        if (seekMs >= 0L) {
            intent.putExtra("seekMs", seekMs);
        }
        sendBroadcast(intent);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                isPlaybackActive = false;
                if (mediaSession != null) {
                    try {
                        mediaSession.setActive(false);
                    } catch (Exception ignored) {}
                }
                releaseLocks();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            String album = intent.getStringExtra("album");
            if (title != null && !title.isEmpty()) {
                currentTitle = title;
            }
            if (artist != null && !artist.isEmpty()) {
                currentArtist = artist;
            }
            if (album != null && !album.isEmpty()) {
                currentAlbum = album;
            }
            isPlaying = intent.getBooleanExtra("isPlaying", true);
            if (intent.hasExtra("durationMs")) {
                currentDurationMs = Math.max(0L, intent.getLongExtra("durationMs", 0L));
            }
            if (intent.hasExtra("positionMs")) {
                currentPositionMs = Math.max(0L, intent.getLongExtra("positionMs", 0L));
            }
            if (intent.hasExtra("playbackSpeed")) {
                float spd = intent.getFloatExtra("playbackSpeed", 1.0f);
                if (spd > 0f) currentPlaybackSpeed = spd;
            }
        }

        isPlaybackActive = isPlaying;
        if (isPlaying) {
            acquireLocks();
        }

        if (mediaSession == null) {
            initMediaSession();
        } else {
            try {
                mediaSession.setActive(true);
            } catch (Exception ignored) {}
        }

        updateMediaSessionState();
        Notification notification = buildNotification(currentTitle, currentArtist, currentAlbum, isPlaying);

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

    private void updateMediaSessionState() {
        if (mediaSession == null) return;
        try {
            Bitmap art = getOrCreateArtwork(currentAlbum, currentArtist);

            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, currentAlbum)
                .putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, art)
                .putBitmap(MediaMetadata.METADATA_KEY_ART, art)
                .putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, art);

            if (currentDurationMs > 0L) {
                metaBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, currentDurationMs);
            } else {
                metaBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, -1L);
            }
            mediaSession.setMetadata(metaBuilder.build());

            long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SEEK_TO;

            int state = isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
            float speed = isPlaying ? currentPlaybackSpeed : 0f;

            PlaybackState playbackState = new PlaybackState.Builder()
                .setActions(actions)
                .setState(state, currentPositionMs, speed, SystemClock.elapsedRealtime())
                .build();

            mediaSession.setPlaybackState(playbackState);
        } catch (Exception e) {
            Log.w(TAG, "Failed to update MediaSession state", e);
        }
    }

    /**
     * Generates a rich 512x512 Emerald & Gold Islamic Media Player cover art Bitmap
     * so the Android notification shade & lock screen player look like a flagship audio app.
     */
    private Bitmap getOrCreateArtwork(String albumTitle, String artistName) {
        String key = (albumTitle != null ? albumTitle : "") + "|" + (artistName != null ? artistName : "");
        if (cachedArtwork != null && key.equals(cachedArtKey)) {
            return cachedArtwork;
        }

        int size = 512;
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        // 1. Deep Emerald & Midnight Linear Gradient Background
        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setShader(new LinearGradient(
            0, 0, size, size,
            new int[]{0xFF064E3B, 0xFF022C22, 0xFF0F172A},
            new float[]{0f, 0.55f, 1f},
            Shader.TileMode.CLAMP
        ));
        canvas.drawRect(0, 0, size, size, bgPaint);

        // 2. Subtle Golden Ornamental Outer Border & Rub el Hizb Octagram
        Paint goldStroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        goldStroke.setStyle(Paint.Style.STROKE);
        goldStroke.setColor(0x55FBBF24);
        goldStroke.setStrokeWidth(4f);
        RectF outerRect = new RectF(28, 28, size - 28, size - 28);
        canvas.drawRoundRect(outerRect, 36, 36, goldStroke);

        // Inner rotated squares (Rub el Hizb motif)
        goldStroke.setColor(0x38FCD34D);
        goldStroke.setStrokeWidth(3f);
        float center = size / 2f;
        float halfSq = 135f;
        RectF sq = new RectF(center - halfSq, center - halfSq - 24, center + halfSq, center + halfSq - 24);
        canvas.save();
        canvas.drawRect(sq, goldStroke);
        canvas.rotate(45f, center, center - 24);
        canvas.drawRect(sq, goldStroke);
        canvas.restore();

        // 3. Draw App Icon or Glowing Emerald Circle in Center
        Paint circlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        circlePaint.setColor(0x4010B981);
        canvas.drawCircle(center, center - 24, 88f, circlePaint);

        try {
            int iconRes = getApplicationInfo().icon;
            if (iconRes != 0) {
                Bitmap appIcon = BitmapFactory.decodeResource(getResources(), iconRes);
                if (appIcon != null) {
                    int iconSize = 124;
                    RectF dst = new RectF(
                        center - iconSize / 2f,
                        (center - 24) - iconSize / 2f,
                        center + iconSize / 2f,
                        (center - 24) + iconSize / 2f
                    );
                    canvas.drawBitmap(appIcon, null, dst, new Paint(Paint.FILTER_BITMAP_FLAG));
                }
            }
        } catch (Exception ignored) {}

        // 4. Surah Title & Studio Subtitle at Bottom of Cover Art
        Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setColor(0xFFFef08A); // Warm Gold
        titlePaint.setTextSize(34f);
        titlePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        titlePaint.setTextAlign(Paint.Align.CENTER);

        String displayAlbum = (albumTitle != null && !albumTitle.isEmpty()) ? albumTitle : "Al-Quran Al-Kareem";
        if (displayAlbum.length() > 24) {
            displayAlbum = displayAlbum.substring(0, 22) + "…";
        }
        canvas.drawText(displayAlbum, center, size - 92f, titlePaint);

        Paint subPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subPaint.setColor(0xCCA7F3D0);
        subPaint.setTextSize(22f);
        subPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL));
        subPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("Quran Video Studio", center, size - 54f, subPaint);

        cachedArtKey = key;
        cachedArtwork = bmp;
        return bmp;
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
                wakeLock.acquire(4 * 60 * 60 * 1000L);
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
            channel.setDescription("Rich media player controls for Quran recitation");
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

    private Notification buildNotification(String title, String artist, String album, boolean playing) {
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

        Bitmap artwork = getOrCreateArtwork(album, artist);
        int smallIconRes = getApplicationInfo().icon != 0
            ? getApplicationInfo().icon
            : android.R.drawable.ic_media_play;

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        Notification.Action prevAction = new Notification.Action.Builder(
            Icon.createWithResource(this, android.R.drawable.ic_media_previous),
            "Previous Chapter",
            prevIntent
        ).build();

        Notification.Action playPauseAction = new Notification.Action.Builder(
            Icon.createWithResource(
                this,
                playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play
            ),
            playing ? "Pause" : "Play",
            playPauseIntent
        ).build();

        Notification.Action nextAction = new Notification.Action.Builder(
            Icon.createWithResource(this, android.R.drawable.ic_media_next),
            "Next Chapter",
            nextIntent
        ).build();

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
            .setShowActionsInCompactView(0, 1, 2);
        if (mediaSession != null) {
            mediaStyle.setMediaSession(mediaSession.getSessionToken());
        }

        builder
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album)
            .setSmallIcon(smallIconRes)
            .setLargeIcon(artwork)
            .setContentIntent(contentIntent)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setColor(0xFF064E3B)
            .setColorized(true)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setStyle(mediaStyle)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction);

        return builder.build();
    }

    @Override
    public void onDestroy() {
        isPlaybackActive = false;
        if (mediaSession != null) {
            try {
                mediaSession.setActive(false);
                mediaSession.release();
            } catch (Exception ignored) {}
            mediaSession = null;
        }
        releaseLocks();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
