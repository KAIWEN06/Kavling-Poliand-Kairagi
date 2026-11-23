import { supabase } from './config/supabase'
import { LOCATION_SETTINGS_KEY, normalizeLocationSettings, type LocationSettings } from '@/utils/locationSettings'

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface DayOperatingHours {
  open: string
  close: string
  closed: boolean
}

export interface OperatingHoursConfig {
  timezone: 'Asia/Makassar'
  days: Record<DayKey, DayOperatingHours>
}

export interface ContactRecord {
  id: string
  key: string
  label: string
  value: string
  icon: string | null
  updated_at: string
}

export const DAY_OPTIONS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Senin' },
  { key: 'tuesday', label: 'Selasa' },
  { key: 'wednesday', label: 'Rabu' },
  { key: 'thursday', label: 'Kamis' },
  { key: 'friday', label: 'Jumat' },
  { key: 'saturday', label: 'Sabtu' },
  { key: 'sunday', label: 'Minggu' },
]

export function createDefaultOperatingHours(): OperatingHoursConfig {
  const closedDay: DayOperatingHours = { open: '09:00', close: '17:00', closed: true }
  return {
    timezone: 'Asia/Makassar',
    days: {
      monday: { ...closedDay },
      tuesday: { ...closedDay },
      wednesday: { ...closedDay },
      thursday: { ...closedDay },
      friday: { ...closedDay },
      saturday: { ...closedDay },
      sunday: { ...closedDay },
    },
  }
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function normalizeOperatingHours(value: unknown): OperatingHoursConfig {
  const fallback = createDefaultOperatingHours()
  let parsed: any = value

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return fallback
    }
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.days) return fallback

  for (const day of DAY_OPTIONS) {
    const raw = parsed.days[day.key]
    if (!raw || typeof raw !== 'object') continue
    const open = isTime(raw.open) ? raw.open : fallback.days[day.key].open
    const close = isTime(raw.close) ? raw.close : fallback.days[day.key].close
    fallback.days[day.key] = {
      open,
      close,
      closed: Boolean(raw.closed) || open >= close,
    }
  }

  return fallback
}

export const contactsService = {
  async getAll(): Promise<ContactRecord[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, key, label, value, icon, updated_at')
      .order('label', { ascending: true })

    if (error) throw error
    return (data ?? []) as ContactRecord[]
  },

  /** Simpan banyak pengaturan sekaligus (kunci unik). Dipakai panel Kontak dan teks ajakan di Beranda. */
  async saveMany(entries: { key: string; label: string; value: string; icon?: string | null }[]): Promise<void> {
    const now = new Date().toISOString()
    const rows = entries.map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: entry.value.trim(),
      ...(entry.icon !== undefined ? { icon: entry.icon } : {}),
      updated_at: now,
    }))
    const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'key' })
    if (error) throw error
  },

  async getLocationSettings(): Promise<LocationSettings> {
    const { data, error } = await supabase.from('contacts').select('value').eq('key', LOCATION_SETTINGS_KEY).maybeSingle()
    if (error) throw error
    return normalizeLocationSettings(data?.value)
  },

  async saveLocationSettings(settings: LocationSettings): Promise<void> {
    await this.saveMany([{ key: LOCATION_SETTINGS_KEY, label: 'Pengaturan Lokasi', value: JSON.stringify(settings), icon: 'location' }])
  },

  async getOperatingHours(): Promise<OperatingHoursConfig> {
    const { data, error } = await supabase
      .from('contacts')
      .select('value')
      .eq('key', 'operating_hours')
      .maybeSingle()

    if (error) throw error
    return normalizeOperatingHours(data?.value)
  },

  async saveOperatingHours(config: OperatingHoursConfig): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .upsert({
        key: 'operating_hours',
        label: 'Jam Operasional',
        value: JSON.stringify(config),
        icon: 'clock',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (error) throw error
  },

  async getClientContactSettings(): Promise<{
    whatsapp: string
    operatingHours: OperatingHoursConfig
  }> {
    const rows = await this.getAll()
    const normalizedKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '')
    const whatsappCandidates = new Set([
      'whatsapp',
      'whatsappadmin',
      'adminwhatsapp',
      'contactwhatsapp',
      'nomorwhatsapp',
      'nowhatsapp',
      'phone',
      'telephone',
      'nomorhp',
      'nohp',
    ])

    const whatsappRecord = rows.find((row) => whatsappCandidates.has(normalizedKey(row.key)))
      ?? rows.find((row) => /whatsapp|telepon|nomor hp|no hp/i.test(`${row.key} ${row.label}`))

    let whatsapp = String(whatsappRecord?.value ?? '').replace(/\D/g, '')
    if (whatsapp.startsWith('0')) whatsapp = `62${whatsapp.slice(1)}`

    const hoursRecord = rows.find((row) => normalizedKey(row.key) === 'operatinghours')
    return {
      whatsapp,
      operatingHours: normalizeOperatingHours(hoursRecord?.value),
    }
  },
}
