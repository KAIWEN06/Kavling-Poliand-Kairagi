
<template>
  <ion-page>
    <!-- HEADER -->
    <ion-header class="ion-no-border">
      <ion-toolbar class="main-toolbar">
        <div class="header-content">
          <button class="back-button" @click="goBack">
            <ion-icon :icon="arrowBackOutline" />
          </button>

          <h1>Lainnya</h1>

          <button class="notification-button" @click="navigate('/marketing/notifikasi')">
            <ion-icon :icon="notificationsOutline" />
            <span v-if="hasNotification" class="notification-dot"></span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <!-- CONTENT -->
    <ion-content :fullscreen="true" class="main-content">

      <div class="content-wrapper">

        <!-- PROFILE CARD -->
        <div class="profile-card" @click="navigate('/marketing/profil')">
          <div class="profile-avatar">
            <img
              v-if="profile.avatar_url"
              :src="profile.avatar_url"
              alt="Avatar"
            />
            <span v-else>{{ initials }}</span>
          </div>

          <div class="profile-information">
            <h3>{{ profile.full_name || 'Marketing' }}</h3>
            <p class="profile-role">Marketing</p>
            <p class="profile-email">{{ profile.email || '-' }}</p>
          </div>

          <ion-icon
            :icon="chevronForward"
            class="profile-arrow"
          />
        </div>

        <!-- SECTION TITLE -->
        <h2 class="section-title">Menu Lainnya</h2>

        <!-- MENU LIST -->
        <div class="menu-list">

          <!-- INFORMASI PROYEK -->
          <button
            class="menu-card"
            @click="navigate('/informasi-proyek')"
          >
            <div class="menu-icon">
              <ion-icon :icon="business" />
            </div>

            <div class="menu-information">
              <h3>Informasi Proyek</h3>
              <p>Melihat informasi proyek perumahan poliland kairagi.</p>
            </div>

            <ion-icon :icon="chevronForward" class="menu-arrow" />
          </button>

          <!-- KONTAK -->
          <button
            class="menu-card"
            @click="navigate('/kontak')"
          >
            <div class="menu-icon">
              <ion-icon :icon="call" />
            </div>

            <div class="menu-information">
              <h3>Kontak</h3>
              <p>Melihat informasi kontak yang tersedia untuk kebutuhan pemasaran.</p>
            </div>

            <ion-icon :icon="chevronForward" class="menu-arrow" />
          </button>

          <!-- PROFIL -->
          <button
            class="menu-card"
            @click="navigate('/marketing/profil')"
          >
            <div class="menu-icon">
              <ion-icon :icon="person" />
            </div>

            <div class="menu-information">
              <h3>Profil saya</h3>
              <p>Melihat dan mengelola informasi akun marketing.</p>
            </div>

            <ion-icon :icon="chevronForward" class="menu-arrow" />
          </button>

          <!-- SYARAT DAN KETENTUAN -->
          <button
            class="menu-card"
            @click="navigate('/syarat-ketentuan')"
          >
            <div class="menu-icon">
              <ion-icon :icon="documentText" />
            </div>

            <div class="menu-information">
              <h3>Syarat & Ketentuan</h3>
              <p>Melihat syarat dan ketentuan penggunaan aplikasi.</p>
            </div>

            <ion-icon :icon="chevronForward" class="menu-arrow" />
          </button>

          <!-- KEBIJAKAN PRIVASI -->
          <button
            class="menu-card"
            @click="navigate('/kebijakan-privasi')"
          >
            <div class="menu-icon">
              <ion-icon :icon="shieldCheckmark" />
            </div>

            <div class="menu-information">
              <h3>Kebijakan Privasi</h3>
              <p>Melihat kebijakan privasi aplikasi.</p>
            </div>

            <ion-icon :icon="chevronForward" class="menu-arrow" />
          </button>

          <!-- LOGOUT -->
          <button
            class="menu-card logout-card"
            @click="confirmLogout"
            :disabled="isLoggingOut"
          >
            <div class="logout-icon">
              <ion-icon :icon="logOut" />
            </div>

            <div class="menu-information">
              <h3>Keluar</h3>
              <p>{{ isLoggingOut ? 'Sedang keluar...' : 'Keluar dari akun Marketing' }}</p>
            </div>

            <ion-icon :icon="chevronForward" class="logout-arrow" />
          </button>

        </div>
      </div>

      <!-- DECORATIVE LANDSCAPE -->
      <div class="landscape">
        <div class="hill hill-back"></div>
        <div class="hill hill-front"></div>
      </div>

    </ion-content>

    <MobileTabBar variant="marketing" />

  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  alertController,
  toastController
} from '@ionic/vue'

import {
  arrowBackOutline,
  notificationsOutline,
  chevronForward,
  business,
  call,
  person,
  documentText,
  shieldCheckmark,
  logOut,
} from 'ionicons/icons'

// Sesuaikan path dengan lokasi Supabase client milikmu
import { supabase } from '@/services/config/supabase'
import { authService } from '@/services/auth/authService'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

const router = useRouter()

const isLoggingOut = ref(false)
const hasNotification = ref(true)

const profile = ref({
  full_name: '',
  email: '',
  avatar_url: null
})

