<template>
  <MarketingPageLayout title="Data pembeli" tab-variant="owner" show-back back-route="/owner/lainnya" @refresh="load()">
    <Reveal :order="1">
      <div class="mk-section">
        <label class="mk-field">
          <span>Cari</span>
          <input v-model="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nama, kota, atau nomor kaveling" />
        </label>
      </div>
    </Reveal>

    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat data pembeli">
      <Skeleton v-for="n in 5" :key="n" height="76px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Data pembeli belum dapat dimuat" :on-action="() => load()" />

    <Reveal v-else :order="2">
      <div class="mk-section">
        <div class="mk-table-wrap">
          <table class="mk-table mk-table--duo">
            <thead><tr><th scope="col">Pembeli</th><th scope="col" class="num">Kaveling</th></tr></thead>
            <tbody>
              <tr v-if="!pager.items.length">
                <td colspan="2" class="mk-muted">{{ search.trim() ? 'Tidak ada pembeli yang cocok. Coba kata lain.' : 'Belum ada pembeli.' }}</td>
              </tr>
              <tr v-for="buyer in pager.items" :key="buyer.id">
                <td>
                  <strong>{{ buyer.name }}</strong>
                  <small>{{ buyer.city }}</small>
                  <small v-if="buyer.contact">{{ buyer.contact }}</small>
                </td>
                <td class="num">
                  <div v-for="sale in buyer.sales" :key="sale.id">
                    <strong>{{ sale.lotNumber }}</strong>
                    <StatusBadge size="sm" :tone="sale.status === 'Sold' ? 'danger' : 'gold'" :label="sale.status === 'Sold' ? 'Lunas' : 'Dipesan'" />
                  </div>
                </td>
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
import StatusBadge from '@/components/ui/StatusBadge.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useOwnerData } from '@/composables/useOwnerData'
import { usePagination } from '@/composables/usePagination'
import type { OwnerSale } from '@/utils/ownerReport'

const { clients, sales, loading, loaded, error, load } = useOwnerData()
const search = ref('')

/* Hanya yang sudah memesan atau membeli; calon pembeli adalah urusan pemasaran. */
const buyers = computed(() => {
  const salesByBuyer = new Map<number, OwnerSale[]>()
  sales.value.forEach((sale) => salesByBuyer.set(sale.customerId, [...(salesByBuyer.get(sale.customerId) ?? []), sale]))
  const clientById = new Map(clients.value.map((client) => [Number(client.id), client]))
  return [...salesByBuyer].map(([id, owned]) => {
    const client = clientById.get(id)
    return {
      id,
      name: owned[0].customerName,
      city: client?.city_name || 'Kota belum diisi',
      contact: client?.phone || client?.email || '',
      sales: owned,
    }
  })
})
const rows = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase('id-ID')
  if (!needle) return buyers.value
  return buyers.value.filter((buyer) =>
    `${buyer.name} ${buyer.city} ${buyer.contact} ${buyer.sales.map((sale) => sale.lotNumber).join(' ')}`.toLocaleLowerCase('id-ID').includes(needle),
  )
})
const pager = usePagination(rows, { pageSize: 10, resetOn: [search] })
</script>
