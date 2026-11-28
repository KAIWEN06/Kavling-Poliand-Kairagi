<template>
  <nav class="home-menu" :class="{ 'is-in': play }" :aria-label="label">
    <ul>
      <li v-for="(item, i) in shownItems" :key="item.id" :style="{ '--i': i }">
        <button type="button" class="menu-item" :disabled="item.disabled" @click="$emit('select', item.id)">
          <span class="menu-tile" :class="{ 'is-gold': item.gold }">
            <MenuIllustration :name="item.id" />
          </span>
          <span class="menu-label">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MenuIllustration, { type MenuIllustrationName } from '@/components/home/MenuIllustration.vue'

type MenuItem = { id: MenuIllustrationName; label: string; gold?: boolean; disabled?: boolean }

/**
 * `play` ditahan sampai skeleton hilang agar animasi masuk benar-benar terlihat.
 * Tanpa `items`, yang tampil adalah menu Beranda publik.
 */
const props = withDefaults(defineProps<{ play: boolean; items?: MenuItem[]; label?: string }>(), {
  items: undefined,
  label: 'Menu Beranda',
})
defineEmits<{ select: [id: MenuIllustrationName] }>()

const publicItems: MenuItem[] = [
  { id: 'denah', label: 'Denah' },
  { id: 'lokasi', label: 'Lokasi', gold: true },
  { id: 'progres', label: 'Progres' },
  { id: 'galeri', label: 'Galeri', gold: true },
  { id: 'ulasan', label: 'Ulasan', gold: true },
  { id: 'tentang', label: 'Tentang' },
  { id: 'kontak', label: 'Kontak', gold: true },
  { id: 'whatsapp', label: 'WhatsApp' },
]

const shownItems = computed(() => props.items ?? publicItems)
</script>

<style scoped>
.home-menu { padding: 16px 8px 8px; }

ul {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 4px;
  max-width: 520px;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

li {
  opacity: 0;
  transform: scale(0.9);
}
.is-in li {
  opacity: 1;
  transform: none;
  transition:
    opacity 240ms var(--ease-out) calc(var(--i) * 35ms),
    transform 360ms var(--ease-spring) calc(var(--i) * 35ms);
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 80px;
  padding: 2px 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.menu-item:active:not(:disabled) { transform: scale(0.93); }
.menu-item:disabled { opacity: 0.5; cursor: not-allowed; }
.menu-item:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 1px; }

.menu-tile {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  padding: 9px;
  box-sizing: border-box;
  border-radius: 18px;
  background: var(--green-50, #eef3ea);
}
.menu-tile.is-gold { background: var(--gold-50, #fbf4e4); }

.menu-label {
  max-width: 100%;
  color: var(--text-primary, #252525);
  font: 600 12px/1.3 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-align: center;
}

@media (hover: hover) and (pointer: fine) {
  .menu-item:hover .menu-label { color: var(--poliland-green, #355a2c); }
}

@media (prefers-reduced-motion: reduce) {
  li { transform: none; }
  .is-in li { transition: opacity 160ms linear; }
  .menu-item:active { transform: none; }
}
</style>
