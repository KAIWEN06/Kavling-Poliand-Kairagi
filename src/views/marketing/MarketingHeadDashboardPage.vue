<template>
  <ion-page class="head-page">
    <AppHeader variant="admin" title="Kepala Bagian Marketing" :show-back="false" />
    <ion-content class="head-content">
      <main class="head-shell">
        <section class="intro">
          <p>Pengawasan pemasaran</p>
          <h1>Ringkasan tim dan pengajuan yang perlu dipantau</h1>
          <span>Data ditampilkan untuk seluruh tim Marketing.</span>
        </section>

        <section v-if="loading" class="state-card" role="status" aria-live="polite">
          <ion-spinner name="crescent" />
          <span>Memuat ringkasan pemasaran…</span>
        </section>

        <section v-else-if="error" class="state-card state-card--error" role="alert">
          <strong>Ringkasan belum dapat dimuat</strong>
          <span>{{ error }}</span>
          <button type="button" @click="loadDashboard">Muat ulang</button>
        </section>

        <template v-else-if="dashboard">
          <section class="metric-grid" aria-label="Ringkasan pemasaran">
            <article class="metric-card"><span>Tim aktif</span><strong>{{ dashboard.team_count }}</strong></article>
            <article class="metric-card"><span>Calon pembeli</span><strong>{{ dashboard.prospect_count }}</strong></article>
            <article class="metric-card"><span>SPK perlu ditinjau</span><strong>{{ dashboard.active_spk_count }}</strong></article>
            <article class="metric-card metric-card--accent"><span>SPK disetujui</span><strong>{{ dashboard.approved_spk_count }}</strong></article>
          </section>

          <section class="team-section" aria-labelledby="team-heading">
            <div class="section-heading"><div><p>Performa saat ini</p><h2 id="team-heading">Tim Marketing</h2></div></div>
            <div v-if="dashboard.team.length" class="team-list">
              <article v-for="member in dashboard.team" :key="member.id" class="member-row">
                <div class="member-mark" aria-hidden="true">{{ initials(member.full_name) }}</div>
                <div class="member-copy"><strong>{{ member.full_name }}</strong><span>{{ member.prospect_count }} calon pembeli</span></div>
                <dl><div><dt>Perlu ditinjau</dt><dd>{{ member.active_spk_count }}</dd></div><div><dt>Disetujui</dt><dd>{{ member.approved_spk_count }}</dd></div></dl>
              </article>
            </div>
            <div v-else class="empty-state"><strong>Belum ada anggota Marketing</strong><span>Tambahkan anggota melalui pengelolaan akses tim sebelum memantau performa.</span></div>
          </section>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, IonSpinner } from '@ionic/vue'
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { marketingHeadService, type MarketingHeadDashboard } from '@/services/marketing/marketingHeadService'

const dashboard = ref<MarketingHeadDashboard | null>(null)
const loading = ref(true)
const error = ref('')

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'M' }
async function loadDashboard() {
  loading.value = true
  error.value = ''
  try { dashboard.value = await marketingHeadService.getDashboard() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.' }
  finally { loading.value = false }
}
onMounted(loadDashboard)
</script>

<style scoped>
.head-page,.head-content{--background:var(--app-background);color:var(--text-primary)}
.head-shell{width:min(100%,760px);margin:0 auto;padding:24px 16px calc(32px + env(safe-area-inset-bottom));display:grid;gap:24px}
.intro p,.section-heading p{margin:0 0 5px;color:var(--poliland-gold-text);font-size:12px;font-weight:700}.intro h1{margin:0;max-width:22ch;font-size:clamp(25px,6vw,32px);line-height:1.15;letter-spacing:-.035em}.intro span{display:block;margin-top:10px;color:var(--text-secondary);font-size:14px;line-height:1.5}
.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric-card{min-height:104px;padding:14px;border:1px solid var(--border-default);border-radius:var(--radius-card);background:var(--surface-primary);display:grid;align-content:space-between}.metric-card span{color:var(--text-secondary);font-size:12px;line-height:1.35}.metric-card strong{font-size:30px;line-height:1;font-variant-numeric:tabular-nums}.metric-card--accent{background:var(--poliland-green);border-color:var(--poliland-green);color:#fff}.metric-card--accent span{color:#edf4e9}
.team-section{display:grid;gap:12px}.section-heading h2{margin:0;font-size:20px}.team-list{display:grid;border:1px solid var(--border-default);border-radius:var(--radius-card);overflow:hidden;background:var(--surface-primary)}.member-row{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px;padding:14px;border-bottom:1px solid var(--border-default)}.member-row:last-child{border-bottom:0}.member-mark{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:var(--poliland-gold-soft);color:var(--poliland-gold-text);font-size:12px;font-weight:700}.member-copy{min-width:0}.member-copy strong,.member-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.member-copy strong{font-size:14px}.member-copy span{margin-top:3px;color:var(--text-secondary);font-size:12px}.member-row dl{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:2px 0 0}.member-row dl div{padding:9px 10px;border-radius:var(--radius-control);background:var(--surface-muted)}dt{color:var(--text-secondary);font-size:10px}dd{margin:3px 0 0;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}.state-card,.empty-state{min-height:130px;display:grid;place-items:center;align-content:center;gap:8px;padding:18px;border:1px solid var(--border-default);border-radius:var(--radius-card);background:var(--surface-primary);color:var(--text-secondary);font-size:13px;text-align:center}.state-card--error strong{color:var(--status-danger)}.state-card button{min-height:44px;padding:0 14px;border:0;border-radius:var(--radius-control);background:var(--poliland-green);color:#fff;font:inherit;font-weight:700;cursor:pointer}.state-card button:focus-visible{outline:3px solid var(--poliland-gold);outline-offset:2px}.empty-state strong{color:var(--text-primary)}.empty-state span{line-height:1.5}@media (min-width:600px){.metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.member-row{grid-template-columns:40px minmax(0,1fr) minmax(190px,.7fr);align-items:center}.member-row dl{grid-column:auto;margin:0}}
</style>
