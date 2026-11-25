import { computed, reactive, ref, watch, type ComputedRef, type Ref, type WatchSource } from 'vue'

/** Satu angka halaman, atau `null` untuk elipsis. */
export type PageToken = number | null

/**
 * Daftar nomor halaman yang ditampilkan: halaman 1, jendela di sekitar halaman aktif,
 * halaman terakhir, dan elipsis di sela-selanya. Sumber tunggal untuk semua pager.
 */
export function buildPageWindow(current: number, total: number): PageToken[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: PageToken[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push(null)
  for (let value = start; value <= end; value += 1) pages.push(value)
  if (end < total - 1) pages.push(null)
  pages.push(total)
  return pages
}

export interface PaginationOptions {
  pageSize: number
  /** Setiap perubahan sumber ini (filter, pencarian, urutan) mengembalikan halaman ke 1. */
  resetOn?: WatchSource<unknown> | WatchSource<unknown>[]
}

/**
 * Status halaman murni (tanpa data). Dipakai langsung untuk pagination sisi server,
 * dan dibungkus oleh `usePagination` untuk pagination di sisi klien.
 */
export function usePageState(total: Ref<number> | ComputedRef<number>, options: PaginationOptions) {
  const pageSize = options.pageSize
  const page = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  const from = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize + 1))
  const to = computed(() => Math.min(total.value, page.value * pageSize))

  function setPage(next: number) {
    page.value = Math.min(Math.max(1, Math.trunc(next) || 1), totalPages.value)
  }
  function reset() {
    page.value = 1
  }

  // Data menyusut (hapus, filter): jangan biarkan halaman menunjuk ke ruang kosong.
  watch(totalPages, (count) => {
    if (page.value > count) page.value = count
  })
  if (options.resetOn) watch(options.resetOn as WatchSource<unknown>, reset)

  const pages = computed(() => buildPageWindow(page.value, totalPages.value))

  return reactive({ page, pageSize, total, totalPages, from, to, pages, setPage, reset })
}

/** Pagination sisi klien: potong `source` per halaman. */
export function usePagination<T>(source: Ref<T[]> | ComputedRef<T[]>, options: PaginationOptions) {
  const total = computed(() => source.value.length)
  const state = usePageState(total, options)
  const items = computed(() => source.value.slice((state.page - 1) * options.pageSize, state.page * options.pageSize))
  return reactive({
    page: toRefPage(state),
    pageSize: options.pageSize,
    total,
    totalPages: computed(() => state.totalPages),
    from: computed(() => state.from),
    to: computed(() => state.to),
    pages: computed(() => state.pages),
    items,
    setPage: state.setPage,
    reset: state.reset,
  })
}

// `page` harus tetap bisa ditulis lewat v-model:page, jadi dibungkus sebagai ref dua arah.
function toRefPage(state: ReturnType<typeof usePageState>) {
  return computed({
    get: () => state.page,
    set: (value: number) => state.setPage(value),
  })
}
