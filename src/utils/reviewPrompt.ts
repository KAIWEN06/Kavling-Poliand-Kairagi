/**
 * Aturan kapan ajakan menulis ulasan boleh tampil.
 * Setiap momen hanya ditawarkan sekali, dan ajakan berhenti selamanya
 * setelah klien pernah mengulas atau melewatinya dua kali.
 */

/** Urutan = prioritas bila beberapa momen tercapai bersamaan. */
export const REVIEW_MILESTONES = ['paid_off', 'survey_done', 'booking_paid'] as const
export type ReviewMilestone = (typeof REVIEW_MILESTONES)[number]

/** Setelah dilewati, ajakan berikutnya paling cepat sekian hari lagi. */
export const SNOOZE_DAYS = 30
export const MAX_DISMISSALS = 2
/** Didiamkan selama sekian hari berbeda dianggap dilewati. */
export const MAX_VIEW_DAYS = 3

const DAY_MS = 86_400_000

export interface ReviewPromptState {
  seen: ReviewMilestone[]
  dismissals: number
  snoozedUntil: number
  viewDays: string[]
  done: boolean
}

export const emptyPromptState = (): ReviewPromptState => ({
  seen: [],
  dismissals: 0,
  snoozedUntil: 0,
  viewDays: [],
  done: false,
})

export function pickMilestone(
  state: ReviewPromptState,
  reached: readonly ReviewMilestone[],
  now = Date.now(),
): ReviewMilestone | null {
  if (state.done || state.dismissals >= MAX_DISMISSALS || now < state.snoozedUntil) return null
  return REVIEW_MILESTONES.find((m) => reached.includes(m) && !state.seen.includes(m)) ?? null
}

/** Semua momen yang sudah tercapai ikut ditandai, agar tidak ditawarkan bergiliran. */
export function dismissPrompt(
  state: ReviewPromptState,
  reached: readonly ReviewMilestone[],
  now = Date.now(),
): ReviewPromptState {
  return {
    ...state,
    seen: [...new Set([...state.seen, ...reached])],
    dismissals: state.dismissals + 1,
    snoozedUntil: now + SNOOZE_DAYS * DAY_MS,
    viewDays: [],
  }
}

/** Catat bahwa kartu tampil hari ini; `expired` berarti sudah terlalu lama didiamkan. */
export function recordView(
  state: ReviewPromptState,
  today: string,
): { state: ReviewPromptState; expired: boolean } {
  if (state.viewDays.includes(today)) return { state, expired: false }
  if (state.viewDays.length >= MAX_VIEW_DAYS) return { state, expired: true }
  return { state: { ...state, viewDays: [...state.viewDays, today] }, expired: false }
}

/**
 * Gabungkan catatan perangkat ini dengan catatan server tanpa pernah
 * menghapus keputusan "lewati" atau "sudah mengulas" dari salah satunya.
 */
export function mergePromptStates(a: ReviewPromptState, b: ReviewPromptState): ReviewPromptState {
  // `dismissPrompt` mengosongkan viewDays, jadi hitungan hari ikut catatan yang lebih maju.
  const viewDays =
    a.dismissals === b.dismissals
      ? [...new Set([...a.viewDays, ...b.viewDays])]
      : (a.dismissals > b.dismissals ? a : b).viewDays
  return {
    seen: REVIEW_MILESTONES.filter((m) => a.seen.includes(m) || b.seen.includes(m)),
    dismissals: Math.max(a.dismissals, b.dismissals),
    snoozedUntil: Math.max(a.snoozedUntil, b.snoozedUntil),
    viewDays: [...viewDays].sort().slice(-MAX_VIEW_DAYS),
    done: a.done || b.done,
  }
}

const storageKey =(userId: string) => `poliland_review_prompt:${userId}`

export function readPromptState(userId: string): ReviewPromptState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return { ...emptyPromptState(), ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    // Tanpa penyimpanan, frekuensi tidak bisa dijaga: lebih baik tidak mengajak.
    return null
  }
}

export function writePromptState(userId: string, state: ReviewPromptState): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
