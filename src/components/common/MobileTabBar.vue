<template>
  <div class="mobile-footer">

    <div class="bottom-nav">

      <!-- =========================
           MARKETING
           ========================= -->

      <template v-if="variant === 'marketing'">

        <!-- BERANDA -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/beranda-marketing') }
          ]"
          @click="goTo('/beranda-marketing')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="homeOutline" />
          </span>

          <span class="nav-label">
            Beranda
          </span>
        </button>


        <!-- KAVLING -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/kavling') }
          ]"
          @click="goTo('/kavling')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="gridOutline" />
          </span>

          <span class="nav-label">
            Kavling
          </span>
        </button>


        <!-- CALON PEMBELI -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/marketing/clients') }
          ]"
          @click="goTo('/marketing/clients')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="personOutline" />
          </span>

          <span class="nav-label">
            Calon Pembeli
          </span>
        </button>


        <!-- TINDAK LANJUT -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/marketing/tindak-lanjut') }
          ]"
          @click="goTo('/marketing/tindak-lanjut')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="checkmarkDoneOutline" />
          </span>

          <span class="nav-label">
            Tindak Lanjut
          </span>
        </button>


        <!-- LAINNYA -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/beranda-marketing') }
          ]"
          @click="goTo('/beranda-marketing')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="menuOutline" />
          </span>

          <span class="nav-label">
            Lainnya
          </span>
        </button>

      </template>


      <!-- =========================
           PUBLIC
           ========================= -->

      <template v-else>

        <!-- HOME -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/home') }
          ]"
          @click="goTo('/home')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="homeOutline" />
          </span>

          <span class="nav-label">
            Home
          </span>
        </button>


        <!-- SITEPLAN -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/siteplan') }
          ]"
          @click="goTo('/siteplan')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="mapOutline" />
          </span>

          <span class="nav-label">
            Siteplan
          </span>
        </button>


        <!-- PROGRESS -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/progress') }
          ]"
          @click="goTo('/progress')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="constructOutline" />
          </span>

          <span class="nav-label">
            Progress
          </span>
        </button>


        <!-- GALLERY -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/gallery') }
          ]"
          @click="goTo('/gallery')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="imagesOutline" />
          </span>

          <span class="nav-label">
            Gallery
          </span>
        </button>


        <!-- CONTACT -->
        <button
          type="button"
          :class="[
            'nav-item',
            { active: isActive('/contact') }
          ]"
          @click="goTo('/contact')"
        >
          <span class="icon-wrap">
            <ion-icon :icon="callOutline" />
          </span>

          <span class="nav-label">
            Kontak
          </span>
        </button>

      </template>

    </div>

  </div>
</template>


<script setup lang="ts">
import {
  IonIcon,
  useIonRouter,
} from '@ionic/vue'

import {
  homeOutline,
  mapOutline,
  constructOutline,
  imagesOutline,
  callOutline,
  gridOutline,
  personOutline,
  checkmarkDoneOutline,
  menuOutline,
} from 'ionicons/icons'

import { useRoute } from 'vue-router'


withDefaults(
  defineProps<{
    variant?: 'public' | 'marketing'
  }>(),
  {
    variant: 'public',
  },
)


const ionRouter = useIonRouter()
const route = useRoute()


/* =====================================================
   NAVIGATION
   ===================================================== */

function goTo(path: string) {
  if (route.path === path) {
    return
  }

  ionRouter.replace(path)
}


/* =====================================================
   ACTIVE TAB
   ===================================================== */

function isActive(path: string) {

  if (path === '/beranda-marketing') {
    return route.path === '/beranda-marketing' ||
      route.path === '/marketing'
  }

  if (path === '/home') {
    return route.path === '/home' || route.path === '/'
  }

  return route.path.startsWith(path)
}
</script>


<style scoped>

