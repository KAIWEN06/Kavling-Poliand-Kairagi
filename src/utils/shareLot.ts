import { Capacitor } from '@capacitor/core'

export interface ShareContent {
  title: string
  text: string
  url?: string
}

export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'failed'

/**
 * Tautan publik ke satu kavling di denah.
 * Di aplikasi native origin-nya https://localhost, yang tidak bisa dibuka penerima, jadi
 * alamat web harus diisi lewat VITE_PUBLIC_WEB_URL. Kosong berarti belum ada tautan.
 */
export function lotShareUrl(lotId: number | string): string {
  const base = publicWebUrl()
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/siteplan?kavling=${encodeURIComponent(String(lotId))}`
}

/** Alamat web publik aplikasi, atau kosong bila belum ada. */
function publicWebUrl(): string {
  let base = String(import.meta.env.VITE_PUBLIC_WEB_URL || '').trim()

  if (!base && !Capacitor.isNativePlatform()) {
    const { origin, hostname } = window.location
    if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
      base = origin + import.meta.env.BASE_URL
    }
  }

  return base
}

/**
 * Rute dalam aplikasi untuk tautan kavling yang dibuka dari luar (Android App Links).
 * Hanya alamat web milik sendiri yang diterima; selain itu null.
 */
export function sharedLotPath(link: string): string | null {
  const web = publicWebUrl()
  if (!web) return null
  try {
    const url = new URL(link)
    const base = new URL(web)
    const path = `${base.pathname.replace(/\/+$/, '')}/siteplan`
    const lotId = url.searchParams.get('kavling') ?? ''
    if (url.protocol !== 'https:' || url.host !== base.host) return null
    if (url.pathname.replace(/\/+$/, '') !== path || !/^\d+$/.test(lotId)) return null
    return `/siteplan?kavling=${lotId}`
  } catch {
    return null
  }
}

export interface LotShareInput {
  id?: number | string
  name: string
  block?: string
  /** Ukuran atau dimensi, sudah berbentuk teks. */
  details?: string
  /** Harga berformat. Isi hanya untuk kaveling yang masih tersedia. */
  price?: string
  status: string
}

/** Isi yang dikirim ke luar aplikasi: hanya data publik, tanpa pembeli dan kesepakatan. */
export function lotShareContent({ id, name, block, details, price, status }: LotShareInput): ShareContent {
  return {
    title: `${name} PoliLand Kairagi`,
    text: [
      `${block ? `${name}, ${block}` : name} di PoliLand Kairagi`,
      details,
      price ? `Harga ${price}` : '',
      `Status: ${status}`,
    ].filter(Boolean).join('\n'),
    url: (id && lotShareUrl(id)) || undefined,
  }
}

/** Teks yang disalin: isi pesan, diikuti tautan bila ada. */
export function shareAsPlainText({ text, url }: ShareContent): string {
  return url ? `${text}\n${url}` : text
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    // WebView lama dan halaman non-HTTPS menolak Clipboard API.
    const area = document.createElement('textarea')
    area.value = value
    area.readOnly = true
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  }
}

function isCancel(error: unknown): boolean {
  const { name, message } = (error ?? {}) as { name?: string; message?: string }
  return name === 'AbortError' || /cancel/i.test(message || '')
}

/**
 * Membuka lembar bagikan bawaan HP, berisi semua aplikasi yang terpasang.
 * WebView Android tidak punya navigator.share, jadi aplikasi native memakai plugin Capacitor.
 * Perangkat tanpa lembar bagikan mendapat salinan teks.
 */
export async function shareContent(content: ShareContent): Promise<ShareResult> {
  const native = Capacitor.isNativePlatform()

  if (native || typeof navigator.share === 'function') {
    try {
      if (native) {
        const { Share } = await import('@capacitor/share')
        await Share.share({ ...content, dialogTitle: content.title })
      } else {
        await navigator.share(content)
      }
      return 'shared'
    } catch (error) {
      if (isCancel(error)) return 'cancelled'
      console.warn('Lembar bagikan gagal dibuka:', error)
    }
  }

  return (await copyText(shareAsPlainText(content))) ? 'copied' : 'failed'
}
