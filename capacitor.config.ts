import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  "appId": "com.poliland.kairagi",
  "appName": "PoliLand",
  "webDir": "dist",
  "plugins": {
    "SystemBars": {
      // Inset Android ditangani MainActivity.java; jangan aktifkan lagi (padding ganda).
      "insetsHandling": "disable",
      // LIGHT = ikon gelap, juga saat HP memakai mode gelap.
      "style": "LIGHT"
    },
    "Keyboard": {
      "resize": "none",
      "style": "DARK"
    }
  }
};

export default config;