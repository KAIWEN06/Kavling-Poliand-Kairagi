type Lot = {
  polygon_id?: string | number | null
  id?: string | number | null
  color?: string | null
  status?: string | null
}

export function getLotId(lot?: Lot | null) {
  if (!lot) return ''

  return String(lot.polygon_id || lot.id || '')
}

export function normalizeLotStatus(status?: string | null) {
  const value = status?.trim().toLowerCase()

  if (!value) return ''

  switch (value) {
    case 'available':
    case 'tersedia':
      return 'available'
    case 'booking':
    case 'dibooking':
    case 'booked':
    case 'reserved':
    case 'dipesan':
      return 'booking'
    case 'sold':
    case 'terjual':
      return 'sold'
    default:
      return value
  }
}

export function getLotStatusColor(lot?: Lot | null) {
  if (lot?.color) return lot.color

  switch (normalizeLotStatus(lot?.status)) {
    case 'available':
      return '#22c55e'
    case 'booking':
      return '#facc15'
    case 'sold':
      return '#ef4444'
    default:
      return '#ffffff'
  }
}

export function getStatusLabel(status?: string | null) {
  switch (normalizeLotStatus(status)) {
    case 'available':
      return 'Tersedia'
    case 'booking':
      return 'Dipesan'
    case 'sold':
      return 'Terjual'
    default:
      return status || '-'
  }
}

export function formatCurrency(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-'

  const numericValue = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numericValue)) return '-'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(numericValue)
}

export function formatDate(value?: string | number | Date | null) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}