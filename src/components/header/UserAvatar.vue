<template>
  <span
    class="user-avatar"
    :style="{ '--avatar-size': `${size}px` }"
    role="img"
    :aria-label="`Foto profil ${name || 'pengguna'}`"
  >
    <img
      v-if="showImage"
      :src="src"
      alt=""
      class="user-avatar__img"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="user-avatar__initials" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getInitials } from '@/services/profile/profileService'

const props = withDefaults(defineProps<{ name?: string; src?: string; size?: number }>(), {
  name: '',
  src: '',
  size: 40,
})

const failed = ref(false)
// Foto baru (URL berubah) harus dicoba lagi walau foto sebelumnya gagal.
watch(() => props.src, () => (failed.value = false))

const showImage = computed(() => Boolean(props.src) && !failed.value)
const initials = computed(() => getInitials(props.name))
</script>

<style scoped>
.user-avatar {
  display: inline-grid;
  flex: 0 0 auto;
  width: var(--avatar-size);
  height: var(--avatar-size);
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  color: #fff;
  background: var(--poliland-green, #355a2c);
  font-size: calc(var(--avatar-size) * 0.38);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
}

.user-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
