package com.quran.videomaker;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaSaverPlugin.class);
        super.onCreate(savedInstanceState);

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
    public void onPause() {
        super.onPause();
        // Prevent Android WebView from pausing HTML5 recitation audio and JS timers when screen locks
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.onResume();
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        // Keep WebView audio and timers active when the phone is locked or in background
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.onResume();
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MediaSaverPlugin.PERMISSION_REQ_CODE) {
            MediaSaverPlugin.promptBatteryOptimizationIfNeeded(this);
        }
    }
}
