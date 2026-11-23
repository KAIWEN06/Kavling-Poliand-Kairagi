<template>
  <ion-page class="owner-page">
    <AppHeader variant="owner" title="PoliLand Kairagi" :show-back="false" />
    <ion-content class="owner-content">
      <main class="owner-shell">
        <section v-for="group in groups" :key="group.title" class="menu-group">
          <header class="group-heading"><span><ion-icon :icon="group.icon" /></span><div><h2>{{ group.title }}</h2><p>{{ group.description }}</p></div></header>
          <div class="menu-card">
            <button v-for="item in group.items" :key="item.title" type="button" class="menu-row" @click="openItem(item)">
              <span class="menu-icon" :class="item.tone"><ion-icon :icon="item.icon" /></span>
              <span class="menu-copy"><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
              <ion-icon class="arrow" :icon="chevronForwardOutline" />
            </button>
          </div>
        </section>
        <p class="version">PoliLand Kairagi · Versi aplikasi</p>
      </main>
    </ion-content>
    <MobileTabBar variant="owner" />
    <ion-modal :is-open="logoutAlert" class="owner-logout-modal" :backdrop-dismiss="true" @did-dismiss="logoutAlert = false">
      <section class="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
        <span class="logout-icon"><ion-icon :icon="logOutOutline" /></span>
        <h2 id="logout-title">Keluar dari akun?</h2>
        <p id="logout-description">Anda perlu masuk kembali untuk membuka dashboard Owner.</p>
        <div class="logout-actions"><button type="button" class="cancel-logout" @click="logoutAlert = false">Batal</button><button type="button" class="confirm-logout" @click="logout">Keluar</button></div>
      </section>
    </ion-modal>
    <ion-alert :is-open="infoAlert" :header="infoTitle" :message="infoMessage" :buttons="['Tutup']" @did-dismiss="infoAlert = false" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonAlert, IonContent, IonIcon, IonModal, IonPage } from '@ionic/vue'
