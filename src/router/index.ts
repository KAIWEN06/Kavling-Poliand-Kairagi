import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

const MainLayout = () => import('@/layouts/MainLayout.vue')
const HomePage = () => import('@/views/HomePage.vue')
const SiteplanPage = () => import('@/views/SiteplanPage.vue')
const ProgressPage = () => import('@/views/ProgressPage.vue')
const ProgressDetailPage = () => import('@/views/ProgressDetailPage.vue')
const GalleryPage = () => import('@/views/GalleryPage.vue')
const AboutPage = () => import('@/views/AboutPage.vue')
const ContactPage = () => import('@/views/ContactPage.vue')
const PanoramaPage = () => import('@/views/PanoramaPage.vue')
const NotFoundPage = () => import('@/views/NotFoundPage.vue')
const MaintenancePage = () => import('@/views/MaintenancePage.vue')
import WelcomePage from '@/views/WelcomePage.vue'
import SplashVideoPage from '@/components/common/SplashVideoPage.vue'

const LoginPage = () => import('@/views/auth/LoginPage.vue')
const ForgotPasswordPage = () => import('@/views/auth/ForgotPasswordPage.vue')
const ResetPasswordPage = () => import('@/views/auth/ResetPasswordPage.vue')
const RegisterPage = () => import('@/views/auth/RegisterPage.vue')
const AuthCallbackPage = () => import('@/views/auth/AuthCallbackPage.vue')
const BerandaAdminPage = () => import('@/views/Admin/AdminDashboard.vue')
const AdminAksesTimPage = () => import('@/views/Admin/AdminAksesTim.vue')
const AdminKavlingPage = () => import('@/views/Admin/AdminKavling.vue')
const AdminKavlingDetailPage = () => import('@/views/Admin/AdminDetailKavling.vue')
const AdminPembeliPage = () => import('@/views/Admin/AdminPembeli.vue')
const AdminPembeliDetailPage = () => import('@/views/Admin/AdminPembeliDetail.vue')
const AdminGabungDataPage = () => import('@/views/Admin/AdminGabungDataPage.vue')
const AdminKeuanganPage = () => import('@/views/Admin/AdminKeuangan.vue')
const AdminLainnyaPage = () => import('@/views/Admin/AdminLainnya.vue')
const AdminContentPage = () => import('@/views/Admin/AdminContentPage.vue')
const AdminSurveyRequestsPage = () => import('@/views/Admin/AdminSurveyRequestsPage.vue')
const SPKAdminPage = () => import('@/views/Admin/SPKAdminPage.vue')
const AdminReviewsPage = () => import('@/views/Admin/AdminReviewsPage.vue')
const TinjauSPKPage = () => import('@/views/Admin/TinjauSPKPage.vue')
const BerandaMarketingPage = () => import('@/views/marketing/BerandaMarketingPage.vue')
const KavlingMarketingPage = () => import('@/views/marketing/KavlingMarketingPage.vue')
const CalonPembeliMarketingPage = () => import('@/views/marketing/CalonPembeliMarketingPage.vue')
const TambahCalonPembeliPage = () => import('@/views/marketing/TambahCalonPembeli.vue')
const DetailCalonPembeliPage = () => import('@/views/marketing/DetailCalonPembeliPage.vue')
const SPKMarketingPage = () => import('@/views/marketing/SPKMarketingPage.vue')
const TindakLanjutPage = () => import('@/views/marketing/TindakLanjutPage.vue')
const LainnyaPage = () => import('@/views/marketing/LainnyaPage.vue')
const MarketingSpkStatusPage = () => import('@/views/marketing/MarketingSpkStatusPage.vue')
const MarketingPaymentsPage = () => import('@/views/marketing/MarketingPaymentsPage.vue')
const MarketingCommissionPage = () => import('@/views/marketing/MarketingCommissionPage.vue')
const HeadDashboardPage = () => import('@/views/marketing-head/HeadDashboardPage.vue')
const HeadClientsPage = () => import('@/views/marketing-head/HeadClientsPage.vue')
const HeadClientDetailPage = () => import('@/views/marketing-head/HeadClientDetailPage.vue')
const HeadCrmPage = () => import('@/views/marketing-head/HeadCrmPage.vue')
const HeadSpkPage = () => import('@/views/marketing-head/HeadSpkPage.vue')
const HeadPaymentsPage = () => import('@/views/marketing-head/HeadPaymentsPage.vue')
const HeadReportsPage = () => import('@/views/marketing-head/HeadReportsPage.vue')
const HeadCommissionPage = () => import('@/views/marketing-head/HeadCommissionPage.vue')
const HeadMorePage = () => import('@/views/marketing-head/HeadMorePage.vue')
const BerandaClientPage = () => import('@/views/client/BerandaClientPage.vue')
const PembayaranClientPage = () => import('@/views/client/PembayaranClientPage.vue')
const AkunPage = () => import('@/views/account/AkunPage.vue')
const DokumenClientPage = () => import('@/views/client/DokumenClientPage.vue')
const KavlingClientPage = () => import('@/views/client/KavlingClientPage.vue')
const KavlingClientDetailPage = () => import('@/views/client/KavlingClientDetailPage.vue')
const SPKClientPage = () => import('@/views/client/SPKClientPage.vue')
const SettingsPage = () => import('@/views/account/SettingsPage.vue')
import { setupAuthGuards } from '@/router/guards'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/splash' },

  {
    path: '/splash',
    name: 'Splash',
    component: SplashVideoPage,
  },

  // Welcome: tampil setelah splash. Pengguna yang sudah login langsung diarahkan ke beranda role-nya (publicOnly).
  {
    path: '/welcome',
    name: 'Welcome',
    component: WelcomePage,
    meta: { publicOnly: true },
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
    path: '/beranda-owner',
    name: 'BerandaOwner',
    component: BerandaAdminPage,
    meta: { requiresAuth: true, role: 'owner' },
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
    path: '/admin/gabung-data',
    name: 'AdminGabungData',
    component: AdminGabungDataPage,
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
    path: '/admin/survei',
    name: 'AdminSurvei',
    component: AdminSurveyRequestsPage,
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
    path: '/marketing/siteplan',
    name: 'MarketingSiteplan',
    component: SiteplanPage,
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
  // Profil & Pengaturan dipakai bersama oleh semua role (tanpa meta.role).
  { path: '/akun', name: 'Akun', component: AkunPage, meta: { requiresAuth: true } },
  { path: '/profil', redirect: '/akun' },
  { path: '/pengaturan', name: 'Pengaturan', component: SettingsPage, meta: { requiresAuth: true } },
  { path: '/marketing/profil', redirect: '/akun' },
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
    path: '/client/kavling',
    name: 'KavlingClient',
    component: KavlingClientPage,
  },
  {
    path: '/client/favorit',
    name: 'FavoritKavling',
    component: () => import('@/views/client/FavoritKavlingPage.vue'),
    meta: { requiresAuth: true, role: 'client' },
  },
  {
    path: '/client/siteplan',
    name: 'ClientSiteplan',
    component: SiteplanPage,
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
      { path: 'about', name: 'About', component: AboutPage },
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
