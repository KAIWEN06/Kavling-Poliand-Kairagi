<template>
  <section class="mk-section">
    <p class="mk-muted">Diurutkan dari SPK terkonfirmasi, lalu nilai penjualan, lalu konversi.</p>

    <p v-if="!members.length" class="mk-card mk-muted">Belum ada anggota pemasaran.</p>

    <ol v-else class="rank-list">
      <li v-for="(m, index) in members" :key="m.id">
        <ScrollReveal :delay="Math.min(index, 8) * 60">
          <article class="rank-card">
            <header>
              <span :class="['rank-number', { 'is-first': index === 0 }]" :aria-label="`Peringkat ${index + 1}`">{{ index + 1 }}</span>
              <div>
                <h3>{{ m.full_name }}</h3>
                <p>{{ m.last_activity_at ? `Aktif ${formatRelative(m.last_activity_at)}` : 'Belum ada aktivitas' }}</p>
              </div>
            </header>

            <dl class="rank-main">
              <div><dt>SPK terkonfirmasi</dt><dd>{{ m.spk_approved }}</dd></div>
              <div><dt>Kaveling terjual</dt><dd>{{ m.units_sold }}</dd></div>
              <div><dt>Nilai penjualan</dt><dd>{{ formatRupiahShort(m.contract_value) }}</dd></div>
            </dl>

            <details class="rank-more">
              <summary>Rincian klien dan komisi</summary>
              <dl>
                <div><dt>Total klien</dt><dd>{{ m.total_clients }}</dd></div>
                <div><dt>Klien baru</dt><dd>{{ m.new_clients }}</dd></div>
                <div><dt>Sudah dihubungi</dt><dd>{{ m.contacted }}</dd></div>
                <div><dt>Tindak lanjut</dt><dd>{{ m.followup }}</dd></div>
                <div><dt>Berminat</dt><dd>{{ m.interested }}</dd></div>
                <div><dt>Negosiasi</dt><dd>{{ m.negotiation }}</dd></div>
                <div><dt>Tidak berlanjut</dt><dd>{{ m.lost }}</dd></div>
                <div><dt>Konversi</dt><dd>{{ m.conversion_rate }}%</dd></div>
                <div><dt>Komisi</dt><dd>{{ formatRupiah(m.commission_total) }}</dd></div>
              </dl>
              <p>Jumlah per status adalah kondisi saat ini. SPK, penjualan, dan komisi mengikuti periode.</p>
            </details>
          </article>
        </ScrollReveal>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import type { MarketingReport } from '@/services/marketing/marketingCrmService'
import { formatRelative, formatRupiah, formatRupiahShort } from '@/utils/marketingStatus'

defineProps<{ members: MarketingReport['team'] }>()
</script>

<style scoped>
.rank-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
@media (min-width: 720px) { .rank-list { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; } }
.rank-list li { min-width: 0; }

.rank-card { display: grid; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--surface-primary); box-shadow: var(--shadow-sm); }
.rank-card header { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.rank-card header > div { min-width: 0; }
.rank-card h3 { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 650; overflow-wrap: anywhere; }
.rank-card header p { margin: 2px 0 0; color: var(--text-secondary); font-size: var(--text-xs); }
.rank-number { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--surface-muted); font-weight: 800; font-variant-numeric: tabular-nums; }
.rank-number.is-first { background: var(--gold-100); color: var(--ink); }

.rank-main { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); margin: 0; }
.rank-main div { display: grid; align-content: space-between; gap: 4px; min-width: 0; }
.rank-main dt { color: var(--text-secondary); font-size: var(--text-xs); line-height: 1.3; }
.rank-main dd { margin: 0; font-size: 1.125rem; font-weight: 800; font-variant-numeric: lining-nums tabular-nums; overflow-wrap: anywhere; }

.rank-more { border-top: 1px solid var(--border-default); }
.rank-more summary { display: flex; align-items: center; min-height: 44px; color: var(--poliland-green); font-size: var(--text-sm); font-weight: 700; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.rank-more summary::after { content: '+'; margin-left: auto; font-size: 1.25rem; }
.rank-more[open] summary::after { content: '−'; }
.rank-more summary::-webkit-details-marker { display: none; }
.rank-more dl { margin: 0; }
.rank-more dl div { display: flex; justify-content: space-between; gap: var(--space-3); padding: 6px 0; font-size: var(--text-sm); }
.rank-more dt { color: var(--text-secondary); }
.rank-more dd { margin: 0; font-weight: 700; font-variant-numeric: lining-nums tabular-nums; }
.rank-more p { margin: var(--space-2) 0 0; color: var(--text-secondary); font-size: var(--text-xs); line-height: 1.5; }
</style>
