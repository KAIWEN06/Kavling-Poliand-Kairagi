import { shallowRef, watch } from 'vue'
import { useRoute, type LocationQuery } from 'vue-router'

/**
 * Query URL milik halaman ini saja.
 * Ionic menyimpan halaman di tumpukan, sedangkan useRoute() selalu menunjuk rute
 * yang sedang aktif. Tanpa pembatas ini, membuka detail klien lalu kembali akan
 * mereset filter atau tab halaman sebelumnya.
 */
export function useOwnRouteQuery() {
  const route = useRoute()
  const ownPath = route.path
  const query = shallowRef<LocationQuery>(route.query)
  let key = JSON.stringify(route.query)

  watch(() => route.fullPath, () => {
    if (route.path !== ownPath) return
    const next = JSON.stringify(route.query)
    if (next === key) return
    key = next
    query.value = route.query
  })

  return query
}
