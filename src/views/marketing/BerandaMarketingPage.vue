```vue
<template>
  <ion-page class="marketing-page">
    <!-- HEADER -->
    <AppHeader
      variant="marketing"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content
      :fullscreen="false"
      class="marketing-content"
    >
      <main class="dashboard-container">

        <!-- ==========================================
             WELCOME
             ========================================== -->

        <section class="welcome-section">

          <p class="welcome-label">
            Selamat datang,
          </p>

          <h1 class="marketing-name">
            {{ marketingName }}
          </h1>

          <p class="role-label">
            Marketing
          </p>

        </section>


        <!-- ==========================================
             COMMISSION
             ========================================== -->

        <MarketingCommission
          :total="totalCommission"
          @click="goToCommission"
        />


        <!-- ==========================================
             MENU
             ========================================== -->

        <MarketingMenu
          @kavling="goTo('/kavling')"
          @siteplan="goTo('/siteplan')"
          @clients="goTo('/marketing/clients')"
          @followup="goTo('/marketing/tindak-lanjut')"
          @project="goTo('/progress')"
          @contact="goTo('/contact')"
        />


        <!-- ==========================================
             RECENT ACTIVITY
             ========================================== -->

        <MarketingActivity
          :activities="activities"
          @view-all="goTo('/marketing/tindak-lanjut')"
        />


        <!-- ==========================================
             DECORATION
             ========================================== -->

        <div class="bottom-decoration">

          <div class="wave wave-cream"></div>

          <div class="wave wave-green"></div>

        </div>

      </main>
    </ion-content>


    <!-- ==========================================
         MARKETING BOTTOM NAVIGATION
         ========================================== -->

    <MobileTabBar variant="marketing" />

  </ion-page>
</template>


<script setup lang="ts">

import {
  IonPage,
  IonContent,
  useIonRouter,
} from '@ionic/vue'

import {
  onMounted,
  ref,
} from 'vue'

import AppHeader
  from '@/components/common/AppHeader.vue'

import MobileTabBar
  from '@/components/common/MobileTabBar.vue'

import {
  supabase,
} from '@/services/config/supabase'


import MarketingCommission
  from '@/components/marketing/MarketingCommission.vue'

import MarketingMenu
  from '@/components/marketing/MarketingMenu.vue'

import MarketingActivity
  from '@/components/marketing/MarketingActivity.vue'


/* =====================================================
   ROUTER
   ===================================================== */

const ionRouter = useIonRouter()


/* =====================================================
   USER
   ===================================================== */

const marketingName = ref('Marketing')

async function loadMarketingName() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw userError
    }

    if (!user) {
      throw new Error('Pengguna marketing tidak ditemukan.')
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    const fullName = profile?.full_name?.trim()
    if (fullName) {
      marketingName.value = fullName
    }
  } catch (error) {
    console.error(
      '[Beranda Marketing] Gagal memuat nama profil:',
      error,
    )
  }
}


/* =====================================================
   COMMISSION
   ===================================================== */

const totalCommission = 2750000


/* =====================================================
   RECENT ACTIVITY
   ===================================================== */

const activities = [

  {
    id: 1,

    initials: 'BS',

    name: 'Budi Santoso',

    description: 'Follow-up dilakukan',

    status: 'Tindak Lanjut',

    statusType: 'followup',

    time: '2 jam',
  },

  {
    id: 2,

    initials: 'LO',

    name: 'LOT-023',

    description: 'Status berubah menjadi Booking',

    status: 'Booking',

    statusType: 'booking',

    time: '5 jam',
  },

  {
    id: 3,

    initials: 'RM',

    name: 'Rini Mandagi',

    description: 'Calon pembeli baru',

    status: 'Prospek',

    statusType: 'prospect',

    time: '1 hari',
  },

]

onMounted(() => {
  loadMarketingName()
})


/* =====================================================
   NAVIGATION
   ===================================================== */

function goTo(path: string) {

  ionRouter.push(path)

}


function goToCommission() {

  ionRouter.push(
    '/beranda-marketing'
  )

}

</script>


<style scoped>

/* =====================================================
   ROOT
   ===================================================== */

.marketing-page {

  --background: #f7f7f5;

  background: #f7f7f5;

  color: #2d2d2d;

}


/* =====================================================
   CONTENT
   ===================================================== */

.marketing-content {

  --background: #f7f7f5;

  background: #f7f7f5;

}


.marketing-content::part(scroll) {

  overflow-x: hidden;

}


/* =====================================================
   MAIN CONTAINER
   ===================================================== */

.dashboard-container {

  position: relative;

  width: 100%;

  max-width: 430px;

  min-height: 100%;

  box-sizing: border-box;

  margin: 0 auto;

  padding-top:
    clamp(32px, 9vw, 48px);

  padding-right:
    clamp(16px, 6vw, 24px);

  padding-bottom:
    clamp(150px, 38vw, 175px);

  padding-left:
    clamp(16px, 6vw, 24px);

  overflow: hidden;

}


/* =====================================================
   WELCOME
   ===================================================== */

.welcome-section {

  position: relative;

  z-index: 2;

  width: 100%;

  margin-bottom:
    clamp(20px, 5vw, 28px);

}


.welcome-label {

  margin: 0 0 10px;

  color: #707070;

  font-size:
    clamp(14px, 4vw, 16px);

  line-height: 1.2;

  font-weight: 500;

}


.marketing-name {

  width: 100%;

  margin: 0;

  color: #090909;

  /*
   * Tidak menggunakan 40px fixed.
   * Ukuran mengikuti viewport.
   */

  font-size:
    clamp(32px, 10vw, 40px);

  line-height: 1.02;

  font-weight: 800;

  letter-spacing:
    clamp(-1.3px, -0.3vw, -0.8px);

  /*
   * Browser boleh melakukan wrapping
   * secara natural.
   */

  overflow-wrap: break-word;

  word-break: normal;

}


.role-label {

  margin:
    clamp(8px, 2.5vw, 10px)
    0
    0;

  color: #6b6b6b;

  font-size:
    clamp(14px, 4.2vw, 17px);

  line-height: 1.2;

  font-weight: 500;

}


/* =====================================================
   RESPONSIVE COMMISSION
   ===================================================== */

/*
 * MarketingCommission.vue mempunyai width 100%.
 *
 * Di sini kita override spacing internal
 * supaya tidak terjadi:
 *
 * Rp 2.750.000 Lihat Detail
 *        overlap
 *
 * pada layar kecil.
 */

:deep(.commission-card) {

  width: 100%;

  min-width: 0;

  box-sizing: border-box;

  gap: clamp(8px, 2vw, 16px);

}


:deep(.commission-content) {

  min-width: 0;

  flex: 1;

}


:deep(.commission-value) {

  /*
   * Nominal tidak boleh memaksa card
   * menjadi lebih lebar.
   */

  max-width: 100%;

  font-size:
    clamp(22px, 7.2vw, 31px);

  letter-spacing:
    clamp(-0.8px, -0.2vw, -0.4px);

}


:deep(.commission-action) {

  flex-shrink: 0;

  font-size:
    clamp(11px, 3.2vw, 15px);

}


/* =====================================================
   MENU RESPONSIVE
   ===================================================== */

:deep(.menu-section) {

  width: 100%;

  min-width: 0;

  /*
   * Tetap 3 kolom pada mobile normal.
   */

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap:
    clamp(8px, 3.5vw, 16px);

}


:deep(.menu-card) {

  min-width: 0;

  width: 100%;

  height:
    clamp(125px, 37vw, 148px);

  box-sizing: border-box;

  padding:
    clamp(10px, 3vw, 14px)
    clamp(4px, 2vw, 8px);

}


:deep(.menu-icon) {

  width:
    clamp(36px, 11vw, 45px);

  height:
    clamp(36px, 11vw, 45px);

  flex-shrink: 0;

}


:deep(.menu-icon ion-icon) {

  font-size:
    clamp(30px, 9vw, 38px);

}


:deep(.menu-card span) {

  width: 100%;

  max-width: 100%;

  /*
   * Teks boleh turun menjadi 2 baris,
   * tetapi tidak akan keluar dari card.
   */

  font-size:
    clamp(11px, 3.5vw, 14px);

  line-height: 1.12;

  overflow-wrap: break-word;

  word-break: normal;

}


/* =====================================================
   ACTIVITY RESPONSIVE
   ===================================================== */

:deep(.activity-section) {

  width: 100%;

  min-width: 0;

}


:deep(.activity-header) {

  min-width: 0;

  gap: 8px;

}


:deep(.activity-header h2) {

  min-width: 0;

  font-size:
    clamp(20px, 6.5vw, 25px);

}


:deep(.view-all-button) {

  flex-shrink: 0;

  font-size:
    clamp(11px, 3.3vw, 14px);

}


:deep(.activity-card) {

  min-width: 0;

  width: 100%;

  box-sizing: border-box;

  gap:
    clamp(8px, 3vw, 14px);

  padding:
    clamp(12px, 4vw, 16px);

}


:deep(.activity-avatar) {

  width:
    clamp(40px, 13vw, 50px);

  height:
    clamp(40px, 13vw, 50px);

  flex-shrink: 0;

  font-size:
    clamp(11px, 3.5vw, 15px);

}


:deep(.activity-info) {

  min-width: 0;

  flex: 1;

}


:deep(.activity-info h3) {

  min-width: 0;

  max-width: 100%;

  font-size:
    clamp(13px, 4vw, 16px);

}


:deep(.activity-info p) {

  min-width: 0;

  max-width: 100%;

  font-size:
    clamp(10px, 3.2vw, 13px);

}


:deep(.activity-right) {

  flex-shrink: 1;

  min-width: 0;

}


:deep(.activity-status) {

  min-width: 0;

  max-width: 100%;

  padding:
    clamp(7px, 2vw, 9px)
    clamp(7px, 2.5vw, 13px);

  font-size:
    clamp(9px, 3vw, 13px);

}


:deep(.activity-time) {

  font-size:
    clamp(9px, 2.8vw, 12px);

}


/* =====================================================
   BOTTOM DECORATION
   ===================================================== */

.bottom-decoration {

  position: absolute;

  z-index: 0;

  left: -100px;

  right: -100px;

  bottom: 0;

  height:
    clamp(220px, 65vw, 310px);

  pointer-events: none;

  overflow: hidden;

}


.wave {

  position: absolute;

  left: -15%;

  width: 130%;

  border-radius:
    50% 50% 0 0;

}


.wave-cream {

  bottom:
    clamp(55px, 18vw, 82px);

  height:
    clamp(150px, 48vw, 190px);

  background: #e8e1cd;

  transform:
    rotate(-7deg)
    translateY(30px);

}


.wave-green {

  bottom: -25px;

  height:
    clamp(150px, 48vw, 190px);

  background: #9ba88f;

  transform:
    rotate(-9deg)
    translateY(35px);

}


/* =====================================================
   SMALL MOBILE
   <= 360px
   ===================================================== */

@media (max-width: 360px) {

  .dashboard-container {

    padding-top: 30px;

    padding-right: 14px;

    padding-left: 14px;

    padding-bottom: 140px;

  }


  .welcome-section {

    margin-bottom: 20px;

  }


  .marketing-name {

    font-size:
      clamp(29px, 10vw, 34px);

    letter-spacing: -0.8px;

  }


  /*
   * Card komisi dibuat vertikal.
   *
   * Ini yang paling penting untuk
   * mencegah nominal bertabrakan
   * dengan "Lihat Detail".
   */

  :deep(.commission-card) {

    min-height: auto;

    align-items: flex-start;

    flex-direction: column;

    gap: 10px;

    padding:
      18px;

  }


  :deep(.commission-label) {

    margin-bottom: 7px;

    font-size: 14px;

  }


  :deep(.commission-value) {

    font-size:
      clamp(24px, 8vw, 28px);

  }


  :deep(.commission-action) {

    width: 100%;

    justify-content: flex-end;

    margin-top: 0;

    font-size: 12px;

  }


  /*
   * Menu menjadi 2 kolom.
   *
   * Ini lebih baik daripada memaksakan
   * 3 card kecil yang teksnya berdesakan.
   */

  :deep(.menu-section) {

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 10px;

  }


  :deep(.menu-card) {

    height: 130px;

  }


  :deep(.menu-card span) {

    font-size: 12px;

  }


  /*
   * Aktivitas pada layar kecil
   */

  :deep(.activity-card) {

    display: grid;

    grid-template-columns:
      auto
      minmax(0, 1fr);

    align-items: center;

  }


  :deep(.activity-right) {

    grid-column:
      2;

    align-items: flex-start;

    margin-top: -3px;

  }


}


/* =====================================================
   VERY SMALL MOBILE
   <= 320px
   ===================================================== */

@media (max-width: 320px) {

  .dashboard-container {

    padding-right: 12px;

    padding-left: 12px;

  }


  .marketing-name {

    font-size: 28px;

  }


  :deep(.commission-card) {

    padding: 16px;

    border-radius: 16px;

  }


  :deep(.commission-value) {

    font-size: 23px;

  }


  :deep(.menu-section) {

    gap: 8px;

  }


  :deep(.menu-card) {

    height: 120px;

    border-radius: 15px;

  }


  :deep(.menu-icon) {

    width: 34px;

    height: 34px;

  }


  :deep(.menu-icon ion-icon) {

    font-size: 29px;

  }


  :deep(.menu-card span) {

    font-size: 11px;

  }


  :deep(.activity-header h2) {

    font-size: 19px;

  }


  :deep(.view-all-button) {

    font-size: 10px;

  }


}


/* =====================================================
   EXTREMELY SMALL DEVICES
   <= 280px
   ===================================================== */

@media (max-width: 280px) {

  .dashboard-container {

    padding-right: 10px;

    padding-left: 10px;

  }


  /*
   * Pada layar yang sangat kecil,
   * menu 1 kolom lebih aman daripada
   * memaksakan teks bertumpuk.
   */

  :deep(.menu-section) {

    grid-template-columns:
      1fr;

  }


  :deep(.menu-card) {

    height: 90px;

    flex-direction: row;

    justify-content: flex-start;

    padding:
      12px
      18px;

  }


  :deep(.menu-card span) {

    text-align: left;

    font-size: 13px;

  }


  /*
   * Header juga diperkecil
   */

  :deep(.marketing-title) {

    font-size: 19px;

  }


  :deep(.back-button),
  :deep(.notification-button) {

    width: 36px;

    height: 36px;

  }


}


/* =====================================================
   LANDSCAPE MOBILE
   ===================================================== */

@media (
  max-height: 500px
) and (
  orientation: landscape
) {

  .dashboard-container {

    padding-top: 20px;

    padding-bottom: 120px;

  }


  .welcome-section {

    margin-bottom: 16px;

  }


  .marketing-name {

    font-size: 30px;

  }


  :deep(.menu-card) {

    height: 105px;

  }

}

</style>
```