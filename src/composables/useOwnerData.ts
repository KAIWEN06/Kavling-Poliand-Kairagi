import { computed, onMounted, ref } from 'vue'
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { customerService } from '@/services/marketing/customerService'
import { listClients, type ClientListItem } from '@/services/marketing/marketingCrmService'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { buildPayments, buildSales } from '@/utils/ownerReport'
import { normalizeLotStatus } from '@/utils/siteplan'
import type { FinanceCustomerRecord } from '@/types/finance'

const TABLES = ['lots', 'customers', 'lot_transactions', 'payments'] as const

/** Data seluruh perusahaan untuk panel Owner. Memakai service yang sama dengan Admin dan pemasaran. */
export function useOwnerData() {
  const lots = ref<SiteplanLot[]>([])
  const clients = ref<ClientListItem[]>([])
  const records = ref<FinanceCustomerRecord[]>([])
  const loading = ref(true)
  const loaded = ref(false)
  const error = ref('')

  async function load({ silent = false }: LoadOptions = {}) {
    if (!silent) {
      loading.value = true
      error.value = ''
    }
    try {
      const [lotRows, clientRows, customerRows] = await Promise.all([
        getLots({ forceRefresh: true }),
        listClients(),
        customerService.getAdminCustomers(),
      ])
      lots.value = lotRows
      clients.value = clientRows
      records.value = customerRows
      loaded.value = true
      error.value = ''
    } catch (cause) {
      if (!silent) error.value = cause instanceof Error ? cause.message : 'Data belum dapat dimuat.'
    } finally {
      loading.value = false
    }
  }

  const inventory = computed(() => {
    const counts = { total: lots.value.length, available: 0, booking: 0, sold: 0 }
    lots.value.forEach((lot) => {
      const status = normalizeLotStatus(lot.status)
      if (status === 'available' || status === 'booking' || status === 'sold') counts[status] += 1
    })
    return counts
  })
  const sales = computed(() => buildSales(records.value))
  const payments = computed(() => buildPayments(records.value))

  onMounted(() => void load())
  useRealtimeRefresh(TABLES, () => load({ silent: true }))

  return { lots, clients, sales, payments, inventory, loading, loaded, error, load }
}
