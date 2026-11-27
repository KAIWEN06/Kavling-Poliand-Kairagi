package com.poliland.kairagi;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin lokal harus didaftarkan sebelum super.onCreate().
        registerPlugin(CustomNotificationPlugin.class);
        registerPlugin(FileSaverPlugin.class);
        super.onCreate(savedInstanceState);
        applySystemBarInsets();
    }

    /**
     * Satu-satunya tempat inset sistem ditangani di Android (SystemBars.insetsHandling = "disable").
     * WebView selalu berada di antara status bar dan navigation bar, jadi CSS menganggap safe area 0
     * (lihat html.native-insets di src/theme/variables.css).
     */
    private void applySystemBarInsets() {
        Window window = getWindow();
        View decorView = window.getDecorView();
        View content = findViewById(android.R.id.content);

        // Edge-to-edge di semua versi, supaya Android 8 dan Android 15+ lewat jalur yang sama.
        WindowCompat.setDecorFitsSystemWindows(window, false);

        window.setStatusBarColor(Color.TRANSPARENT);
        // Android 7 belum bisa membuat ikon navigation bar gelap, jadi latarnya tetap hitam.
        window.setNavigationBarColor(
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? Color.TRANSPARENT : Color.BLACK
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // "Light" berarti latar terang dengan ikon gelap.
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        // Listener di decorView menerima inset sebelum view lain sempat memakainya.
        // Jangan pindahkan ke android.R.id.content: listener view itu dipakai plugin Keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, insets) -> {
            // systemBars() = status bar + navigation bar + caption bar.
            int barTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets bars = insets.getInsets(barTypes);
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());

            // Saat keyboard terbuka, tinggi keyboard sudah mencakup navigation bar: ambil yang terbesar.
            content.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));

            // DecorView tetap menerima inset asli untuk menggambar latar system bar.
            ViewCompat.onApplyWindowInsets(view, insets);

            // Anak-anaknya (termasuk WebView) menerima 0 agar tidak ada padding kedua.
            // Sengaja bukan CONSUMED: https://issues.chromium.org/issues/461332423
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(barTypes, Insets.NONE)
                .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(decorView);
    }
}
