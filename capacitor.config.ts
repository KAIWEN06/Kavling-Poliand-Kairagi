import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  "appId": "com.poliland.kairagi",
  "appName": "PoliLand",
  "webDir": "dist",
  "plugins": {
    "Keyboard": {
      "resize": "none",
      "style": "DARK"
    }
  }
};

export default config;