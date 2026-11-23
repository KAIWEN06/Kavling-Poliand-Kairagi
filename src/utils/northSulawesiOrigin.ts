import northSulawesiRegions from '@/data/northSulawesiRegions.json'

type AreaLevel = 'province' | 'regency' | 'district' | 'village'

type AreaRecord = {
  code: string
  name: string
  level: AreaLevel
  district?: string
  regency?: string
}

type AreaCandidate = {
  code: string
  name: string
  level: AreaLevel
  tokens: string[]
  district?: string
  regency?: string
}

type AreaMatch = {
  area: AreaCandidate
  typos: number
}

const areaPriority: Record<AreaLevel, number> = {
  province: 1,
  regency: 2,
  district: 3,
  village: 4,
}

const tokenAliases: Record<string, string> = {
  dlm: 'dalam',
  kep: 'kepulauan',
}

// Directory based on the wilayah.id administrative-area API, updated 2025-07-04.
const areaCandidates: AreaCandidate[] = [...new Map(
  (northSulawesiRegions as AreaRecord[])
    .map((area) => {
      const tokens = tokenize(area.name)
      return [area.code, { ...area, tokens }] as const
    }),
).values()]

function tokenize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => tokenAliases[token] ?? token)
}

function differsByOneCharacter(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false

  let leftIndex = 0
  let rightIndex = 0
  let differences = 0

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }

    differences += 1
    if (differences > 1) return false

    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else {
      leftIndex += 1
      rightIndex += 1
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) differences += 1
  return differences === 1
}

function tokenDistance(input: string, canonical: string) {
  if (input === canonical) return 0
  if (input.length < 4 || canonical.length < 4) return null
  return differsByOneCharacter(input, canonical) ? 1 : null
}

export function getNorthSulawesiOrigin(address: string | null | undefined) {
  if (!address?.trim()) return null

  const addressTokens = tokenize(address)
  const matches: AreaMatch[] = []

  for (const candidate of areaCandidates) {
    let bestTypos: number | null = null

    for (let start = 0; start <= addressTokens.length - candidate.tokens.length; start += 1) {
      let typos = 0
      let matchesCandidate = true

      for (let offset = 0; offset < candidate.tokens.length; offset += 1) {
        const distance = tokenDistance(addressTokens[start + offset], candidate.tokens[offset])
        if (distance === null) {
          matchesCandidate = false
          break
        }
        typos += distance
        if (typos > 1) {
          matchesCandidate = false
          break
        }
      }

      if (!matchesCandidate) continue
      if (typos > 0 && candidate.tokens.length === 1 && candidate.tokens[0].length < 7) continue
      bestTypos = bestTypos === null ? typos : Math.min(bestTypos, typos)
    }

    if (bestTypos !== null) {
      matches.push({ area: candidate, typos: bestTypos })
    }
  }

  if (!matches.length) return null

  const mostSpecificLevel = Math.max(...matches.map((match) => areaPriority[match.area.level]))
  const specificMatches = matches.filter((match) => areaPriority[match.area.level] === mostSpecificLevel)
  const meaningfulMatches = specificMatches.filter((match) => {
    const areaTokens = match.area.tokens
    const isShorterNameInsideAnotherMatch = specificMatches.some((other) => {
      if (other.area.name === match.area.name || other.area.tokens.length <= areaTokens.length) return false
      return other.area.tokens.some((_, start) =>
        areaTokens.every((token, offset) => other.area.tokens[start + offset] === token),
      )
    })
    if (isShorterNameInsideAnotherMatch) return false

    const isDistrictContext = match.area.level === 'village'
      && specificMatches.some((other) =>
        other.area.name !== match.area.name
        && other.area.level === 'village'
        && other.area.district
        && tokenize(other.area.district).join(' ') === areaTokens.join(' '),
      )
    return !isDistrictContext
  })
  if (!meaningfulMatches.length) return null

  const fewestTypos = Math.min(...meaningfulMatches.map((match) => match.typos))
  const closestNames = new Set(
    meaningfulMatches
      .filter((match) => match.typos === fewestTypos)
      .map((match) => match.area.name),
  )

  return closestNames.size === 1 ? [...closestNames][0] : null
}
