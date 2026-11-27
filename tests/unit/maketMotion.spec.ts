import { describe, expect, it } from 'vitest'
import { followTarget, maketProgress, segment } from '@/utils/maketMotion'

describe('maketMotion', () => {
  it('membatasi progres antara 0 dan 1', () => {
    expect(maketProgress(2000, 800)).toBe(0)
    expect(maketProgress(0, 800)).toBe(1)
    expect(maketProgress(500, 0)).toBe(0)
  })

  it('naik terus saat maket bergerak ke atas layar', () => {
    expect(maketProgress(400, 800)).toBeGreaterThan(maketProgress(600, 800))
  })

  it('memetakan sebagian progres ke 0..1', () => {
    expect(segment(0.1, 0.2, 0.6)).toBe(0)
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5)
    expect(segment(0.9, 0.2, 0.6)).toBe(1)
  })

  it('mendekati target tanpa melewatinya, lalu berhenti tepat di target', () => {
    let value = 0
    for (let frame = 0; frame < 120; frame += 1) {
      const next = followTarget(value, 1, 16)
      expect(next).toBeGreaterThanOrEqual(value)
      expect(next).toBeLessThanOrEqual(1)
      value = next
    }
    expect(value).toBe(1)
  })

  it('menempuh jarak yang sama pada 60Hz dan 120Hz', () => {
    const sixty = followTarget(0, 1, 16)
    const oneTwenty = followTarget(followTarget(0, 1, 8), 1, 8)
    expect(oneTwenty).toBeCloseTo(sixty, 6)
  })
})
