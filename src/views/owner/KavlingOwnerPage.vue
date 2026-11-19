<template>
  <ion-page class="owner-page">
    <AppHeader variant="owner" title="PoliLand Kairagi" :show-back="false" />
    <ion-content class="owner-content">
      <main class="owner-shell">
        <label class="search-box">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <input v-model="query" type="search" placeholder="Cari nomor kavling atau nama pelanggan" />
          <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''">×</button>
        </label>

        <div class="filters" aria-label="Filter status kavling">
          <button v-for="item in filters" :key="item.value" type="button" :class="{ active: statusFilter === item.value }" @click="statusFilter = item.value">
            <span v-if="item.value !== 'all'" class="dot" :class="item.value" />{{ item.label }} <small>{{ item.value === 'all' ? lots.length : statusCounts[item.value] }}</small>
          </button>
        </div>

        <button class="siteplan-link" type="button" @click="openSiteplan">
          <span class="siteplan-link-icon"><ion-icon :icon="mapOutline" /></span>
          <span><strong>Lihat Siteplan</strong><small>Pantau posisi dan status kavling pada denah</small></span>
          <ion-icon class="chevron" :icon="chevronForwardOutline" />
        </button>

        <p v-if="error" class="state error">{{ error }} <button type="button" @click="loadLots">Coba lagi</button></p>
        <p v-else-if="loading" class="state">Memuat data kavling...</p>
        <p v-else-if="!filteredLots.length" class="state">Tidak ada kavling yang sesuai.</p>
        <section v-else class="lot-list" aria-label="Daftar kavling">
          <header class="lot-list-heading">
            <h2>Daftar Kavling</h2>
            <span><ion-icon :icon="swapVerticalOutline" aria-hidden="true" /> Nomor kavling</span>
          </header>
          <article v-for="lot in pageLots" :key="String(lot.id ?? lot.polygon_id)" class="lot-card">
            <div class="lot-card-heading">
              <div class="lot-copy">
                <h3>{{ lot.lot_number || 'Kavling —' }}</h3>
                <p>
                  <template v-if="lot.area">Blok {{ blockName(lot) }} · {{ lot.area }} m²</template>
                  <template v-else-if="lot.dimension">Blok {{ blockName(lot) }} · Luas belum diisi</template>
                  <template v-else>Data ukuran belum diisi</template>
                  <template v-if="lot.dimension"> · {{ lot.dimension }}</template>
                </p>
              </div>
              <span class="status-pill" :class="normalizedStatus(lot.status)"><i />{{ getStatusLabel(lot.status) }}</span>
            </div>
            <div class="lot-price">
              <small>HARGA</small>
              <strong>{{ lotPriceLabel(lot) }}</strong>
            </div>
            <p v-if="transactionSummary(lot)" class="lot-transaction">
              <ion-icon :icon="personOutline" aria-hidden="true" />
              {{ transactionSummary(lot) }}
            </p>
            <div class="lot-actions">
              <button
                class="lot-share-button"
                type="button"
                :aria-label="`Bagikan informasi ${lot.lot_number || 'kavling'}`"
                @click="shareLot(lot)"
              >
                <ion-icon :icon="shareSocialOutline" aria-hidden="true" />
              </button>
              <button class="lot-detail-button" type="button" @click="selectedLot = lot">
                Detail <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
              </button>
            </div>
          </article>
        </section>

        <nav v-if="pageCount > 1" class="pagination" aria-label="Halaman kavling">
          <button type="button" :disabled="page === 1" aria-label="Halaman sebelumnya" @click="page--"><ion-icon :icon="chevronBackOutline" /></button>
          <button v-for="pageNumber in pageNumbers" :key="pageNumber" type="button" :class="{ active: page === pageNumber }" @click="page = pageNumber">{{ pageNumber }}</button>
          <button type="button" :disabled="page === pageCount" aria-label="Halaman berikutnya" @click="page++"><ion-icon :icon="chevronForwardOutline" /></button>
        </nav>
        <p v-if="pageCount > 1" class="page-caption">Halaman {{ page }} dari {{ pageCount }}</p>
      </main>
    </ion-content>
    <MobileTabBar variant="owner" />

    <ion-modal
      class="owner-lot-detail-modal"
      :is-open="Boolean(selectedLot)"
      :breakpoints="[0, 0.55, 0.9]"
      :initial-breakpoint="0.55"
      :handle="true"
      @did-dismiss="selectedLot = null"
    >
      <ion-content v-if="selectedLot" class="lot-detail-content">
        <div class="lot-detail">
          <button class="close-detail" type="button" aria-label="Tutup" @click="selectedLot = null">×</button>
          <h2>Kavling {{ selectedLot.lot_number || '—' }}</h2>
          <span class="status-pill" :class="normalizedStatus(selectedLot.status)"><i />{{ getStatusLabel(selectedLot.status) }}</span>
          <dl>
            <div><dt>Blok</dt><dd>{{ blockName(selectedLot) }}</dd></div>
            <div><dt>Luas</dt><dd>{{ selectedLot.area ? `${selectedLot.area} m²` : 'Belum diisi' }}</dd></div>
            <div><dt>Dimensi</dt><dd>{{ selectedLot.dimension || 'Belum diisi' }}</dd></div>
            <div><dt>Harga</dt><dd>{{ lotPriceLabel(selectedLot) }}</dd></div>
            <div v-if="selectedLot.customers?.full_name"><dt>{{ normalizedStatus(selectedLot.status) === 'sold' ? 'Pembeli' : 'Pemesan' }}</dt><dd>{{ selectedLot.customers.full_name }}</dd></div>
            <div v-if="selectedLot.booking_date || selectedLot.sold_date"><dt>Tanggal</dt><dd>{{ dateLabel(selectedLot.sold_date || selectedLot.booking_date) }}</dd></div>
            <div v-if="selectedLot.payment_type"><dt>Pembayaran</dt><dd>{{ paymentLabel(selectedLot.payment_type) }}</dd></div>
          </dl>
        </div>
      </ion-content>
    </ion-modal>
    <ion-toast
      :is-open="shareToastOpen"
      :message="shareToastMessage"
      :duration="1800"
      @did-dismiss="shareToastOpen = false"
    />

    <ion-modal :is-open="showSiteplan" class="owner-siteplan-modal" @did-dismiss="closeSiteplan">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start"><ion-button aria-label="Tutup siteplan" @click="closeSiteplan"><ion-icon :icon="chevronBackOutline" /></ion-button></ion-buttons>
          <ion-title>Siteplan PoliLand</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="owner-siteplan-content">
        <section class="owner-siteplan-map">
          <SiteplanMap :lots="siteplanLots" :background="siteplanBackground" :svg-raw="siteplanSvg" :selected-lot="selectedSiteplanLot ?? undefined" :rotation="0" :scale="1.15" @select="selectedSiteplanLot = $event" />
          <div class="siteplan-status-legend" aria-label="Ringkasan status kavling dari database">
            <span><i class="available-dot" />Tersedia <b>{{ siteplanCounts.available }}</b></span>
            <span><i class="booking-dot" />Booking <b>{{ siteplanCounts.booking }}</b></span>
            <span><i class="sold-dot" />Terjual <b>{{ siteplanCounts.sold }}</b></span>
            <span v-if="siteplanCounts.other"><i class="other-dot" />Lainnya <b>{{ siteplanCounts.other }}</b></span>
          </div>
          <p v-if="loading" class="siteplan-state">Memuat siteplan...</p>
          <p v-else-if="error" class="siteplan-state siteplan-error">{{ error }} <button type="button" @click="loadLots">Coba lagi</button></p>
        </section>
        <article v-if="selectedSiteplanLot" class="siteplan-lot-detail">
          <button type="button" class="siteplan-close-detail" aria-label="Tutup detail" @click="selectedSiteplanLot = null">×</button>
          <div class="siteplan-detail-heading"><div><small>Detail kavling</small><h2>{{ selectedSiteplanLot.lot_number || 'Kavling' }}</h2></div><span class="status-pill" :class="normalizedStatus(selectedSiteplanLot.status)"><i />{{ getStatusLabel(selectedSiteplanLot.status) }}</span></div>
          <dl><div><dt>Blok</dt><dd>{{ blockName(selectedSiteplanLot) }}</dd></div><div><dt>Luas</dt><dd>{{ selectedSiteplanLot.area ? `${selectedSiteplanLot.area} m²` : 'Belum diisi' }}</dd></div><div><dt>Dimensi</dt><dd>{{ selectedSiteplanLot.dimension || 'Belum diisi' }}</dd></div><div><dt>Harga</dt><dd>{{ formatCurrency(selectedSiteplanLot.promo_price || selectedSiteplanLot.cash_price) }}</dd></div></dl>
          <p v-if="normalizedStatus(selectedSiteplanLot.status) === 'booking'" class="siteplan-customer">Dipesan oleh {{ selectedSiteplanLot.customers?.full_name || 'nama pemesan belum tercatat' }}<span v-if="selectedSiteplanLot.booking_date"> · {{ dateLabel(selectedSiteplanLot.booking_date) }}</span></p>
          <p v-else-if="normalizedStatus(selectedSiteplanLot.status) === 'sold'" class="siteplan-customer">Terjual kepada {{ selectedSiteplanLot.customers?.full_name || 'nama pembeli belum tercatat' }}<span v-if="selectedSiteplanLot.sold_date"> · {{ dateLabel(selectedSiteplanLot.sold_date) }}</span></p>
        </article>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonPage, IonTitle, IonToast, IonToolbar } from '@ionic/vue'