.mobile-footer {
  --tab-bar-height: 74px;

  position: fixed;

  left: 0;

  right: 0;

  bottom: 0;

  z-index: 9999;

  background: transparent;

  box-shadow: none;

  padding:
    0
    12px
    calc(8px + env(safe-area-inset-bottom));

  transform: none !important;

  transition:
    opacity 0.2s ease;
}


.bottom-nav {
  position: relative;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  align-items: stretch;

  min-height: var(--tab-bar-height);

  padding: 8px 6px;

  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.98) 0%,
      rgba(249, 245, 236, 0.98) 100%
    );

  border:
    1px solid
    rgba(217, 211, 196, 0.75);

  border-radius: 25px;

  box-shadow:
    0 8px 28px
    rgba(26, 26, 26, 0.10),

    0 2px 8px
    rgba(85, 107, 47, 0.06);

  backdrop-filter: blur(16px);

  -webkit-backdrop-filter: blur(16px);
}


.nav-item {
  position: relative;

  z-index: 2;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  min-width: 0;

  height: 58px;

  gap: 2px;

  border: 0;

  outline: 0;

  background: transparent;

  color:
    var(--pl-warm-gray, #a7a7a7);

  font-family: inherit;

  font-size: 9px;

  font-weight: 600;

  letter-spacing: 0.05px;

  padding: 0;

  cursor: pointer;

  -webkit-tap-highlight-color: transparent;

  transition:
    color 260ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    transform 260ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}


.icon-wrap {
  position: relative;

  display: flex;

  align-items: center;

  justify-content: center;

  width: 38px;

  height: 38px;

  border-radius: 50%;

  transition:
    width 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    height 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    transform 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    background 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    box-shadow 320ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}


.nav-item ion-icon {
  font-size: 21px;

  transition:
    transform 300ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    color 260ms ease,

    filter 260ms ease;
}


.nav-label {
  line-height: 1;

  white-space: nowrap;

  transform: translateY(0);

  transition:
    transform 300ms cubic-bezier(
      0.22,
      1,
      0.36,
      1
    ),

    opacity 220ms ease,

    color 260ms ease;
}


/* =====================================================
   ACTIVE
   ===================================================== */

.nav-item.active {
  color:
    var(--pl-olive, #556b2f);
}


.nav-item.active .icon-wrap {
  width: 44px;

  height: 44px;

  transform: translateY(-7px);

  background:
    var(
      --pl-gold-gradient,
      linear-gradient(
        135deg,
        #b8860b,
        #f4e3b2
      )
    );

  box-shadow:
    0 7px 15px
    rgba(184, 134, 11, 0.20),

    0 0 0 5px
    rgba(244, 227, 178, 0.32);
}


.nav-item.active ion-icon {
  color: #ffffff;

  font-size: 22px;

  transform: scale(1.03);

  filter:
    drop-shadow(
      0 1px 2px
      rgba(26, 26, 26, 0.14)
    );
}


.nav-item.active .nav-label {
  transform: translateY(-4px);

  color:
    var(--pl-deep-green, #2e4d2d);

  font-weight: 700;
}


.nav-item.active::after {
  content: '';

  position: absolute;

  left: 50%;

  bottom: 1px;

  width: 4px;

  height: 4px;

  border-radius: 50%;

  background:
    var(--pl-olive, #556b2f);

  transform:
    translateX(-50%)
    scale(1);

  animation:
    active-dot-in
    320ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}


.nav-item:active {
  transform: scale(0.94);
}


.nav-item:active .icon-wrap {
  transition-duration: 120ms;
}


.nav-item.active:active .icon-wrap {
  transform:
    translateY(-5px)
    scale(0.96);
}


@keyframes active-dot-in {

  0% {
    opacity: 0;

    transform:
      translateX(-50%)
      scale(0);
  }

  70% {
    opacity: 1;

    transform:
      translateX(-50%)
      scale(1.25);
  }

  100% {
    opacity: 1;

    transform:
      translateX(-50%)
      scale(1);
  }

}

</style>