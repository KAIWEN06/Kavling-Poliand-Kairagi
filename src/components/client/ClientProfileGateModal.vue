<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
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
  <Teleport to="body">
    <div v-if="visible" class="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div class="gate-card">
        <IonIcon :icon="personCircleOutline" class="gate-icon" aria-hidden="true" />
        <h2 id="gate-title">Lengkapi data diri Anda</h2>
        <p>Data diri Anda belum lengkap. Lengkapi dulu agar saat membuat SPK, data pembeli terisi otomatis.</p>
        <button type="button" class="gate-btn" @click="goToAccount">Lengkapi Sekarang</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gate-backdrop { position: fixed; inset: 0; z-index: 20000; display: grid; place-items: center; padding: 16px; background: rgba(37, 37, 37, 0.55); }
.gate-card { width: min(100%, 380px); padding: 24px 20px; border-radius: 16px; background: var(--surface-primary, #fff); text-align: center; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2); }
.gate-icon { font-size: 52px; color: var(--poliland-green, #355a2c); }
h2 { margin: 8px 0; font-size: 18px; font-weight: 700; color: var(--text-primary, #252525); }
p { margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: var(--text-secondary, #63636a); }
.gate-btn { width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: var(--poliland-green, #355a2c); color: #fff; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; }
.gate-btn:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
</style>