import { chevronBackOutline, chevronForwardOutline, mapOutline, personOutline, searchOutline, shareSocialOutline, swapVerticalOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import SiteplanMap from '@/components/siteplan/SiteplanMap.vue'
import siteplanBackground from '@/assets/siteplan/Siteplan.png'
import siteplanSvg from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { formatCurrency, getStatusLabel, normalizeLotStatus } from '@/utils/siteplan'

const lots = ref<SiteplanLot[]>([])
const loading = ref(true)
const error = ref('')
const query = ref('')
const statusFilter = ref('all')
const page = ref(1)
const selectedLot = ref<SiteplanLot | null>(null)
const showSiteplan = ref(false)
const selectedSiteplanLot = ref<SiteplanLot | null>(null)
const pageSize = 8
const shareToastOpen = ref(false)
const shareToastMessage = ref('')
const filters = [{ value: 'all', label: 'Semua' }, { value: 'available', label: 'Tersedia' }, { value: 'booking', label: 'Booking' }, { value: 'sold', label: 'Terjual' }] as const
const siteplanLots = computed(() => lots.value.map(lot => ({ ...lot, color: null })))
const siteplanCounts = computed(() => {
  const counts = { available: 0, booking: 0, sold: 0, other: 0 }
  lots.value.forEach(lot => {
    const status = normalizeLotStatus(lot.status)
    if (status === 'available') counts.available += 1
    else if (status === 'booking') counts.booking += 1
    else if (status === 'sold') counts.sold += 1
    else counts.other += 1
  })
  return counts
})
const statusCounts = computed(() => ({ available: lots.value.filter(lot => normalizeLotStatus(lot.status) === 'available').length, booking: lots.value.filter(lot => normalizeLotStatus(lot.status) === 'booking').length, sold: lots.value.filter(lot => normalizeLotStatus(lot.status) === 'sold').length }))
const filteredLots = computed(() => lots.value.filter(lot => {
  const statusMatch = statusFilter.value === 'all' || normalizeLotStatus(lot.status) === statusFilter.value
  const needle = query.value.trim().toLocaleLowerCase('id-ID')
  const searchable = [lot.lot_number, blockName(lot), lot.customers?.full_name].join(' ').toLocaleLowerCase('id-ID')
  return statusMatch && (!needle || searchable.includes(needle))
}))
const pageCount = computed(() => Math.ceil(filteredLots.value.length / pageSize))
const pageLots = computed(() => filteredLots.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const pageNumbers = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))

