<template>
  <header class="ui-page-header">
    <PageBackButton v-if="showBack" :fallback="backFallback" :label="backLabel" class="ui-page-header__back" />

    <nav v-if="crumbs?.length" class="ui-page-header__crumbs" aria-label="Navigasi halaman">
      <template v-for="(crumb, i) in crumbs" :key="crumb.label">
        <router-link v-if="crumb.to && i < crumbs.length - 1" :to="crumb.to">{{ crumb.label }}</router-link>
        <span v-else :aria-current="i === crumbs.length - 1 ? 'page' : undefined">{{ crumb.label }}</span>
        <span v-if="i < crumbs.length - 1" class="ui-page-header__sep" aria-hidden="true">/</span>
      </template>
    </nav>

    <div class="ui-page-header__row">
      <div class="ui-page-header__text">
        <h1 class="ui-page-header__title t-heading">{{ title }}</h1>
        <p v-if="subtitle" class="ui-page-header__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="ui-page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.default" class="ui-page-header__extra">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import PageBackButton from '@/components/ui/PageBackButton.vue'

export interface Crumb {
  label: string
  to?: string
}

defineProps<{
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  /** Tampilkan tombol kembali (hanya untuk halaman turunan, bukan halaman utama). */
  showBack?: boolean
  /** Tujuan bila tidak ada riwayat navigasi. */
  backFallback?: string
  backLabel?: string
}>()
</script>

<style scoped>
.ui-page-header {
  display: grid;
  gap: var(--space-3);
  padding-block: var(--space-2) var(--space-4);
}
.ui-page-header__back { justify-self: start; }
.ui-page-header__crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}
.ui-page-header__crumbs a {
  color: var(--green-700);
  font-weight: 600;
  text-decoration: none;
}
.ui-page-header__crumbs a:hover { text-decoration: underline; }
.ui-page-header__sep { color: var(--border-strong); }

.ui-page-header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3) var(--space-6);
}
.ui-page-header__text { min-width: 0; flex: 1 1 260px; }
.ui-page-header__title { margin: 0; }
.ui-page-header__subtitle {
  margin: var(--space-1) 0 0;
  max-width: 62ch;
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: var(--leading-body);
}
.ui-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.ui-page-header__extra { min-width: 0; }

/* Garis ukur tipis di bawah header: motif gambar kerja survei */
.ui-page-header {
  border-bottom: 1px solid var(--border-default);
  margin-bottom: var(--space-5);
}
</style>
