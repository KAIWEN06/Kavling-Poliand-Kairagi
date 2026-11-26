import { describe, expect, it } from 'vitest'
import {
  MAX_VIEW_DAYS,
  SNOOZE_DAYS,
  dismissPrompt,
  emptyPromptState,
  mergePromptStates,
  pickMilestone,
  recordView,
} from '@/utils/reviewPrompt'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 26)

describe('ajakan ulasan', () => {
  it('tidak tampil sebelum ada momen atau setelah klien mengulas', () => {
    expect(pickMilestone(emptyPromptState(), [], NOW)).toBeNull()
    expect(pickMilestone({ ...emptyPromptState(), done: true }, ['paid_off'], NOW)).toBeNull()
  })

  it('memilih momen terpenting bila beberapa tercapai', () => {
    expect(pickMilestone(emptyPromptState(), ['booking_paid', 'paid_off'], NOW)).toBe('paid_off')
  })

  it('setelah dilewati, diam 30 hari lalu hanya menawarkan momen baru', () => {
    const state = dismissPrompt(emptyPromptState(), ['survey_done'], NOW)
    const later = NOW + SNOOZE_DAYS * DAY
    expect(pickMilestone(state, ['survey_done', 'booking_paid'], later - 1)).toBeNull()
    expect(pickMilestone(state, ['survey_done'], later)).toBeNull()
    expect(pickMilestone(state, ['survey_done', 'booking_paid'], later)).toBe('booking_paid')
  })

  it('berhenti selamanya setelah dilewati dua kali', () => {
    const once = dismissPrompt(emptyPromptState(), ['survey_done'], NOW)
    const twice = dismissPrompt(once, ['booking_paid'], NOW + 40 * DAY)
    expect(pickMilestone(twice, ['paid_off'], NOW + 400 * DAY)).toBeNull()
  })

  it('menganggap didiamkan beberapa hari sebagai dilewati', () => {
    let state = emptyPromptState()
    for (let day = 1; day <= MAX_VIEW_DAYS; day++) {
      const result = recordView(state, `2026-11-0${day}`)
      expect(result.expired).toBe(false)
      state = result.state
    }
    expect(recordView(state, `2026-11-0${MAX_VIEW_DAYS}`).expired).toBe(false)
    expect(recordView(state, '2026-11-20').expired).toBe(true)
  })

  it('Lewati di satu perangkat berlaku di perangkat lain', () => {
    const other = recordView(emptyPromptState(), '2026-11-20').state
    const skipped = dismissPrompt(emptyPromptState(), ['survey_done'], NOW)
    const merged = mergePromptStates(other, skipped)
    expect(merged).toEqual(skipped)
    expect(pickMilestone(merged, ['survey_done'], NOW)).toBeNull()
  })

  it('menggabungkan hari tampil dan tidak membatalkan "sudah mengulas"', () => {
    const a = { ...emptyPromptState(), viewDays: ['2026-11-02'] }
    const b = { ...emptyPromptState(), viewDays: ['2026-11-01'], done: true }
    const merged = mergePromptStates(a, b)
    expect(merged.viewDays).toEqual(['2026-11-01', '2026-11-02'])
    expect(merged.done).toBe(true)
  })
})
