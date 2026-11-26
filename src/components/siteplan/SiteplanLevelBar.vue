<template>
  <nav class="level-bar" aria-label="Navigasi denah">
    <button type="button" class="level-back" aria-label="Kembali ke Denah" @click="$emit('back')">
      <IonIcon :icon="chevronBackOutline" aria-hidden="true" />
      <span>Denah</span>
    </button>
    <div class="level-info" aria-live="polite">
      <strong>{{ block.name }}</strong>
      <span>{{ block.available }} dari {{ block.total }} tersedia</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { chevronBackOutline } from 'ionicons/icons'
import type { SiteplanBlock } from '@/utils/siteplanBlocks'

defineProps<{ block: SiteplanBlock }>()
defineEmits<{ back: [] }>()
</script>

<style scoped>
.level-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 360px;
  padding: 8px 16px 8px 8px;
  border: 1px solid rgba(53, 90, 44, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 12px 28px -14px rgba(31, 53, 25, 0.55);
}

.level-back {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  min-height: 48px;
  padding: 0 12px 0 8px;
  border: 0;
  border-radius: 12px;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font: 700 13px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-base) var(--ease-spring);
}

.level-back ion-icon {
  font-size: 18px;
}

.level-back:active {
  transform: scale(0.97);
}

.level-back:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
}

.level-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.level-info strong {
  color: var(--text-primary, #252525);
  font: 650 19px/1.15 var(--font-display, 'Fraunces Variable', Georgia, serif);
}

.level-info span {
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
  line-height: 1.4;
}
</style>
