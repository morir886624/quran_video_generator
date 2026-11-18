package com.quran.videomaker;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.lang.ref.WeakReference;

public class MainActivity extends BridgeActivity {
    private static WeakReference<MainActivity> currentInstanceRef = new WeakReference<>(null);
    private boolean isActivityResumed = false;

    /**
     * Synchronizes WebView timer & audio state when background playback starts, pauses, or stops
     * while the Activity is in the background (screen locked or minimized).
     */
    public static void syncWebViewWithPlaybackState(final boolean playbackActive) {
        final MainActivity activity = currentInstanceRef.get();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                if (activity.getBridge() == null || activity.getBridge().getWebView() == null) {
                    return;
                }
                WebView webView = activity.getBridge().getWebView();
                if (playbackActive || activity.isActivityResumed) {
                    webView.onResume();
                    webView.resumeTimers();
                } else {
                    // Activity is in background and no audio is playing: suspend WebView to save battery
                    webView.onPause();
                    webView.pauseTimers();
                }
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaSaverPlugin.class);
        super.onCreate(savedInstanceState);
        currentInstanceRef = new WeakReference<>(this);

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                // Allow sequential ayah audio transitions while the screen is locked
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        isActivityResumed = true;
        currentInstanceRef = new WeakReference<>(this);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.onResume();
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        isActivityResumed = false;
        super.onPause();
        if (!isFinishing() && !isChangingConfigurations()) {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    if (AudioPlaybackService.isPlaybackActive) {
                        // Keep WebView audio and timers active ONLY while recitation audio is actively playing
                        webView.onResume();
                        webView.resumeTimers();
                    } else {
                        // Suspend WebView rendering and timers when idle in background to prevent battery drain
                        webView.onPause();
                        webView.pauseTimers();
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onStop() {
        isActivityResumed = false;
        super.onStop();
        if (!isFinishing() && !isChangingConfigurations()) {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    if (AudioPlaybackService.isPlaybackActive) {
                        webView.onResume();
                        webView.resumeTimers();
                    } else {
                        webView.onPause();
                        webView.pauseTimers();
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onDestroy() {
        isActivityResumed = false;
        if (currentInstanceRef.get() == this) {
            currentInstanceRef.clear();
        }
        if (!isChangingConfigurations()) {
            AudioPlaybackService.stopFromAppLifecycle(this);
        }
        super.onDestroy();
    }
}
