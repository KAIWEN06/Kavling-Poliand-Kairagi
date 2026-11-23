<template>
  <MarketingPageLayout title="Laporan Marketing" tab-variant="head" @refresh="load()">
    <nav class="mk-tabs" role="tablist" aria-label="Jenis laporan">
      <button type="button" role="tab" :aria-selected="tab === 'sales'" @click="tab = 'sales'">Statistik penjualan</button>
      <button type="button" role="tab" :aria-selected="tab === 'regions'" @click="tab = 'regions'">Asal konsumen</button>
      <button type="button" role="tab" :aria-selected="tab === 'performance'" @click="tab = 'performance'">Performa Marketing</button>
    </nav>

    <PeriodFilter :members="tab === 'performance' ? [] : members" @change="load" />

    <div v-if="loading && !report" class="mk-state" role="status">Memuat laporan…</div>
    <div v-else-if="error" class="mk-state mk-state--error" role="alert"><strong>Laporan belum dapat dimuat</strong><span>{{ error }}</span></div>

    <template v-else-if="report">
      <!-- STATISTIK PENJUALAN -->
      <template v-if="tab === 'sales'">
        <section class="mk-section">
          <div class="mk-section-head"><div><h2>Prospek & SPK</h2></div></div>
          <div class="mk-grid">
            <StatCard label="Total prospek" :value="s.total_clients" hint="seluruh klien tim" />
            <StatCard label="Prospek baru" :value="s.new_clients" hint="pada periode" />
            <StatCard label="SPK diajukan" :value="s.spk_submitted" />
            <StatCard label="SPK terkonfirmasi" :value="s.spk_approved" accent />
          </div>
        </section>

        <section class="mk-section">
          <div class="mk-section-head"><div><h2>1. Nilai kontrak</h2><p>Nilai transaksi kaveling terjual (bukan uang yang sudah diterima)</p></div></div>
          <div class="mk-grid">
            <StatCard label="Kaveling terjual" :value="s.units_sold" :hint="`${s.units_booked} dipesan · ${s.units_paid_off} lunas`" />
            <StatCard label="Total nilai penjualan" :value="formatRupiahShort(s.contract_value)" accent />
            <StatCard label="Penjualan tunai" :value="formatRupiahShort(s.cash_contract_value)" :hint="`${s.cash_units} kavling`" />
            <StatCard label="Penjualan cicilan" :value="formatRupiahShort(s.installment_contract_value)" :hint="`${s.installment_units} kavling`" />
          </div>
        </section>

        <section class="mk-section">
          <div class="mk-section-head"><div><h2>2. Penerimaan kas</h2><p>Hanya pembayaran yang sudah dikonfirmasi Admin</p></div></div>
          <div class="mk-grid">
            <StatCard label="Pembayaran terkonfirmasi" :value="formatRupiahShort(s.cash_in)" accent />
            <StatCard label="SPK (Booking Fee)" :value="formatRupiahShort(cat('Booking'))" />
            <StatCard label="Uang muka" :value="formatRupiahShort(cat('Down Payment'))" />
            <StatCard label="Cicilan & pelunasan" :value="formatRupiahShort(cat('Installment') + cat('Cash Purchase'))" />
          </div>
          <p class="mk-muted">Menunggu verifikasi: {{ formatRupiah(s.payments_pending_amount) }} ({{ s.payments_pending_count }} pembayaran) — belum termasuk penerimaan kas.</p>
        </section>

        <section class="mk-section">
          <div class="mk-section-head"><div><h2>3. Komisi</h2><p>Dari data komisi Admin, dicatat pada periode</p></div></div>
          <div class="mk-grid mk-grid--3">
            <StatCard label="Total komisi" :value="formatRupiahShort(s.commission_total)" />
            <StatCard label="Belum dibayarkan" :value="formatRupiahShort(s.commission_pending)" />
            <StatCard label="Dibayarkan" :value="formatRupiahShort(s.commission_paid)" />
          </div>
        </section>

        <section class="mk-charts">
          <BarChart title="Nilai penjualan per periode" orientation="vertical" :items="trend('contract_value')" :formatter="formatRupiahShort" label-header="Periode" value-header="Nilai kontrak" />
          <BarChart title="Penerimaan kas per periode" orientation="vertical" :items="trend('cash_in')" :formatter="formatRupiahShort" label-header="Periode" value-header="Kas terkonfirmasi" />
          <BarChart title="Kaveling terjual per periode" orientation="vertical" :items="trend('units_sold')" label-header="Periode" value-header="Kaveling" />
          <BarChart title="Penjualan per Marketing" :items="teamBars('contract_value')" :formatter="formatRupiahShort" label-header="Marketing" value-header="Nilai kontrak" />
        </section>
      </template>

      <!-- ASAL KONSUMEN -->
      <template v-else-if="tab === 'regions'">
        <section class="mk-section">
          <p class="mk-muted">
            Berdasarkan wilayah terstruktur (provinsi & kabupaten/kota) pada data klien yang ditambahkan dalam periode.
            Klien tanpa wilayah dikelompokkan sebagai "Belum diisi" — wilayah tidak ditebak dari teks alamat.
          </p>
          <div class="mk-grid mk-grid--3">
            <StatCard label="Klien pada periode" :value="regionTotals.clients" />
            <StatCard label="Pembeli" :value="regionTotals.buyers" />
            <StatCard label="Wilayah belum diisi" :value="regionTotals.unknown" :hint="`${regionTotals.unknownPct}% client`" />
          </div>
          <BarChart title="Klien per kabupaten/kota" :items="regionBars('clients')" label-header="Wilayah" value-header="Klien" />
          <BarChart title="Pembeli per kabupaten/kota" :items="regionBars('buyers')" label-header="Wilayah" value-header="Pembeli" />
          <div class="mk-table-wrap">
            <table class="mk-table mk-table--stack">
              <thead><tr><th>Wilayah</th><th class="num">Klien</th><th class="num">Pembeli</th><th class="num">Konversi</th></tr></thead>
              <tbody>
                <tr v-if="!report.regions.length"><td colspan="4" class="mk-muted">Belum ada klien pada periode ini.</td></tr>
                <tr v-for="r in report.regions" :key="r.province + r.city">
                  <td class="mk-cell-main">{{ r.city }}<span class="mk-muted mk-block">{{ r.province }}</span></td>
                  <td data-label="Klien" class="num">{{ r.clients }}</td>
                  <td data-label="Pembeli" class="num">{{ r.buyers }}</td>
                  <td data-label="Konversi" class="num">{{ r.conversion_rate ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <!-- PERFORMA MARKETING -->
      <template v-else>
        <section class="mk-section">
          <div class="mk-card mk-criteria">
            <strong>Kriteria ranking</strong>
            <ol>
              <li>SPK terkonfirmasi Admin pada periode (terbanyak).</li>
              <li>Jika sama: nilai penjualan (kontrak) pada periode.</li>
              <li>Jika sama: persentase konversi klien menjadi pembeli.</li>
            </ol>
            <span class="mk-muted">Jumlah klien yang dimasukkan tidak dipakai sebagai dasar ranking.</span>
          </div>
          <BarChart title="SPK terkonfirmasi per Marketing" :items="teamBars('spk_approved')" label-header="Marketing" value-header="SPK" />
          <div class="mk-table-wrap mk-scroll">
            <table class="mk-table">
              <thead>
                <tr>
                  <th>#</th><th>Marketing</th><th class="num">Total klien</th><th class="num">Baru</th><th class="num">Dihubungi</th>
                  <th class="num">Tindak lanjut</th><th class="num">Berminat</th><th class="num">Negosiasi</th><th class="num">SPK ✓</th>
                  <th class="num">Terjual</th><th class="num">Nilai penjualan</th><th class="num">Komisi</th><th class="num">Tidak lanjut</th>
                  <th class="num">Konversi</th><th>Aktivitas terakhir</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(m, index) in ranked" :key="m.id">
                  <td>{{ index + 1 }}</td>
                  <td class="mk-strong">{{ m.full_name }}</td>
                  <td class="num">{{ m.total_clients }}</td>
                  <td class="num">{{ m.new_clients }}</td>
                  <td class="num">{{ m.contacted }}</td>
                  <td class="num">{{ m.followup }}</td>
                  <td class="num">{{ m.interested }}</td>
                  <td class="num">{{ m.negotiation }}</td>
                  <td class="num">{{ m.spk_approved }}</td>
                  <td class="num">{{ m.units_sold }}</td>
                  <td class="num">{{ formatRupiah(m.contract_value) }}</td>
                  <td class="num">{{ formatRupiah(m.commission_total) }}</td>
                  <td class="num">{{ m.lost }}</td>
                  <td class="num">{{ m.conversion_rate }}%</td>
                  <td>{{ m.last_activity_at ? formatRelative(m.last_activity_at) : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mk-muted">Kolom status (Dihubungi, Tindak lanjut, dst.) adalah jumlah klien per status saat ini; SPK, terjual, nilai, dan komisi mengikuti periode.</p>
        </section>
      </template>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PeriodFilter from '@/components/marketing/shared/PeriodFilter.vue'
import StatCard from '@/components/ui/StatCard.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import { bucketLabel, useMarketingReport } from '@/composables/useMarketingReport'
import { getTeamMembers, type TeamMember } from '@/services/marketing/marketingCrmService'
import { formatRupiah, formatRupiahShort, formatRelative } from '@/utils/marketingStatus'

const route = useRoute()
const tab = ref<'sales' | 'regions' | 'performance'>(
  route.query.tab === 'performance' ? 'performance' : route.query.tab === 'regions' ? 'regions' : 'sales',
)
const { report, loading, error, load, s } = useMarketingReport()
const members = ref<TeamMember[]>([])

const cat = (key: string) => Number(s.value.cash_in_by_category?.[key] ?? 0)
function trend(key: 'contract_value' | 'cash_in' | 'units_sold') {
  const r = report.value
  return r ? r.trend.map((t) => ({ label: bucketLabel(t.bucket, r.period.bucket), value: Number(t[key]) })) : []
}
const ranked = computed(() => (report.value?.team ?? []).filter((m) => m.role === 'marketing'))
function teamBars(key: 'contract_value' | 'spk_approved') {
  return ranked.value.map((m) => ({ label: m.full_name, value: Number(m[key]) })).sort((a, b) => b.value - a.value)
}
function regionBars(key: 'clients' | 'buyers') {
  return (report.value?.regions ?? [])
    .map((r) => ({ label: r.city === 'Belum diisi' ? 'Belum diisi' : r.city, value: Number(r[key]), note: r.province }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}
const regionTotals = computed(() => {
  const rows = report.value?.regions ?? []
  const clients = rows.reduce((a, r) => a + Number(r.clients), 0)
  const unknown = rows.filter((r) => r.province === 'Belum diisi').reduce((a, r) => a + Number(r.clients), 0)
  return {
    clients,
    buyers: rows.reduce((a, r) => a + Number(r.buyers), 0),
    unknown,
    unknownPct: clients ? Math.round((unknown / clients) * 100) : 0,
  }
})

onMounted(async () => {
  try {
    members.value = (await getTeamMembers()).filter((m) => m.role === 'marketing')
  } catch { /* filter Marketing opsional */ }
})
</script>

<style scoped>
.mk-charts { display: grid; gap: 12px; }
@media (min-width: 720px) { .mk-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.mk-criteria { display: grid; gap: 6px; font-size: 13px; }
.mk-criteria ol { margin: 0; padding-left: 18px; }
.mk-scroll { overflow-x: auto; }
.mk-scroll .mk-table { min-width: 1100px; }
.mk-block { display: block; margin-top: 2px; }
</style>
