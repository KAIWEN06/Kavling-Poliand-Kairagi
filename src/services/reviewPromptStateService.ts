import { supabase } from '@/services/config/supabase'
import {
  emptyPromptState,
  mergePromptStates,
  readPromptState,
  writePromptState,
  type ReviewPromptState,
} from '@/utils/reviewPrompt'

const TABLE = 'review_prompt_states'

/** Tabel belum ada (migrasi 202611300011 belum dijalankan). */
const isMissingTable = (error: { code?: string }) =>
  error.code === '42P01' || error.code === 'PGRST205'

async function pushRemote(userId: string, state: ReviewPromptState) {
  return supabase.from(TABLE).upsert({
    user_id: userId,
    seen: state.seen,
    dismissals: state.dismissals,
    snoozed_until: state.snoozedUntil ? new Date(state.snoozedUntil).toISOString() : null,
    view_days: state.viewDays,
    done: state.done,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Catatan gabungan server dan perangkat. `null` berarti catatan tidak dapat
 * dipastikan, sehingga ajakan sebaiknya tidak tampil.
 */
export async function loadPromptState(userId: string): Promise<ReviewPromptState | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('seen, dismissals, snoozed_until, view_days, done')
    .eq('user_id', userId)
    .maybeSingle()
  if (error && !isMissingTable(error)) {
    console.warn('[Ajakan ulasan] Catatan server tidak terbaca:', error)
    return null
  }

  const local = readPromptState(userId)
  if (!local) return null

  const remote: ReviewPromptState = data
    ? {
        seen: data.seen ?? [],
        dismissals: data.dismissals ?? 0,
        snoozedUntil: data.snoozed_until ? Date.parse(data.snoozed_until) : 0,
        viewDays: data.view_days ?? [],
        done: Boolean(data.done),
      }
    : emptyPromptState()

  const merged = mergePromptStates(local, remote)
  if (!writePromptState(userId, merged)) return null

  // Keputusan yang belum sampai ke server (mis. saat jaringan putus) dikirim ulang.
  const ahead = JSON.stringify(merged) !== JSON.stringify(mergePromptStates(remote, remote))
  if (!error && ahead) await pushRemote(userId, merged)

  return merged
}

/** Disimpan di perangkat lebih dulu agar tetap berlaku bila server gagal dihubungi. */
export async function savePromptState(userId: string, state: ReviewPromptState): Promise<boolean> {
  if (!writePromptState(userId, state)) return false
  const { error } = await pushRemote(userId, state)
  if (error && !isMissingTable(error)) {
    console.warn('[Ajakan ulasan] Catatan belum tersimpan di server:', error)
  }
  return true
}