// INITIAL USER AVATAR
const initials = computed(() => {
  const name = profile.value.full_name || 'Marketing'

  return name
    .split(' ')
    .map(word => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

// GET PROFILE
const fetchProfile = async () => {
  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError) throw authError

    if (!user) {
      router.replace('/login')
      return
    }

    profile.value.email = user.email || ''

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (error) throw error

    if (data) {
      profile.value.full_name = data.full_name || ''
      profile.value.avatar_url = data.avatar_url || null
    }

  } catch (error) {
    console.error('Gagal mengambil profil:', error)
  }
}

// NAVIGATION
const navigate = (path) => {
  router.push(path)
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/beranda-marketing')
  }
}

// LOGOUT CONFIRMATION
const confirmLogout = async () => {
  const alert = await alertController.create({
    header: 'Keluar dari akun?',
    message: 'Apakah kamu yakin ingin keluar dari akun Marketing?',
    buttons: [
      {
        text: 'Batal',
        role: 'cancel'
      },
      {
        text: 'Keluar',
        role: 'destructive',
        handler: () => {
          logout()
        }
      }
    ]
  })

  await alert.present()
}

// LOGOUT SUPABASE
const logout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true

  try {
    await authService.logout()

    const toast = await toastController.create({
      message: 'Berhasil keluar dari akun.',
      duration: 1500,
      position: 'bottom',
      color: 'success'
    })

    await toast.present()

    router.replace('/login')

  } catch (error) {
    console.error('Logout gagal:', error)

    const toast = await toastController.create({
      message: 'Gagal keluar. Silakan coba lagi.',
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    })

    await toast.present()

  } finally {
    isLoggingOut.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
/* GENERAL */
.main-content {
  --background: #f7f7f5;
  --padding-bottom: 0;
}

.content-wrapper {
  position: relative;
  z-index: 2;
  padding: 10px 20px 155px;
}

/* HEADER */
.main-toolbar {
  --background: #ffffff;
  --min-height: 60px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.header-content {
  display: flex;
  align-items: center;
  height: 60px;
  gap: 14px;
}

.header-content h1 {
  font-size: 17px;
  font-weight: 700;
  color: #292929;
  margin: 0;
  flex: 1;
}

.back-button,
.notification-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #292929;
  padding: 4px;
  font-size: 25px;
}

.notification-button {
  font-size: 23px;
}

.notification-dot {
  position: absolute;
  top: 2px;
  right: 1px;
  height: 8px;
  width: 8px;
  border-radius: 50%;
  background: #f04444;
  border: 1px solid white;
}

/* PROFILE CARD */
.profile-card {
  height: 68px;
  display: flex;
  align-items: center;
  padding: 10px;
  gap: 9px;
  background: #fffaf5;
  border-radius: 9px;
  box-shadow: 0 2px 2px rgba(0,0,0,0.20);
  cursor: pointer;
}

.profile-avatar {
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f5ead4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #292929;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-information {
  flex: 1;
  min-width: 0;
}

.profile-information h3 {
  font-size: 12px;
  font-weight: 700;
  color: #111;
  margin: 0 0 2px;
}

.profile-role {
  font-size: 10px;
  font-weight: 600;
  margin: 0 0 3px;
  color: #333;
}

.profile-email {
  font-size: 10px;
  color: #777;
  margin: 0;
}

.profile-arrow {
  font-size: 20px;
  color: #111;
}

/* SECTION */
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111;
  margin: 14px 0 12px;
}

/* MENU */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-card {
  width: 100%;
  min-height: 65px;
  display: flex;
  align-items: center;
  padding: 10px;
  gap: 10px;
  border: none;
  border-radius: 9px;
  background: #ffffff;
  box-shadow: 0 2px 2px rgba(0,0,0,0.20);
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.menu-card:active {
  transform: scale(0.98);
}

.menu-icon {
  width: 39px;
  height: 39px;
  min-width: 39px;
  border-radius: 50%;
  background: #f5ead4;
  color: #c4a052;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
}

.menu-information {
  flex: 1;
  min-width: 0;
}

.menu-information h3 {
  font-size: 12px;
  font-weight: 700;
  color: #111;
  margin: 0 0 3px;
}

.menu-information p {
  font-size: 10px;
  font-weight: 400;
  color: #666;
  line-height: 1.35;
  margin: 0;
}

.menu-arrow {
  font-size: 20px;
  color: #111;
  flex-shrink: 0;
}

/* LOGOUT */
.logout-card {
  min-height: 64px;
  margin-top: 0;
  background: #fff0f0;
}

.logout-icon {
  width: 39px;
  height: 39px;
  min-width: 39px;
  border-radius: 50%;
  background: #ffdddd;
  color: #ff3030;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.logout-card .menu-information h3 {
  color: #ff3030;
}

.logout-arrow {
  font-size: 20px;
  color: #ff3030;
}

.logout-card:disabled {
  opacity: 0.6;
}

/* LANDSCAPE */
.landscape {
  position: absolute;
  z-index: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 180px;
  overflow: hidden;
  pointer-events: none;
}

.hill {
  position: absolute;
  width: 120%;
  left: -10%;
}

.hill-back {
  height: 140px;
  bottom: 38px;
  background: #e8e2cf;
  clip-path: polygon(
    0 30%, 12% 37%, 25% 44%,
    38% 57%, 52% 72%, 66% 85%,
    80% 91%, 100% 85%, 100% 100%, 0 100%
  );
}

.hill-front {
  height: 125px;
  bottom: 0;
  background: #96a28a;
  clip-path: polygon(
    0 20%, 12% 25%, 26% 39%,
    39% 54%, 52% 72%, 66% 85%,
    80% 91%, 100% 84%, 100% 100%, 0 100%
  );
}

</style>
