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
import AdminKavlingPage from '@/views/Admin/AdminKavling.vue'
import AdminKeuanganPage from '@/views/Admin/AdminKeuangan.vue'
import BerandaMarketingPage from '@/views/marketing/BerandaMarketingPage.vue'
import KavlingMarketingPage from '@/views/marketing/KavlingMarketingPage.vue'
import CalonPembeliMarketingPage from '@/views/marketing/CalonPembeliMarketingPage.vue'
import TambahCalonPembeliPage from '@/views/marketing/TambahCalonPembeli.vue'
import DetailCalonPembeliPage from '@/views/marketing/DetailCalonPembeliPage.vue'
import SPKMarketingPage from '@/views/marketing/SPKMarketingPage.vue'
import TindakLanjutPage from '@/views/marketing/TindakLanjutPage.vue'
import LainnyaPage from '@/views/marketing/LainnyaPage.vue'
import MarketingInfoPage from '@/views/marketing/MarketingInfoPage.vue'
import BerandaClientPage from '@/views/beranda/BerandaClientPage.vue'
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

  // Role-specific landing pages. These are new placeholders; dashboards are not yet implemented.
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
    path: '/admin/pembeli',
    name: 'AdminPembeli',
    component: CalonPembeliMarketingPage,
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
    component: LainnyaPage,
    props: { adminSection: 'lainnya' },
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/spk',
    name: 'AdminSPK',
    component: SPKMarketingPage,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/beranda-marketing',
    name: 'BerandaMarketing',
    component: BerandaMarketingPage,
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
  {
    path: '/marketing/profil',
    name: 'ProfilMarketing',
    component: MarketingInfoPage,
    props: {
      title: 'Profil Saya',
      description: 'Kelola dan periksa informasi akun Marketing Anda.',
    },
    meta: { requiresAuth: true, role: 'marketing' },
  },
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
    meta: { requiresAuth: true, role: 'client' },
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
    redirect: '/beranda-marketing',
  },
  {
    path: '/marketing/riwayat-pembayaran',
    redirect: '/marketing/clients',
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
 