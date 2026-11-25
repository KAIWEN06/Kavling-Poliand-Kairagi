<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import AppModal from '@/components/ui/AppModal.vue'
import { personCircleOutline } from 'ionicons/icons'
import { supabase } from '@/services/config/supabase'
import { useClientProfileGate } from '@/composables/useClientProfileGate'

const route = useRoute()
const router = useRouter()
const { needsCompletion, check } = useClientProfileGate()

const onAccountPage = computed(() => route.path === '/client/akun')
const visible = computed(() => needsCompletion.value && !onAccountPage.value && route.path.startsWith('/client'))

onMounted(() => {
  void check()
  supabase.auth.onAuthStateChange((event) => {
    // Ditunda agar tidak memanggil Supabase di dalam callback auth.
    if (event === 'SIGNED_IN') setTimeout(() => void check(), 0)
  })
})
// Cek ulang saat pindah halaman client (mis. setelah login pertama).
watch(() => route.path, (path) => { if (path.startsWith('/client')) void check() })

function goToAccount() { void router.push('/client/akun') }
</script>

<template>
  <AppModal
    :model-value="visible"
    title="Lengkapi data diri Anda"
    variant="dialog"
    :show-close="false"
    :show-cancel="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    confirm-text="Lengkapi"
    max-width="380px"
    @confirm="goToAccount"
  >
    <div class="gate-body">
      <IonIcon :icon="personCircleOutline" class="gate-icon" aria-hidden="true" />
      <p>Data diri Anda belum lengkap. Lengkapi dulu agar saat membuat SPK, data pembeli terisi otomatis.</p>
    </div>
  </AppModal>
</template>

<style scoped>
.gate-body { display: grid; justify-items: center; gap: 8px; text-align: center; }
.gate-icon { font-size: 52px; color: var(--poliland-green, #355a2c); }
p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary, #5f5f66); }
</style>
