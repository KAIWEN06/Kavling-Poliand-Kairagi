import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/services/config/supabase'

/**
 * Satu koneksi sinyal perubahan data untuk seluruh aplikasi.
 *
 * Database hanya mengirim nama tabel yang berubah (migrasi
 * 202611300010_realtime_change_signals.sql). Pelanggan lalu memuat ulang datanya
 * sendiri lewat query biasa, sehingga RLS tetap berlaku.
 *
 * Sinyal yang terkirim saat koneksi putus tidak diulang oleh server. Karena itu
 * semua pelanggan disinkronkan ulang setelah tersambung kembali, saat perangkat
 * online lagi, dan saat aplikasi kembali dari latar belakang.
 */

const PUBLIC_TOPIC = 'poliland:public'
const PRIVATE_TOPIC = 'poliland:private'

/** Jeda singkat di latar belakang (mis. membuka pemilih berkas) tidak perlu sinkron ulang. */
const RESYNC_AFTER_HIDDEN_MS = 5000

interface Subscriber {
  tables: ReadonlySet<string>
  notify: () => void
}

const subscribers = new Set<Subscriber>()
const channels = new Map<string, RealtimeChannel>()
const droppedTopics = new Set<string>()

let userId: string | null = null
let started = false
let hiddenAt = 0
let queue: Promise<unknown> = Promise.resolve()

function dispatch(table: string) {
  subscribers.forEach((subscriber) => {
    if (subscriber.tables.has(table)) subscriber.notify()
  })
}

function resyncAll() {
  subscribers.forEach((subscriber) => subscriber.notify())
}

function join(topic: string) {
  if (channels.has(topic)) return
  const channel = supabase
    .channel(topic, { config: { private: true } })
    .on('broadcast', { event: 'change' }, (message) => {
      const table = (message.payload as { table?: unknown } | undefined)?.table
      if (typeof table === 'string') dispatch(table)
    })
  channels.set(topic, channel)
  channel.subscribe((status) => {
    if (channels.get(topic) !== channel) return
    if (status === 'SUBSCRIBED') {
      if (droppedTopics.delete(topic)) resyncAll()
    } else {
      // supabase-js menyambung ulang sendiri; cukup catat bahwa ada celah.
      droppedTopics.add(topic)
    }
  })
}

async function leave(topic: string) {
  const channel = channels.get(topic)
  if (!channel) return
  channels.delete(topic)
  droppedTopics.delete(topic)
  await supabase.removeChannel(channel)
}

/** Operasi channel diantrekan agar join tidak mendahului removeChannel yang belum selesai. */
function enqueue(task: () => unknown) {
  queue = queue.then(task).catch((error) => console.warn('[Realtime] Gagal mengatur channel:', error))
}

function applyUser(nextUserId: string | null) {
  enqueue(async () => {
    if (nextUserId !== userId) {
      // Izin channel diperiksa saat join, jadi ganti akun harus join ulang.
      await leave(PRIVATE_TOPIC)
      await leave(PUBLIC_TOPIC)
      userId = nextUserId
    }
    join(PUBLIC_TOPIC)
    if (userId) join(PRIVATE_TOPIC)
  })
}

function start() {
  if (started) return
  started = true

  supabase.auth.onAuthStateChange((_event, session) => {
    const nextUserId = session?.user.id ?? null
    // Memanggil API Supabase langsung di dalam callback auth dapat membuatnya deadlock.
    window.setTimeout(() => applyUser(nextUserId), 0)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
    } else if (hiddenAt && Date.now() - hiddenAt >= RESYNC_AFTER_HIDDEN_MS) {
      hiddenAt = 0
      resyncAll()
    }
  })
  window.addEventListener('online', resyncAll)
}

export function subscribeToTables(tables: readonly string[], notify: () => void): () => void {
  start()
  const subscriber: Subscriber = { tables: new Set(tables), notify }
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}