import { barChartOutline, businessOutline, chevronForwardOutline, logOutOutline, mapOutline, peopleOutline, personAddOutline, personOutline, walletOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'

type MenuItem={title:string;description:string;icon:typeof businessOutline;tone:string;path?:string;action?:'logout'}
type MenuGroup={title:string;description:string;icon:typeof businessOutline;items:MenuItem[]}
const router=useRouter()
const logoutAlert=ref(false)
const infoAlert=ref(false)
const infoTitle=ref('')
const infoMessage=ref('')
const groups:MenuGroup[]=[
  {title:'Manajemen Data',description:'Pantau data utama dalam sistem.',icon:businessOutline,items:[{title:'Data Kavling',description:'Lihat data kavling dan ketersediaannya',icon:mapOutline,tone:'mint',path:'/owner/kavling'},{title:'Data Pembeli',description:'Daftar konsumen dan status pembelian',icon:personOutline,tone:'gold',path:'/owner/data/buyers'},{title:'Data Marketing',description:'Ringkasan prospek dan transaksi per marketing',icon:personAddOutline,tone:'rose',path:'/owner/data/marketing'}]},
  {title:'Laporan',description:'Lihat rekapitulasi dan perkembangan.',icon:barChartOutline,items:[{title:'Laporan Penjualan',description:'Rekapitulasi penjualan kavling',icon:barChartOutline,tone:'mint',path:'/owner/laporan'},{title:'Laporan Pembayaran',description:'Rekapitulasi pembayaran kavling',icon:walletOutline,tone:'gold',path:'/owner/laporan?tab=payments'},{title:'Laporan Pemasaran',description:'Aktivitas dan penjualan pemasaran',icon:peopleOutline,tone:'rose',path:'/owner/laporan?tab=marketing'}]},
  {title:'Akun',description:'Kelola sesi akun Anda.',icon:personOutline,items:[{title:'Keluar',description:'Keluar dari akun Owner',icon:logOutOutline,tone:'rose',action:'logout'}]},
]
async function openItem(item:MenuItem){if(item.action==='logout'){logoutAlert.value=true;return}if(item.path)await router.push(item.path)}
async function logout(){logoutAlert.value=false;try{await authService.logout();await router.replace('/login')}catch(error){infoTitle.value='Gagal keluar';infoMessage.value=error instanceof Error?error.message:'Silakan coba kembali.';infoAlert.value=true}}
</script>

<style scoped>
.owner-page,.owner-content{--background:#faf9f6;color:#302f2d;font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.owner-shell{display:grid;gap:19px;width:min(100%,760px);margin:auto;padding:16px 16px calc(100px + env(safe-area-inset-bottom,0px))}.menu-group{display:grid;gap:8px}.group-heading{display:flex;align-items:center;gap:9px;padding:0 3px}.group-heading>span{display:grid;width:28px;height:28px;place-items:center;border:1px solid #f5df9d;border-radius:8px;color:#c19a3f;background:#fffaf0;font-size:16px}.group-heading h2{margin:0;color:#c29b45;font-size:14px;font-weight:750}.group-heading p{margin:2px 0 0;color:#8a827b;font-size:10px}.menu-card{overflow:hidden;border:1px solid #efede9;border-radius:16px;background:#fff;box-shadow:0 6px 16px #2923190a}.menu-row{display:flex;width:100%;min-height:65px;align-items:center;gap:10px;padding:9px 12px;border:0;border-bottom:1px solid #f2f0ed;background:#fff;text-align:left;cursor:pointer}.menu-row:last-child{border-bottom:0}.menu-icon{display:grid;width:35px;height:35px;flex:0 0 auto;place-items:center;border-radius:11px;font-size:18px}.menu-icon.mint{color:#00946c;background:#e3faf2}.menu-icon.gold{color:#c09127;background:#fff6da}.menu-icon.rose{color:#ed3655;background:#fff0f2}.menu-copy{display:grid;min-width:0;flex:1;gap:3px}.menu-copy strong{overflow:hidden;color:#302f2d;font-size:12px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.menu-copy small{overflow:hidden;color:#99918b;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.arrow{flex:0 0 auto;color:#a6a09b;font-size:18px}.menu-row:has(.menu-icon.rose) .menu-copy strong{color:#d83043}.version{margin:0;padding:2px 0 12px;color:#a09a95;text-align:center;font-size:10px}@media(min-width:600px){.owner-shell{gap:24px;padding:24px 24px 120px}.menu-row{min-height:72px;padding:11px 15px}.group-heading h2{font-size:16px}}
ion-modal.owner-logout-modal{--width:min(92vw,420px);--height:auto;--border-radius:24px;--backdrop-opacity:.48}ion-modal.owner-logout-modal::part(content){border:1px solid var(--border-default,#eae7e0);border-radius:24px;background:#fff;box-shadow:0 20px 60px rgb(35 31 24 / 24%)}.logout-dialog{display:grid;justify-items:center;padding:28px 24px 22px;text-align:center;font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.logout-icon{display:grid;width:62px;height:62px;place-items:center;border-radius:20px;color:#b43a36;background:#fff0ed;font-size:27px}.logout-dialog h2{margin:15px 0 7px;color:var(--text-primary,#252525);font-size:19px;font-weight:750}.logout-dialog p{max-width:300px;margin:0;color:var(--text-secondary,#717178);font-size:13px;line-height:1.55}.logout-actions{display:grid;width:100%;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}.logout-actions button{min-height:46px;border-radius:13px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.cancel-logout{border:1px solid var(--border-default,#eae7e0);color:var(--text-primary,#252525);background:#fff}.confirm-logout{border:0;color:#fff;background:#b43a36}.logout-actions button:focus-visible{outline:3px solid rgb(203 160 68 / 45%);outline-offset:2px}
</style>
