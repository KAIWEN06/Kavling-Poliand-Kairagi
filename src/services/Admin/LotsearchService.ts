/**
 * Fungsi murni untuk pencarian kavling berdasarkan harga, ukuran, dan luas.
 * Aturan parsing mengikuti SearchBox.vue (halaman siteplan publik),
 * ditambah dukungan singkatan harga seperti "400jt" atau "1,2 M".
 */

export interface Dimension {
  width: number
  length: number
}

/** "150000000", "Rp150.000.000", "200,5" -> number. Teks kosong/tidak valid -> null. */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  let text = String(value).trim().replace(/rp/gi, '').replace(/\s/g, '')
  if (!text) return null

  // 150.000.000 -> 150000000 ; 200,5 -> 200.5
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  } else {
    text = text.replace(/,/g, '.').replace(/[^\d.-]/g, '')
  }

  if (!/\d/.test(text)) return null

  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/** Harga dengan singkatan: "400jt", "400 juta", "1,2 M", "1.5 miliar", atau angka biasa. */
export function parsePrice(value: string): number | null {
  const text = value.trim().toLowerCase().replace(/rp/g, '').replace(/\s/g, '')
  if (!text) return null

  const match = text.match(/^([\d.,]+)(jt|juta|m|miliar|milyar)$/)
  if (match) {
    const base = parseNumber(match[1])
    if (base === null) return null
    const factor = match[2] === 'jt' || match[2] === 'juta' ? 1_000_000 : 1_000_000_000
    return Math.round(base * factor)
  }

  return parseNumber(text)
}

function parseDimensionPart(value: string): number | null {
  let text = value.trim()

  if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  } else {
    text = text.replace(',', '.')
  }

  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/** "10x20", "10 x 20", "10×20", "10,5x20" -> { width, length } */
export function parseDimension(value: string | null | undefined): Dimension | null {
  if (value === null || value === undefined) return null

  const text = String(value).toLowerCase().replace(/\s/g, '').replace(/[×*]/g, 'x')
  const match = text.match(/([\d.,]+)x([\d.,]+)/)
  if (!match) return null

  const width = parseDimensionPart(match[1])
  const length = parseDimensionPart(match[2])
  if (width === null || length === null) return null

  return { width, length }
}

/** Selisih ukuran; 10x20 dan 20x10 dianggap sama. Infinity bila ukuran kavling tidak terbaca. */
export function dimensionDistance(lotDimension: string | null | undefined, target: Dimension): number {
  const lot = parseDimension(lotDimension)
  if (!lot) return Infinity

  const normal = Math.abs(lot.width - target.width) + Math.abs(lot.length - target.length)
  const reversed = Math.abs(lot.width - target.length) + Math.abs(lot.length - target.width)

  return Math.min(normal, reversed)
}