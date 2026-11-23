<template>
  <img
    v-if="src && !failed"
    class="avatar"
    :src="src"
    :alt="`Foto ${name}`"
    loading="lazy"
    @error="failed = true"
  />
  <span v-else class="avatar avatar--initial" role="img" :aria-label="`Foto ${name}`">
    {{ initial }}
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ src: string | null; name: string }>()
const failed = ref(false)
const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '?')
</script>

<style scoped>
.avatar {
  display: grid;
  flex: none;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.avatar--initial {
  background: var(--green-100);
  color: var(--poliland-green);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
</style>
