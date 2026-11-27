<template>
  <MarketingPageLayout title="Data pembeli" tab-variant="owner" show-back back-route="/owner/lainnya" @refresh="load()">
    <Reveal :order="1">
      <div class="mk-section">
        <label class="mk-field">
          <span>Cari</span>
          <input v-model="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nama, telepon, atau email" />
        </label>
        <label class="mk-field">
          <span>Perkembangan</span>
          <select v-model="status" class="mk-input">
            <option value="">Semua status</option>
            <option v-for="option in CRM_STATUSES" :key="option" :value="option">{{ crmStatusLabel(option) }}</option>
          </select>
        </label>
      </div>
    </Reveal>

    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat data pembeli">
      <Skeleton v-for="n in 5" :key="n" height="104px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Data pembeli belum dapat dimuat" :on-action="() => load()" />

    <Reveal v-else :order="2">
      <div class="mk-section">
        <div class="mk-table-wrap">
          <table class="mk-table mk-table--stack">
            <thead><tr><th>Nama</th><th>Kontak</th><th>Pemasar</th><th>Wilayah</th><th>Perkembangan</th><th>Transaksi</th></tr></thead>
            <tbody>
              <tr v-if="!pager.items.length"><td colspan="6" class="mk-muted">Tidak ada data yang cocok.</td></tr>
              <tr v-for="client in pager.items" :key="client.id">
                <td class="mk-cell-main">{{ client.full_name }}</td>
                <td data-label="Kontak">{{ client.phone || client.email || '-' }}</td>
                <td data-label="Pemasar">{{ client.marketing_name || 'Tanpa pemasar' }}</td>
                <td data-label="Wilayah">{{ client.city_name || 'Belum diisi' }}</td>
                <td data-label="Perkembangan">{{ crmStatusLabel(client.crm_status) }}</td>
                <td data-label="Transaksi">{{ client.has_transaction ? 'Sudah ada' : 'Belum ada' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination :page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" label="Halaman pembeli" @update:page="pager.setPage" />
      </div>
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useOwnerData } from '@/composables/useOwnerData'
import { usePagination } from '@/composables/usePagination'
import { filterClients } from '@/services/marketing/marketingCrmService'
import { CRM_STATUSES, crmStatusLabel } from '@/utils/marketingStatus'

const { clients, loading, loaded, error, load } = useOwnerData()
const search = ref('')
const status = ref('')
const rows = computed(() => filterClients(clients.value, { search: search.value, crmStatus: status.value || null }))
const pager = usePagination(rows, { pageSize: 10, resetOn: [search, status] })
</script>
