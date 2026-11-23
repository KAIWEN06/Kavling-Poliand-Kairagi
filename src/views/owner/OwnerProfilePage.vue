<template>
  <ion-page class="owner-page">
    <AppHeader
      variant="owner"
      title="PoliLand Kairagi"
      :show-back="true"
      back-route="/beranda-owner"
      back-label="Profil Owner"
    />
    <ion-content class="owner-content">
      <main class="profile-shell">
        <header class="page-heading">
          <span>AKUN OWNER</span>
          <h1>Profil Owner</h1>
          <p>Informasi akun Owner yang terdaftar di sistem.</p>
        </header>

        <p v-if="loading" class="state" role="status">Memuat profil...</p>
        <section v-else-if="error" class="state error" role="alert">
          <p>{{ error }}</p>
          <button type="button" @click="loadProfile">Coba lagi</button>
        </section>
        <template v-else>
          <section class="profile-card">
            <span class="profile-avatar">
              <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" />
              <ion-icon v-else :icon="personCircleOutline" aria-hidden="true" />
            </span>
            <div class="profile-name">
              <strong>{{ profile.fullName || 'Owner' }}</strong>
              <span>Owner PoliLand Kairagi</span>
            </div>
          </section>

          <section class="profile-details">
            <h2>Informasi Owner</h2>
            <dl>
              <div><dt>Nama lengkap</dt><dd>{{ profile.fullName || 'Belum tercatat' }}</dd></div>
              <div><dt>Email</dt><dd>{{ profile.email || 'Belum tercatat' }}</dd></div>
            </dl>
          </section>
        </template>
      </main>
    </ion-content>
    <MobileTabBar variant="owner" />
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { personCircleOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'

type OwnerProfile = {
  fullName: string
  email: string
  avatarUrl: string
}

const loading = ref(true)
const error = ref('')
const profile = ref<OwnerProfile>({
  fullName: '',
  email: '',
  avatarUrl: '',
})

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''
}

function getErrorMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
    return cause.message
  }
  return 'Profil Owner tidak dapat dimuat. Silakan coba lagi.'
}

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const user = await authService.getCurrentUser()
    if (!user) throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali.')

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) throw profileError

    const row = (data ?? {}) as Record<string, unknown>
    const metadata = user.user_metadata ?? {}
    profile.value = {
      fullName: firstString(row.full_name, metadata.full_name, metadata.name),
      email: user.email ?? '',
      avatarUrl: firstString(row.avatar_url, metadata.avatar_url, metadata.picture),
    }
  } catch (cause) {
    error.value = getErrorMessage(cause)
  } finally {
    loading.value = false
  }
}

onMounted(() => void loadProfile())
</script>

<style scoped>
.owner-page,.owner-content{--background:var(--app-background,#faf9f6);color:var(--text-primary,#252525);font-family:var(--font-primary,var(--ion-font-family,sans-serif))}
.profile-shell{display:grid;gap:14px;width:min(100%,760px);margin:auto;padding:18px 16px calc(120px + env(safe-area-inset-bottom,0px))}
.page-heading span{color:var(--poliland-gold-text-soft,#805708);font-size:10px;font-weight:750;letter-spacing:.08em}
.page-heading h1{margin:5px 0;color:var(--text-primary,#252525);font-size:22px}
.page-heading p{margin:0;color:var(--text-secondary,#717178);font-size:12px;line-height:1.5}
.profile-card,.profile-details,.state{padding:16px;border:1px solid var(--border-default,#eae7e0);border-radius:14px;background:#fff}
.profile-card{display:flex;align-items:center;gap:12px}
.profile-avatar{display:grid;width:54px;height:54px;flex:0 0 auto;place-items:center;overflow:hidden;border-radius:50%;color:var(--poliland-gold-text-soft,#805708);background:var(--poliland-gold-soft,#f4d69a);font-size:38px}
.profile-avatar img{width:100%;height:100%;object-fit:cover}
.profile-name{display:grid;gap:4px}
.profile-name strong{color:var(--text-primary,#252525);font-size:15px}
.profile-name span{color:var(--text-secondary,#717178);font-size:11px}
.profile-details h2{margin:0 0 9px;color:var(--text-primary,#252525);font-size:14px}
.profile-details dl{display:grid;gap:0;margin:0}
.profile-details dl div{display:grid;grid-template-columns:minmax(100px,.8fr) minmax(0,1.2fr);gap:10px;padding:11px 0;border-top:1px solid #f0efec}
.profile-details dt{color:var(--text-secondary,#717178);font-size:11px}
.profile-details dd{margin:0;overflow-wrap:anywhere;color:var(--text-primary,#252525);font-size:11px;font-weight:600;text-align:right}
.state{margin:0;color:var(--text-secondary,#717178);text-align:center;font-size:12px}
.state.error{color:#a83838}
.state p{margin:0 0 8px}
.state button{border:0;color:var(--poliland-green,#355a2c);background:transparent;font:inherit;font-weight:700}
</style>