function normalizedStatus(status?: string) { return normalizeLotStatus(status) || 'unknown' }
function blockName(lot: SiteplanLot) { return lot.blocks?.code || lot.blocks?.name || (lot.block_id ? String(lot.block_id) : '—') }
function lotPriceLabel(lot: SiteplanLot) {
  const promoPrice = Number(lot.promo_price)
  const cashPrice = Number(lot.cash_price)
  const price = Number.isFinite(promoPrice) && promoPrice > 0 ? promoPrice : cashPrice
  return Number.isFinite(price) && price > 0 ? formatCurrency(price) : 'Belum diatur'
}
async function shareLot(lot: SiteplanLot) {
  const details = [
    `Kavling ${lot.lot_number || '—'}`,
    `Blok ${blockName(lot)}`,
    lot.area ? `${lot.area} m²` : 'Luas belum diisi',
    lot.dimension || '',
    `Harga: ${lotPriceLabel(lot)}`,
    `Status: ${getStatusLabel(lot.status)}`,
  ].filter(Boolean).join(' · ')

  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: `Kavling ${lot.lot_number || '—'}`, text: details })
      return
    }

    if (!navigator.clipboard?.writeText) {
      throw new Error('Fitur berbagi tidak tersedia di perangkat ini.')
    }

    await navigator.clipboard.writeText(details)
    shareToastMessage.value = 'Detail kavling disalin.'
    shareToastOpen.value = true
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    console.error('[Kavling Owner] Gagal membagikan detail kavling:', cause)
    shareToastMessage.value = cause instanceof Error ? cause.message : 'Gagal membagikan detail kavling.'
    shareToastOpen.value = true
  }
}
function paymentLabel(value: string) { return value.toLocaleLowerCase('id-ID') === 'cash' ? 'Cash' : value }
function dateLabel(value?: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return ''
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function transactionSummary(lot: SiteplanLot) {
  const status = normalizedStatus(lot.status)
  if (status !== 'booking' && status !== 'sold') return ''
  const customer = lot.customers?.full_name
  const date = dateLabel(status === 'sold' ? lot.sold_date : lot.booking_date)
  const payment = lot.payment_type ? paymentLabel(lot.payment_type) : ''
  return [
    `${status === 'sold' ? 'Pembeli' : 'Pemesan'}: ${customer || 'Belum tercatat'}`,
    date,
    payment,
  ].filter(Boolean).join(' · ')
}
async function openSiteplan() { showSiteplan.value = true; await loadLots() }
function closeSiteplan() { showSiteplan.value = false; selectedSiteplanLot.value = null }
watch([query, statusFilter], () => { page.value = 1 })

async function loadLots() {
  loading.value = true
  error.value = ''
  try { lots.value = await getLots({ forceRefresh: true }) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Data kavling gagal dimuat.' }
  finally { loading.value = false }
}
onMounted(() => { void loadLots() })
</script>

<style scoped>
.owner-page,.owner-content{--background:var(--app-background, #faf9f6);color:var(--text-primary, #252525);font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.owner-shell{display:grid;gap:13px;width:min(100%,760px);margin:auto;padding:14px 16px calc(100px + env(safe-area-inset-bottom,0px))}.search-box{display:flex;min-height:42px;align-items:center;gap:9px;padding:0 12px;border:1px solid #e5e9f3;border-radius:13px;background:#fff;color:#58647c}.search-box ion-icon{font-size:18px}.search-box input{width:100%;min-width:0;border:0;outline:0;color:var(--text-primary, #252525);background:transparent;font:inherit;font-size:13px}.search-box input::placeholder{color:#818a9b}.search-box button{border:0;background:transparent;font-size:20px;color:#71798a}.filters{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.filters button{display:flex;min-height:34px;flex:0 0 auto;align-items:center;gap:5px;padding:0 10px;border:1px solid #e8eaf1;border-radius:10px;color:#34415a;background:#fff;font:inherit;font-size:11px}.filters button.active{border-color:var(--poliland-gold, #cba044);color:#252525;background:var(--poliland-gold-soft, #f4d69a)}.filters small{padding:1px 5px;border-radius:99px;background:#ffffff55;font-size:9px}.dot,.status-pill i{width:8px;height:8px;border-radius:50%;background:var(--poliland-green, #355a2c)}.dot.booking,.status-pill.booking i{background:var(--poliland-gold, #cba044)}.dot.sold,.status-pill.sold i{background:#c5232c}.project-strip{display:flex;align-items:center;gap:8px;padding:11px;border-radius:14px;background:var(--surface-muted, #f5f3ee)}.project-icon{display:grid;width:27px;height:27px;place-items:center;color:var(--poliland-gold, #cba044);font-size:17px}.project-strip>div{display:grid;min-width:0;flex:1;gap:2px}.project-strip small{color:#58627a;font-size:9px}.project-strip strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.project-stat{padding:4px 7px;border-radius:99px;font-size:9px;white-space:nowrap}.project-stat.available{color:var(--poliland-green, #355a2c);background:var(--status-success-bg, #e8eee4)}.project-stat.booking{color:var(--poliland-gold-text-soft, #805708);background:var(--poliland-gold-soft, #f4d69a)}.siteplan-link{display:flex;width:100%;align-items:center;gap:10px;padding:10px;border:1px solid var(--border-default);border-radius:14px;background:#fff;color:var(--text-primary);text-align:left;font:inherit;cursor:pointer}.siteplan-link-icon{display:grid;width:38px;height:38px;flex:0 0 auto;place-items:center;border-radius:11px;color:var(--poliland-gold-text-soft);background:var(--poliland-gold-soft);font-size:20px}.siteplan-link>span:nth-child(2){display:grid;flex:1;gap:3px}.siteplan-link strong{font-size:13px}.siteplan-link small{color:var(--text-secondary);font-size:10px}.lot-list{display:grid;gap:8px}.lot-card{display:flex;min-width:0;align-items:center;gap:9px;padding:8px;border:1px solid var(--border-default);border-radius:15px;background:#fff;text-align:left;box-shadow:0 4px 12px rgb(37 37 37 / 4%);cursor:pointer}.lot-photo{position:relative;display:grid;width:70px;height:70px;flex:0 0 auto;place-items:center;overflow:hidden;border-radius:9px;color:var(--poliland-gold, #cba044);background:var(--surface-muted);font-size:25px}.lot-photo img{width:100%;height:100%;object-fit:cover}.lot-photo small{position:absolute;bottom:4px;left:4px;padding:2px 5px;border-radius:4px;color:#fff;background:rgb(37 37 37 / 80%);font-size:9px}.lot-copy{display:grid;min-width:0;flex:1;gap:3px}.lot-copy strong{overflow:hidden;color:var(--text-primary, #252525);font-size:14px;text-overflow:ellipsis;white-space:nowrap}.lot-copy small{color:#596780;font-size:11px}.lot-copy small.booking-customer{color:var(--poliland-gold-text-soft);font-size:10px}.status-pill{display:inline-flex;flex:0 0 auto;align-items:center;gap:5px;padding:7px 9px;border-radius:99px;color:var(--poliland-green);background:var(--status-success-bg);font-size:10px;white-space:nowrap}.status-pill i{width:7px;height:7px}.status-pill.booking{color:var(--poliland-gold-text-soft);background:var(--poliland-gold-soft)}.status-pill.sold{color:#9f2228;background:#ffe0e0}.status-pill.unknown{color:#525866;background:#eceef2}.status-pill.unknown i{background:#868b94}.chevron{flex:0 0 auto;color:#62708a;font-size:17px}.state{margin:0;padding:22px 12px;border-radius:14px;color:#68738a;background:#fff;text-align:center;font-size:13px}.state button{margin-left:7px;border:0;color:#98711f;background:transparent;font:inherit;font-weight:700}.state.error{color:#a83838}.pagination{display:flex;justify-content:center;gap:5px;padding:13px 0 0;border-top:1px solid var(--border-default)}.pagination button{display:grid;min-width:34px;height:34px;place-items:center;border:1px solid var(--border-default);border-radius:9px;color:#34415a;background:#fff;font:inherit;font-size:12px}.pagination button.active{border-color:var(--poliland-gold);color:#252525;background:var(--poliland-gold-soft)}.pagination button:disabled{opacity:.4}.page-caption{margin:-7px 0 0;color:#818697;text-align:center;font-size:11px}.lot-detail{position:relative;display:grid;gap:16px;padding:34px 24px;color:var(--text-primary, #252525)}.lot-detail h2{margin:0;font-size:22px}.close-detail{position:absolute;top:10px;right:14px;border:0;color:#596780;background:transparent;font-size:27px}.lot-detail dl{display:grid;gap:0;margin:0}.lot-detail dl div{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-top:1px solid var(--border-default)}.lot-detail dt{color:#727b8e}.lot-detail dd{margin:0;font-weight:700;text-align:right}
.owner-siteplan-modal{--width:100%;--height:100%;--border-radius:0}.owner-siteplan-modal ion-toolbar{--background:var(--app-background,#faf9f6);--color:var(--text-primary,#252525);--border-color:var(--border-default,#eae7e0)}.owner-siteplan-content{--background:#d5dfb9}.owner-siteplan-map{position:absolute;inset:0;overflow:hidden}.owner-siteplan-map :deep(.siteplan-map){width:100%;height:100%}.siteplan-state{position:absolute;top:12px;left:50%;z-index:10;transform:translateX(-50%);margin:0;padding:9px 12px;border:1px solid var(--border-default);border-radius:11px;background:#fff;color:var(--text-primary);font-size:12px;white-space:nowrap}.siteplan-error{color:#a83838}.siteplan-state button{margin-left:5px;border:0;background:transparent;color:var(--poliland-green);font:inherit;font-weight:700}.siteplan-status-legend{position:absolute;top:72px;left:12px;z-index:20;display:flex;max-width:calc(100% - 24px);flex-wrap:wrap;gap:6px;padding:7px;border:1px solid var(--border-default);border-radius:12px;background:#fff;box-shadow:0 4px 14px rgb(37 37 37 / 12%)}.siteplan-status-legend span{display:inline-flex;align-items:center;gap:4px;color:var(--text-secondary);font-size:9px;white-space:nowrap}.siteplan-status-legend i{width:8px;height:8px;border-radius:50%}.siteplan-status-legend b{color:var(--text-primary);font-size:10px}.available-dot{background:#22c55e}.booking-dot{background:#facc15}.sold-dot{background:#ef4444}.other-dot{background:#9ca3af}.siteplan-lot-detail{position:absolute;right:12px;bottom:12px;left:12px;z-index:30;display:grid;gap:10px;padding:16px;border:1px solid var(--border-default);border-radius:17px;background:#fff;box-shadow:0 8px 28px rgb(37 37 37 / 18%)}.siteplan-close-detail{position:absolute;top:7px;right:8px;width:30px;height:30px;border:0;border-radius:50%;background:var(--surface-muted);color:var(--text-secondary);font-size:22px}.siteplan-detail-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-right:28px}.siteplan-detail-heading small{color:var(--text-secondary);font-size:10px}.siteplan-detail-heading h2{margin:2px 0 0;color:var(--text-primary);font-size:18px}.siteplan-lot-detail dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0}.siteplan-lot-detail dl div{display:grid;gap:3px;padding:8px;border-radius:10px;background:var(--surface-muted)}.siteplan-lot-detail dt{color:var(--text-secondary);font-size:10px}.siteplan-lot-detail dd{margin:0;color:var(--text-primary);font-size:12px;font-weight:700}.siteplan-customer{margin:0;padding-top:8px;border-top:1px solid var(--border-default);color:var(--text-secondary);font-size:11px;line-height:1.4}
.owner-shell{box-sizing:border-box;width:100%;max-width:760px;min-width:0;gap:16px;padding:16px;margin-inline:auto}
.search-box{box-sizing:border-box;width:100%;min-width:0;min-height:54px;padding:0 16px;border-color:#e9e6df;border-radius:17px;color:#777982}
.search-box ion-icon{font-size:22px}
.search-box input{font-size:15px}
.search-box input::placeholder{color:#85858c}
.filters{gap:9px}
.filters button{min-height:44px;gap:7px;padding:0 15px;border-color:#e9e6df;border-radius:999px;color:#303030;font-size:13px}
.filters button.active{border-color:#355a2c;color:#fff;background:#355a2c}
.filters small{padding:0;background:transparent;font-size:inherit}
.filters button.active small{color:#fff}
.dot{width:9px;height:9px}
.siteplan-link{box-sizing:border-box;min-width:0;padding:9px 11px;border-color:#e9e6df;border-radius:14px}
.siteplan-link-icon{color:#355a2c;background:#e8eee4}
.siteplan-link>span:nth-child(2){min-width:0}
.siteplan-link small{overflow-wrap:anywhere}
.lot-list{gap:12px}
.lot-list,.lot-card{box-sizing:border-box;width:100%;min-width:0}
.lot-list-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 2px 2px}
.lot-list-heading h2{margin:0;color:#292929;font-size:18px;font-weight:700}
.lot-list-heading span{display:inline-flex;align-items:center;gap:5px;color:#355a2c;font-size:13px;font-weight:600;white-space:nowrap}
.lot-list-heading ion-icon{font-size:17px}
.lot-card{display:grid;gap:13px;padding:16px;border-color:#e9e6df;border-radius:20px;box-shadow:none}
.lot-card-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lot-copy{gap:3px}
.lot-copy h3{margin:0;overflow:hidden;color:#292929;font-size:18px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
.lot-copy p{margin:0;color:#81818a;font-size:13px;line-height:1.5}
.status-pill{gap:6px;padding:8px 11px;border-radius:999px;font-size:12px;font-weight:600}
.status-pill i{width:8px;height:8px}
.status-pill.unknown{color:#525866;background:#eceef2}
.lot-price{display:grid;gap:3px;padding-top:13px;border-top:1px solid #e9e6df}
.lot-price small{color:#777982;font-size:12px;font-weight:600}
.lot-price strong{overflow-wrap:anywhere;color:#292929;font-size:clamp(17px,5vw,20px);font-weight:750;line-height:1.35}
.lot-transaction{display:flex;align-items:flex-start;gap:7px;margin:0;color:#81818a;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.lot-transaction ion-icon{flex:0 0 auto;margin-top:2px;font-size:15px}
.lot-actions{display:flex;width:100%;min-width:0;gap:10px}
.lot-share-button{display:grid;width:52px;height:52px;flex:0 0 52px;place-items:center;border:1px solid #e9e6df;border-radius:16px;color:#292929;background:#fff;font-size:20px;cursor:pointer}
.lot-detail-button{display:flex;width:auto;min-width:0;flex:1;box-sizing:border-box;min-height:52px;align-items:center;justify-content:center;gap:4px;border:0;border-radius:17px;color:#292929;background:#f4f2ed;font:inherit;font-size:16px;font-weight:700;cursor:pointer}
.lot-detail-button ion-icon{font-size:19px}
.lot-detail-button:focus-visible,.lot-share-button:focus-visible,.filters button:focus-visible,.search-box button:focus-visible{outline:2px solid #355a2c;outline-offset:2px}
.lot-detail{gap:18px}
.lot-detail dl div{align-items:flex-start}
.lot-detail dd{max-width:65%;overflow-wrap:anywhere}
ion-modal.owner-lot-detail-modal{--width:100%;--height:100%;--border-radius:22px 22px 0 0;--backdrop-opacity:.35}
.lot-detail-content{--background:#fff}
.lot-detail{padding-bottom:calc(28px + env(safe-area-inset-bottom,0px))}
</style>
