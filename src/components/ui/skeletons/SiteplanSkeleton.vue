<template>
  <div class="siteplan-skeleton">
    <div class="map-area">
      <!-- Area Siteplan Berbentuk Kotak Polos Saja -->
      <Skeleton width="86%" height="72%" border-radius="20px" class="map-box-placeholder" />

      <!-- Tombol Search di Kiri Atas Peta -->
      <div class="map-top-left">
        <Skeleton width="42px" height="42px" border-radius="12px" />
      </div>

      <!-- Kompas & Toolbar Kontrol Peta di Kanan -->
      <div class="map-right-toolbar">
        <Skeleton width="44px" height="44px" border-radius="50%" />
        <div class="map-controls-group">
          <Skeleton v-for="i in 4" :key="i" width="36px" height="36px" border-radius="9px" />
        </div>
      </div>

      <!-- Minimap Preview di Kiri Bawah -->
      <div class="map-minimap">
        <Skeleton width="76px" height="76px" border-radius="10px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from '../Skeleton.vue'
</script>

<style scoped>
.siteplan-skeleton {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  background: #c5d2a5;
}

.map-area {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(145deg, #cbd7ae, #b9c995);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Kotak Polos Utama Tempat Siteplan */
.map-box-placeholder {
  position: absolute;
  box-shadow: 0 8px 30px rgba(50, 60, 35, 0.12);
}

/* Tombol Search (Kiri Atas) */
.map-top-left {
  position: absolute;
  top: 16px;
  left: 16px;
}

/* Toolbar Kanan (Kompas & Kontrol) */
.map-right-toolbar {
  position: absolute;
  right: 16px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.map-controls-group {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 14px;
  padding: 5px;
  box-shadow: 0 6px 20px rgba(50, 60, 35, 0.16);
  gap: 5px;
}

/* Minimap Preview (Kiri Bawah) */
.map-minimap {
  position: absolute;
  left: 16px;
  bottom: 20px;
}

@media (max-width: 480px) {
  .map-top-left { top: 12px; left: 12px; }
  .map-right-toolbar { right: 10px; bottom: 12px; gap: 8px; }
  .map-minimap { left: 10px; bottom: 12px; }
}
</style>