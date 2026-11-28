<template>
  <div class="admin-fill">
    <slot />
    <div class="admin-fill__footer" aria-hidden="true">
      <SceneBackdrop class="admin-fill__scene" height="100%" :sway="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'

/** Isi halaman Admin ditambah footer beranda. Footer tetap di dasar layar saat isinya pendek. */
</script>

<style scoped>
.admin-fill { display: flex; flex-direction: column; min-height: 100%; }
.admin-fill > :slotted(main) { flex: 1 0 auto; }
.admin-fill__footer {
  position: relative;
  flex: 0 0 auto;
  margin-top: auto;
  height: calc(200px + var(--safe-bottom));
  overflow: hidden;
  background: linear-gradient(180deg, var(--surface-primary, #fff) 0%, var(--pl-paper, #f9f5ec) 55%);
}
.admin-fill__scene :deep(.sun) {
  top: 0;
  right: -90px;
  width: 260px;
  height: 200px;
  background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0));
}
</style>
