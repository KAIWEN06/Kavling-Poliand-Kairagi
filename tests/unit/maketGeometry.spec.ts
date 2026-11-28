import { describe, expect, it } from 'vitest'
import svgRaw from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import { FLAT_VIEW, GROUND, createProjector, parseLotShapes, parsePathPoints, wallPaths } from '@/utils/maketGeometry'

describe('maketGeometry', () => {
  const shapes = parseLotShapes(svgRaw)

  it('membaca setiap petak dengan ID persis seperti di SVG', () => {
    const idsInFile = [...svgRaw.matchAll(/id="(LOT_[^"]+)"/g)].map((match) => match[1])
    expect(shapes.map((shape) => shape.id)).toEqual(idsInFile)
    expect(shapes.map((shape) => shape.id)).toContain('LOT_12A')
  })

  it('menghasilkan poligon yang utuh di dalam permukaan maket', () => {
    for (const { points } of shapes) {
      expect(points.length).toBeGreaterThanOrEqual(3)
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(GROUND.x)
        expect(x).toBeLessThanOrEqual(GROUND.x + GROUND.width)
        expect(y).toBeGreaterThanOrEqual(GROUND.y)
        expect(y).toBeLessThanOrEqual(GROUND.y + GROUND.height)
      }
    }
  })

  it('mendukung H, V, dan kurva C', () => {
    expect(parsePathPoints('M0 0H10V10H0Z')).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]])
    const curved = parsePathPoints('M0 0C0 10 10 10 10 0Z')
    expect(curved.length).toBeGreaterThan(3)
    expect(curved[curved.length - 1]).toEqual([10, 0])
  })

  it('hanya menggambar sisi yang menghadap penonton', () => {
    const square = parsePathPoints('M500 500H600V600H500Z')
    const walls = wallPaths(square, createProjector(FLAT_VIEW), 0, 20)
    expect(walls.front.match(/M/g)).toHaveLength(1)
    expect(walls.side).toBe('')
  })
})
