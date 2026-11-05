<template>
  <section class="menu-section">

    <!-- KAVLING -->
    <button
      type="button"
      class="menu-card"
      @click="$emit('kavling')"
    >
      <div class="menu-icon">
        <ion-icon :icon="gridOutline" />
      </div>

      <span>
        Kavling
      </span>
    </button>


    <!-- SITEPLAN -->
    <button
      type="button"
      class="menu-card"
      @click="$emit('siteplan')"
    >
      <div class="menu-icon">
        <ion-icon :icon="gitNetworkOutline" />
      </div>

      <span>
        Siteplan
      </span>
    </button>


    <!-- CALON PEMBELI -->
    <button
      type="button"
      class="menu-card"
      @click="$emit('clients')"
    >
      <div class="menu-icon">
        <ion-icon :icon="personOutline" />
      </div>

      <span>
        Calon Pembeli
      </span>
    </button>


    <!-- TINDAK LANJUT -->
    <button
      type="button"
      class="menu-card"
      @click="$emit('followup')"
    >
      <div class="menu-icon">
        <ion-icon :icon="personAddOutline" />
      </div>

      <span>
        Tindak Lanjut
      </span>
    </button>


    <!-- INFORMASI PROYEK -->
    <button
      type="button"
      class="menu-card"
      @click="$emit('project')"
    >
      <div class="menu-icon">
        <ion-icon :icon="informationCircleOutline" />
      </div>

      <span>
        Informasi Proyek
      </span>
    </button>


    <!-- KONTAK -->
    <button
      type="button"
      class="menu-card"
      @click="$emit('contact')"
    >
      <div class="menu-icon">
        <ion-icon :icon="callOutline" />
      </div>

      <span>
        Kontak
      </span>
    </button>

  </section>
</template>


<script setup lang="ts">
import { IonIcon } from '@ionic/vue'

import {
  gridOutline,
  gitNetworkOutline,
  personOutline,
  personAddOutline,
  informationCircleOutline,
  callOutline,
} from 'ionicons/icons'


defineEmits<{
  kavling: []
  siteplan: []
  clients: []
  followup: []
  project: []
  contact: []
}>()
</script>


<style scoped>

.menu-section {
  position: relative;

  z-index: 2;

  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 16px;

  margin-bottom: 38px;
}


.menu-card {
  min-width: 0;

  height: 148px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 12px;

  padding: 14px 8px;

  border: 0;

  border-radius: 18px;

  background: #ffffff;

  color: #292929;

  font-family: inherit;

  cursor: pointer;

  box-shadow:
    0 1px 4px
    rgba(45, 45, 45, 0.025);

  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}


.menu-card:active {
  transform: scale(0.96);

  box-shadow:
    0 4px 12px
    rgba(45, 45, 45, 0.08);
}


.menu-icon {
  width: 45px;

  height: 45px;

  display: flex;

  align-items: center;

  justify-content: center;

  color: #c9a754;
}


.menu-icon ion-icon {
  font-size: 38px;
}


.menu-card span {
  display: block;

  max-width: 100%;

  color: #292929;

  font-size: 14px;

  line-height: 1.15;

  font-weight: 700;

  text-align: center;
}


@media (max-width: 360px) {

  .menu-section {
    gap: 12px;
  }

  .menu-card {
    height: 135px;
  }

  .menu-card span {
    font-size: 12px;
  }

  .menu-icon ion-icon {
    font-size: 34px;
  }
}

</style>