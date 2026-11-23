package com.poliland.kairagi;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin lokal harus didaftarkan sebelum super.onCreate().
        registerPlugin(CustomNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
