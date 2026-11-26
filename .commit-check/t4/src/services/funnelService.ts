import { supabase } from '@/services/config/supabase'

export type FunnelStage = 'lot_view' | 'simulation_used' | 'survey_submitted' | 'spk_form_open' | 'spk_submitted'

/** Urutan dan nama tahap untuk ringkasan Admin. */
export const FUNNEL_STAGES: Array<{ key: FunnelStage; label: string }> = [
  { key: 'lot_view', label: 'Membuka kavling' },
  { key: 'simulation_used', label: 'Memakai simulasi' },
  { key: 'survey_submitted', label: 'Mengajukan survei' },
  { key: 'spk_form_open', label: 'Membuka formulir SPK' },
  { key: 'spk_submitted', label: 'Mengirim SPK' },
]

/** Acak per aplikasi dibuka, tidak disimpan dan tidak terkait akun. */
function randomSessionKey(): string {
  // randomUUID tidak ada di konteks non-HTTPS, misalnya server dev yang dibuka lewat IP.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

let sessionKey = ''
let disabled = false
const sent = new Set<string>()

async function send(stage: FunnelStage, lotId: number | null) {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return
  const dedupe = `${stage}:${lotId ?? ''}`
  if (sent.has(dedupe)) return
  sent.add(dedupe)
  sessionKey ||= randomSessionKey()
  const { error } = await supabase.rpc('log_funnel_event', {
    p_stage: stage,
    p_session: sessionKey,
    p_lot_id: lotId,
  })
  if (!error) return
  // PGRST202: fungsi belum ada (migrasi 202611300016 belum diterapkan).
  if (error.code === 'PGRST202') disabled = true
  else sent.delete(dedupe)
}

/** Tidak pernah melempar error dan tidak ditunggu: pencatatan tidak boleh mengganggu pembeli. */
export function trackFunnel(stage: FunnelStage, lotId?: number | string | null) {
  if (disabled) return
  const id = Number(lotId)
  void send(stage, Number.isSafeInteger(id) && id > 0 ? id : null).catch(() => undefined)
}

export async function getFunnelSummary(days: number): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_funnel_summary', { p_days: days })
  if (error) throw error
  return Object.fromEntries(((data ?? []) as Array<{ stage: string; sessions: number }>)
    .map((row) => [row.stage, Number(row.sessions)]))
}
