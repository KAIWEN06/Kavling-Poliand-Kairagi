import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import HomePage from '@/views/HomePage.vue'
import SiteplanPage from '@/views/SiteplanPage.vue'
import ProgressPage from '@/views/ProgressPage.vue'
import ProgressDetailPage from '@/views/ProgressDetailPage.vue'
import GalleryPage from '@/views/GalleryPage.vue'
import ContactPage from '@/views/ContactPage.vue'
import PanoramaPage from '@/views/PanoramaPage.vue'
import NotFoundPage from '@/views/NotFoundPage.vue'
import MaintenancePage from '@/views/MaintenancePage.vue'
import SplashVideoPage from '@/components/common/SplashVideoPage.vue'

import LoginPage from '@/views/auth/LoginPage.vue'
import ForgotPasswordPage from '@/views/auth/ForgotPasswordPage.vue'
import ResetPasswordPage from '@/views/auth/ResetPasswordPage.vue'
import RegisterPage from '@/views/auth/RegisterPage.vue'
import AuthCallbackPage from '@/views/auth/AuthCallbackPage.vue'
import BerandaAdminPage from '@/views/Admin/AdminDashboard.vue'
import AdminAksesTimPage from '@/views/Admin/AdminAksesTim.vue'
import AdminKavlingPage from '@/views/Admin/AdminKavling.vue'
import AdminKavlingDetailPage from '@/views/Admin/AdminDetailKavling.vue'
import AdminPembeliPage from '@/views/Admin/AdminPembeli.vue'
import AdminPembeliDetailPage from '@/views/Admin/AdminPembeliDetail.vue'
import AdminKeuanganPage from '@/views/Admin/AdminKeuangan.vue'
import AdminLainnyaPage from '@/views/Admin/AdminLainnya.vue'
import AdminContentPage from '@/views/Admin/AdminContentPage.vue'
import SPKAdminPage from '@/views/Admin/SPKAdminPage.vue'
import AdminReviewsPage from '@/views/Admin/AdminReviewsPage.vue'
import TinjauSPKPage from '@/views/Admin/TinjauSPKPage.vue'
import BerandaMarketingPage from '@/views/marketing/BerandaMarketingPage.vue'
import KavlingMarketingPage from '@/views/marketing/KavlingMarketingPage.vue'
import CalonPembeliMarketingPage from '@/views/marketing/CalonPembeliMarketingPage.vue'
import TambahCalonPembeliPage from '@/views/marketing/TambahCalonPembeli.vue'
import DetailCalonPembeliPage from '@/views/marketing/DetailCalonPembeliPage.vue'
import SPKMarketingPage from '@/views/marketing/SPKMarketingPage.vue'
import TindakLanjutPage from '@/views/marketing/TindakLanjutPage.vue'
import LainnyaPage from '@/views/marketing/LainnyaPage.vue'
import MarketingInfoPage from '@/views/marketing/MarketingInfoPage.vue'
import MarketingSpkStatusPage from '@/views/marketing/MarketingSpkStatusPage.vue'
import MarketingPaymentsPage from '@/views/marketing/MarketingPaymentsPage.vue'
import MarketingCommissionPage from '@/views/marketing/MarketingCommissionPage.vue'
import HeadDashboardPage from '@/views/marketing-head/HeadDashboardPage.vue'
import HeadClientsPage from '@/views/marketing-head/HeadClientsPage.vue'
import HeadClientDetailPage from '@/views/marketing-head/HeadClientDetailPage.vue'
import HeadCrmPage from '@/views/marketing-head/HeadCrmPage.vue'
import HeadSpkPage from '@/views/marketing-head/HeadSpkPage.vue'
import HeadPaymentsPage from '@/views/marketing-head/HeadPaymentsPage.vue'
import HeadReportsPage from '@/views/marketing-head/HeadReportsPage.vue'
import HeadCommissionPage from '@/views/marketing-head/HeadCommissionPage.vue'
import HeadMorePage from '@/views/marketing-head/HeadMorePage.vue'
import BerandaOwnerPage from '@/views/owner/BerandaOwnerPage.vue'
import KavlingOwnerPage from '@/views/owner/KavlingOwnerPage.vue'
import OwnerSiteplanPage from '@/views/owner/OwnerSiteplanPage.vue'
import StatistikOwnerPage from '@/views/owner/StatistikOwnerPage.vue'
import LaporanOwnerPage from '@/views/owner/LaporanOwnerPage.vue'
import LainnyaOwnerPage from '@/views/owner/LainnyaOwnerPage.vue'
import OwnerProfilePage from '@/views/owner/OwnerProfilePage.vue'
import OwnerDataPage from '@/views/owner/OwnerDataPage.vue'
import BerandaClientPage from '@/views/client/BerandaClientPage.vue'
import PembayaranClientPage from '@/views/client/PembayaranClientPage.vue' 
import AkunPage from '@/views/account/AkunPage.vue'
import DokumenClientPage from '@/views/client/DokumenClientPage.vue'
import KavlingClientPage from '@/views/client/KavlingClientPage.vue'
import KavlingClientDetailPage from '@/views/client/KavlingClientDetailPage.vue'
import SPKClientPage from '@/views/client/SPKClientPage.vue'
import SettingsPage from '@/views/account/SettingsPage.vue'
import { setupAuthGuards } from '@/router/guards'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/splash' },

  {
    path: '/splash',
    name: 'Splash',
    component: SplashVideoPage,
  },

  // Authentication pages
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { publicOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
    meta: { publicOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPasswordPage,
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPasswordPage,
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: AuthCallbackPage,
  },

  // Role-specific landing pages.
  {
    path: '/beranda-admin',
    name: 'BerandaAdmin',
    component: BerandaAdminPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/kavling',
    name: 'AdminKavling',
    component: AdminKavlingPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/kavling/:id',
    name: 'AdminKavlingDetail',
    component: AdminKavlingDetailPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/pembeli',
    name: 'AdminPembeli',
    component: AdminPembeliPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/pembeli/:id',
    name: 'AdminPembeliDetail',
    component: AdminPembeliDetailPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/pembeli/:id/edit',
    name: 'AdminPembeliEdit',
    component: DetailCalonPembeliPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/keuangan',
    name: 'AdminKeuangan',
    component: AdminKeuanganPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/lainnya',
    name: 'AdminLainnya',
    component: AdminLainnyaPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/konten',
    name: 'AdminKonten',
    component: AdminContentPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/ulasan',
    name: 'AdminUlasan',
    component: AdminReviewsPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/akses-tim',
    name: 'AdminAksesTim',
    component: AdminAksesTimPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/spk',
    name: 'AdminSPK',
    component: SPKAdminPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/siteplan',
    name: 'AdminSiteplan',
    component: SiteplanPage,
    props: { variant: 'admin' },
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/spk/:spkId/tinjau',
    name: 'AdminTinjauSPK',
    component: TinjauSPKPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/beranda-marketing',
    name: 'BerandaMarketing',
    component: BerandaMarketingPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  // ---------------------------------------------------------------
  // Kepala Bagian — Departemen Marketing (profiles.role = 'marketing_head')
  // ---------------------------------------------------------------
  {
    path: '/beranda-kepala-marketing',
    name: 'BerandaKepalaMarketing',
    component: HeadDashboardPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  { path: '/kepala-marketing', redirect: '/beranda-kepala-marketing' },
  {
    path: '/kepala-marketing/clients',
    name: 'HeadClients',
    component: HeadClientsPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/clients/new',
    name: 'HeadAddClient',
    component: TambahCalonPembeliPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/clients/:id',
    name: 'HeadClientDetail',
    component: HeadClientDetailPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/perkembangan',
    name: 'HeadCrm',
    component: HeadCrmPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/spk',
    name: 'HeadSpk',
    component: HeadSpkPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/pembayaran',
    name: 'HeadPayments',
    component: HeadPaymentsPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/laporan',
    name: 'HeadReports',
    component: HeadReportsPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/komisi',
    name: 'HeadCommission',
    component: HeadCommissionPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/lainnya',
    name: 'HeadMore',
    component: HeadMorePage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/kepala-marketing/siteplan',
    name: 'HeadSiteplan',
    component: SiteplanPage,
    meta: { requiresAuth: true, role: 'marketing_head' },
  },
  {
    path: '/marketing/pengajuan',
    name: 'MarketingSpkStatus',
    component: MarketingSpkStatusPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/pembayaran',
    name: 'MarketingPayments',
    component: MarketingPaymentsPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/komisi',
    name: 'MarketingCommission',
    component: MarketingCommissionPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/kavling',
    name: 'KavlingMarketing',
    component: KavlingMarketingPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/clients',
    name: 'CalonPembeli',
    component: CalonPembeliMarketingPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/clients/new',
    name: 'TambahCalonPembeli',
    component: TambahCalonPembeliPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/clients/:id',
    name: 'DetailCalonPembeli',
    component: DetailCalonPembeliPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/tindak-lanjut',
    name: 'TindakLanjutMarketing',
    component: TindakLanjutPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/more',
    alias: '/marketing/lainnya',
    name: 'LainnyaMarketing',
    component: LainnyaPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/informasi-proyek',
    name: 'InformasiProyek',
    component: MarketingInfoPage,
    props: {
      title: 'Informasi Proyek',
      description: 'Informasi dan perkembangan proyek perumahan Poliland Kairagi.',
    },
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/kontak',
    name: 'KontakMarketing',
    component: MarketingInfoPage,
    props: {
      title: 'Kontak',
      description: 'Hubungi tim Poliland untuk informasi pemasaran dan dukungan.',
    },
    meta: { requiresAuth: true, role: 'marketing' },
  },
  // Profil & Pengaturan dipakai bersama oleh semua role (tanpa meta.role).
  { path: '/akun', name: 'Akun', component: AkunPage, meta: { requiresAuth: true } },
  { path: '/profil', redirect: '/akun' },
  { path: '/pengaturan', name: 'Pengaturan', component: SettingsPage, meta: { requiresAuth: true } },
  { path: '/marketing/profil', redirect: '/akun' },
  {
    path: '/syarat-ketentuan',
    name: 'SyaratKetentuan',
    component: MarketingInfoPage,
    props: {
      title: 'Syarat & Ketentuan',
      description: 'Syarat dan ketentuan penggunaan aplikasi Poliland.',
    },
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/kebijakan-privasi',
    name: 'KebijakanPrivasi',
    component: MarketingInfoPage,
    props: {
      title: 'Kebijakan Privasi',
      description: 'Informasi tentang pengelolaan dan perlindungan data pengguna.',
    },
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
    path: '/marketing/spk',
    name: 'SPKMarketing',
    component: SPKMarketingPage,
    meta: { requiresAuth: true, role: 'marketing' },
  },
  {
  path: '/beranda-client',
  name: 'BerandaClient',
  component: BerandaClientPage,
  },
  {
    path: '/beranda-owner',
    name: 'BerandaOwner',
    component: BerandaOwnerPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/kavling',
    name: 'KavlingOwner',
    component: KavlingOwnerPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/siteplan',
    name: 'OwnerSiteplan',
    component: OwnerSiteplanPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/statistik',
    name: 'StatistikOwner',
    component: StatistikOwnerPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/laporan',
    name: 'LaporanOwner',
    component: LaporanOwnerPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/lainnya',
    name: 'LainnyaOwner',
    component: LainnyaOwnerPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/profil',
    name: 'OwnerProfile',
    component: OwnerProfilePage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/owner/data/:kind',
    name: 'OwnerData',
    component: OwnerDataPage,
    meta: { requiresAuth: true, role: 'owner' },
  },
  {
    path: '/client/kavling',
    name: 'KavlingClient',
    component: KavlingClientPage,
  },
  {
    path: '/client/kavling/:id',
    name: 'KavlingClientDetail',
    component: KavlingClientDetailPage,
  },
  {
    path: '/client/spk',
    name: 'SPKClient',
    component: SPKClientPage,
  },
  {
    path: '/client/akun',
    redirect: '/akun',
  },
  {
    path: '/client/dokumen',
    name: 'DokumenClient',
    component: DokumenClientPage,
  },
  {
    path: '/client/pembayaran',
    alias: '/pembayaran-client',
    name: 'PembayaranClient',
    component: PembayaranClientPage,
  },
  {
    path: '/marketing',
    redirect: '/beranda-marketing',
  },
  {
    path: '/marketing/lots',
    redirect: '/kavling',
  },
  {
    path: '/marketing/customers',
    redirect: '/marketing/clients',
  },
  {
    path: '/marketing/calon-pembeli/tambah',
    redirect: '/marketing/clients/new',
  },
  {
    path: '/marketing/follow-up',
    redirect: '/marketing/tindak-lanjut',
  },
  {
    path: '/marketing/followups',
    redirect: '/marketing/tindak-lanjut',
  },
  {
    path: '/marketing/activity',
    redirect: '/beranda-marketing',
  },
  {
    path: '/marketing/commission',
    redirect: '/marketing/komisi',
  },
  {
    path: '/marketing/riwayat-pembayaran',
    redirect: '/marketing/pembayaran',
  },

  // Maintenance page
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: MaintenancePage,
  },

  // Public marketing website
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: 'home', name: 'Home', component: HomePage },
      { path: 'siteplan', name: 'Siteplan', component: SiteplanPage },
      { path: 'progress', name: 'Progress', component: ProgressPage },
      { path: 'progress/:id', name: 'ProgressDetails', component: ProgressDetailPage },
      { path: 'gallery', name: 'Gallery', component: GalleryPage },
      { path: 'contact', name: 'Contact', component: ContactPage },
    ],
  },

  // Panorama remains fullscreen outside MainLayout.
  { path: '/panorama/:lotId', name: 'Panorama', component: PanoramaPage },

  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundPage },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupAuthGuards(router)

export default router
