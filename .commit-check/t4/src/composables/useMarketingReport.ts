import { computed, ref } from 'vue'
import type { LoadOptions } from '@/composables/useRealtimeRefresh'
import { getMarketingReport, type MarketingReport } from '@/services/marketing/marketingCrmService'

const monthShort = new Intl.DateTimeFormat('id-ID', { month: 'short' })
const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

export function bucketLabel(bucket: string, unit: 'day' | 'week' | 'month') {
  const date = new Date(`${bucket.slice(0, 10)}T00:00:00`)
  if (unit === 'month') return `${monthShort.format(date)} ${String(date.getFullYear()).slice(2)}`
  if (unit === 'week') return `Mg ${dayMonth.format(date)}`
  return dayMonth.format(date)
}

/** Memuat laporan RPC get_marketing_report untuk rentang & Marketing tertentu. */
export function useMarketingReport() {
  const report = ref<MarketingReport | null>(null)
  const loading = ref(false)
  const error = ref('')
  const range = ref<{ from: string; to: string; marketingId: string | null }>({ from: '', to: '', marketingId: null })

  async function load(next?: { from: string; to: string; marketingId: string | null }, { silent = false }: LoadOptions = {}) {
    if (next) range.value = next
    if (!range.value.from) return
    if (!silent) {
      loading.value = true
      error.value = ''
    }
    const requested = range.value
    try {
      const result = await getMarketingReport(requested.from, requested.to, requested.marketingId)
      // Filter bisa diganti saat permintaan berjalan; hasil rentang lama diabaikan.
      if (requested !== range.value) return
      report.value = result
      error.value = ''
    } catch (cause) {
      if (!silent) error.value = cause instanceof Error ? cause.message : 'Laporan belum dapat dimuat.'
    } finally {
      loading.value = false
    }
  }

  const s = computed(() => report.value?.summary ?? ({} as MarketingReport['summary']))
  const crm = (status: string) => Number(s.value.crm?.[status] ?? 0)

  return { report, loading, error, range, load, s, crm }
}
