import { describe, expect, test } from 'vitest'
import { PHYSICAL_BLOCKS, buildSiteplanBlocks, findBlockOfLot } from '@/utils/siteplanBlocks'
import {
  FLIGHT_MAX_MS,
  FLIGHT_MIN_MS,
  advanceClock,
  cameraEase,
  createFlight,
  frameRect,
  worldToScreen,
  zoomAround,
} from '@/utils/siteplanCamera'
import svgRaw from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import migrationSql from '../../supabase/migrations/202611300008_lot_blocks_a_to_l.sql?raw'

const allIds = PHYSICAL_BLOCKS.flatMap((block) => block.lotIds)
const lots = () => allIds.map((id) => ({ polygon_id: id, status: 'available' }))

describe('blok fisik denah', () => {
  test('memuat setiap bentuk SVG tepat satu kali', () => {
    const svgIds = [...svgRaw.matchAll(/id="(LOT_[^"]+)"/g)].map((m) => m[1])
    expect([...allIds].sort()).toEqual([...svgIds].sort())
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  test('dinamai A sampai L berurutan', () => {
    const blocks = buildSiteplanBlocks(lots())
    expect(blocks.map((block) => block.shortLabel).join('')).toBe('ABCDEFGHIJKL')
    expect(findBlockOfLot(blocks, { polygon_id: 'LOT_004' })?.name).toBe('Blok B')
  })

  test('migrasi database memakai pembagian yang sama dengan kode', () => {
    const rows = [...migrationSql.matchAll(/\('([A-L])', '(LOT_[0-9A]+)'\)/g)].map((m) => `${m[1]}:${m[2]}`)
    const expected = PHYSICAL_BLOCKS.flatMap((b) => b.lotIds.map((id) => `${b.code}:${id}`))
    expect(rows).toEqual(expected)
  })

  test('menghitung kavling tersedia', () => {
    const data = lots()
    data[0]!.status = 'sold'
    expect(buildSiteplanBlocks(data)[0]).toMatchObject({ total: 3, available: 2 })
  })
})

describe('kamera denah', () => {
  const size = { width: 390, height: 780 }
  const viewBox = { x: 0, y: 0, width: 1252, height: 1257 }
  const home = { panX: 0, panY: 0, scale: 1.25, rotation: 0 }
  const rect = { x: 900, y: 150, width: 150, height: 100 }
  const insets = { top: 20, right: 20, bottom: 500, left: 20 }

  test.each([0, 90, 180, 270])('membingkai target di tengah area bebas (rotasi %i)', (rotation) => {
    const camera = frameRect(rect, { size, viewBox, rotation, insets, minScale: 0.6, maxScale: 8 })
    const point = worldToScreen(975, 200, camera, size, viewBox)
    expect(point.x).toBeCloseTo(195, 3)
    expect(point.y).toBeCloseTo((20 + 280) / 2, 3)
  })

  test('lintasan mulai dan berakhir tepat, tanpa NaN', () => {
    const to = { panX: -900, panY: 600, scale: 6, rotation: 90 }
    for (const target of [to, { ...home, scale: 3 }, home]) {
      const flight = createFlight(home, target, size)
      const first = flight.at(0)
      expect(first.panX).toBeCloseTo(home.panX, 3)
      expect(first.scale).toBeCloseTo(home.scale, 3)
      const nearEnd = flight.at(0.9999)
      expect(nearEnd.panX).toBeCloseTo(target.panX, 0)
      expect(nearEnd.scale).toBeCloseTo(target.scale, 2)
      for (let i = 0; i <= 20; i++) {
        expect(Object.values(flight.at(i / 20)).every(Number.isFinite)).toBe(true)
      }
    }
  })

  test('durasi lembut untuk perpindahan level', () => {
    for (const to of [{ ...home, scale: 2 }, { panX: -900, panY: 600, scale: 6, rotation: 0 }, home]) {
      const { duration } = createFlight(home, to, size)
      expect(duration).toBeGreaterThanOrEqual(FLIGHT_MIN_MS)
      expect(duration).toBeLessThanOrEqual(FLIGHT_MAX_MS)
    }
  })

  test('tujuan yang dekat bergerak lurus di layar, tanpa berbalik', () => {
    const near = { x: 700, y: 560, width: 150, height: 100 }
    const to = frameRect(near, { size, viewBox, rotation: 0, insets, minScale: 0.6, maxScale: 8 })
    const flight = createFlight(home, to, size)
    const points = Array.from({ length: 21 }, (_, i) =>
      worldToScreen(775, 610, flight.at(i / 20), size, viewBox))
    const first = points[0]!
    const last = points[20]!
    const dx = last.x - first.x
    const dy = last.y - first.y
    let travelled = 0
    for (const point of points) {
      expect((point.x - first.x) * dy - (point.y - first.y) * dx).toBeCloseTo(0, 3)
      const along = ((point.x - first.x) * dx + (point.y - first.y) * dy) / (dx * dx + dy * dy)
      expect(along).toBeGreaterThanOrEqual(travelled - 1e-9)
      travelled = along
    }
  })

  test('easing mulai lembut dan selalu maju', () => {
    /* Frame pertama 60 Hz pada penerbangan terpendek: di bawah 3% perjalanan. */
    expect(cameraEase(16.7 / FLIGHT_MIN_MS)).toBeLessThan(0.03)
    let last = 0
    for (let i = 1; i <= 100; i++) {
      expect(cameraEase(i / 100)).toBeGreaterThanOrEqual(last)
      last = cameraEase(i / 100)
    }
    expect(last).toBe(1)
  })

  test('jam animasi sama di 60 dan 120 Hz, dan tidak meloncat setelah tersendat', () => {
    const run = (hz: number) => {
      let elapsed = 0
      for (let i = 0; i < hz / 2; i++) elapsed = advanceClock(elapsed, 1000 / hz)
      return elapsed
    }
    expect(run(60)).toBeCloseTo(500, 6)
    expect(run(120)).toBeCloseTo(500, 6)
    expect(advanceClock(100, 250)).toBe(134)
  })

  test('rotasi mengambil arah terpendek', () => {
    const flight = createFlight({ ...home, rotation: 270 }, { ...home, rotation: 0 }, size)
    expect(flight.at(0.5).rotation).toBeCloseTo(270 + 90 * cameraEase(0.5), 3)
  })

  test('zoomAround mempertahankan titik di bawah jari', () => {
    const next = zoomAround(home, 2.5, 100, -50)
    expect((100 - next.panX) / next.scale).toBeCloseTo(100 / 1.25, 6)
  })
})
