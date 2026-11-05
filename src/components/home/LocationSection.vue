<template>
  <div class="location-card">
    <!-- Peta Satelit Interaktif (Bisa di-zoom, digeser, & tombol Buka Maps) -->
    <div class="location-map">
      <div class="map-container">
        <iframe
          title="Peta Satelit Kavling Poliland Kairagi"
          src="https://maps.google.com/maps?q=1.5107731,124.8848806&t=k&z=17&output=embed"
          class="w-full h-full border-0"
          allowfullscreen
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
        <!-- Tombol Buka Maps dipindah ke dalam map-container agar melayang rapi di atas peta -->
        <div class="absolute top-3 left-3 z-10">
          <a 
            href="https://www.google.com/maps/place/Kavling+Poliland+Kairagi/@1.5108754,124.884911,356m/data=!3m1!1e3!4m14!1m7!3m6!1s0x3287a17f6f7d8a4b:0x38b06b5f538ada2e!2sKavling+Poliland+Kairagi!8m2!3d1.5107731!4d124.8848806!16s%2Fg%2F11yt3vvqs4!3m5!1s0x3287a17f6f7d8a4b:0x38b06b5f538ada2e!8m2!3d1.5107731!4d124.8848806!16s%2Fg%2F11yt3vvqs4?entry=ttu" 
            target="_blank" 
            rel="noopener noreferrer"
            class="map-float-btn"
          >
            <ion-icon :icon="locationOutline" class="map-btn-icon" /> Buka Google Maps
          </a>
        </div>
      </div>
    </div>

    <!-- Daftar Tempat Terdekat Sesuai Referensi -->
    <div class="location-info">
      <div v-for="(item, idx) in nearbyPlaces" :key="idx">
        <ion-icon :icon="item.icon" />
        <span>{{ item.name }}</span>
        <small>{{ item.time }}</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { 
  schoolOutline, 
  airplaneOutline, 
  businessOutline, 
  storefrontOutline, 
  locationOutline 
} from 'ionicons/icons'

const nearbyPlaces = [
  { icon: schoolOutline, name: 'Politeknik Negeri Manado (Polimdo)', time: '± 5 menit' },
  { icon: airplaneOutline, name: 'Bandara Sam Ratulangi', time: '± 15 menit' },
  { icon: businessOutline, name: 'Jl. Politeknik Permai & Akses Utama', time: '± 3 menit' },
  { icon: storefrontOutline, name: 'Pusat Perbelanjaan & Minimarket Lokal', time: '± 5 menit' },
  { icon: locationOutline, name: 'Pusat Kota Manado', time: '± 20 menit' },
];
</script>

<style scoped>
.location-card {
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(26, 26, 26, 0.06);
}
.location-map {
  height: 240px; 
  padding: 12px;
  background: #FFFFFF;
}
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #E5E5E5;
}

/* Styling Tombol Melayang agar menyatu dengan nuansa kartu */
.map-float-btn {
  background: rgba(255, 255, 255, 0.95);
  color: #1A1A1A;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  backdrop-filter: blur(4px);
  border: 1px solid #E5E5E5;
  transition: all 0.2s ease;
}

.map-float-btn:hover {
  background: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.map-btn-icon {
  color: #556B2F;
  font-size: 14px;
}

.location-info {
  padding: 8px 16px 16px 16px;
}
.location-info > div {
  display: flex;
  align-items: center;
  min-height: 42px;
  gap: 10px;
  border-bottom: 1px solid #FAFAF7;
}
.location-info > div:last-child {
  border-bottom: 0;
}
.location-info ion-icon {
  color: #8CA072;
  font-size: 16px;
  min-width: 16px;
}
.location-info span {
  flex: 1;
  color: #2D2D2D;
  font-size: 11px;
  font-weight: 600;
}
.location-info small {
  color: #A7A7A7;
  font-size: 10px;
  font-weight: 500;
}
</style>