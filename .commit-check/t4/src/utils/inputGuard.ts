import { sanitizeByKind, type InputKind } from '@/utils/inputValidation'

/**
 * Filter input global. Satu listener (fase capture) membersihkan nilai SEBELUM
 * v-model / Ionic membacanya, sehingga berlaku di semua halaman.
 *
 * Jenis field ditentukan dari (urut prioritas):
 *   1. atribut `data-input="name|phone|email|nik|digits|decimal|free"`
 *   2. type="tel" / type="email" / autocomplete="name" / inputmode="numeric"
 * Tambahkan `data-input="free"` untuk melewati filter.
 */

const SKIPPED_TYPES = new Set(['password', 'search', 'file', 'checkbox', 'radio', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'range', 'hidden', 'number'])
const NAME_AUTOCOMPLETE = new Set(['name', 'given-name', 'family-name', 'additional-name'])

function readAttr(target: HTMLElement, host: HTMLElement | null, name: string): string {
  return (target.getAttribute(name) ?? host?.getAttribute(name) ?? '').trim().toLowerCase()
}

function resolveKind(target: HTMLInputElement | HTMLTextAreaElement): { kind: InputKind; maxLength?: number } | null {
  const host = target.closest<HTMLElement>('ion-input, ion-textarea')
  const explicit = readAttr(target, host, 'data-input') as InputKind | ''
  if (explicit === 'free') return null

  const maxAttr = Number(target.getAttribute('maxlength') ?? host?.getAttribute('maxlength') ?? '')
  const maxLength = Number.isFinite(maxAttr) && maxAttr > 0 ? maxAttr : undefined
  if (explicit) return { kind: explicit, maxLength }

  const type = readAttr(target, host, 'type') || 'text'
  if (SKIPPED_TYPES.has(type)) return null
  if (target instanceof HTMLTextAreaElement) return null

  if (type === 'tel') return { kind: 'phone' }
  if (type === 'email') return { kind: 'email' }
  if (NAME_AUTOCOMPLETE.has(readAttr(target, host, 'autocomplete'))) return { kind: 'name' }
  if (readAttr(target, host, 'inputmode') === 'tel') return { kind: 'phone' }
  if (readAttr(target, host, 'inputmode') === 'numeric') return { kind: 'digits', maxLength }
  return null
}

function onInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return
  if ((event as InputEvent).isComposing) return

  const rule = resolveKind(target)
  if (!rule) return

  const before = target.value
  const after = sanitizeByKind(rule.kind, before, rule.maxLength)
  if (after === before) return

  const caret = target.selectionStart
  target.value = after
  if (caret !== null) {
    const next = Math.max(0, caret - (before.length - after.length))
    try { target.setSelectionRange(next, next) } catch { /* tipe input tanpa selection */ }
  }
}

// Cegah e, E, +, - pada <input type="number"> (nilai ini lolos sebagai "angka" di browser).
function onKeydown(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || target.type !== 'number') return
  if (event.ctrlKey || event.metaKey) return
  if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault()
}

let installed = false
export function installInputGuard() {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener('input', onInput, true)
  document.addEventListener('keydown', onKeydown, true)
}
