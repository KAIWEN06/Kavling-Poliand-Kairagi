import { createAnimation } from '@ionic/vue'
// @ts-expect-error — builder internal Ionic tidak punya deklarasi tipe untuk path ini
import { mdEnterAnimation } from '@ionic/core/dist/collection/components/modal/animations/md.enter.js'
// @ts-expect-error — idem
import { mdLeaveAnimation } from '@ionic/core/dist/collection/components/modal/animations/md.leave.js'

/**
 * Animasi modal bersama untuk <IonModal> non-sheet.
 * Durasi & easing HARUS sama dengan AppModal.vue agar semua modal terasa konsisten.
 * Arah: selalu naik dari bawah ke atas. Enter 520ms (terlihat jelas), leave 340ms (lebih singkat).
 */
export const MODAL_ENTER_MS = 520
export const MODAL_LEAVE_MS = 340
export const MODAL_ENTER_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
export const MODAL_LEAVE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function build(baseEl: HTMLElement, direction: 'enter' | 'leave') {
  const root = baseEl.shadowRoot
  const entering = direction === 'enter'
  const duration = prefersReducedMotion() ? 1 : entering ? MODAL_ENTER_MS : MODAL_LEAVE_MS

  const backdrop = createAnimation()
    .addElement(root?.querySelector('ion-backdrop') as Element)
    .fromTo('opacity', entering ? '0.01' : 'var(--backdrop-opacity)', entering ? 'var(--backdrop-opacity)' : '0.01')

  // Selalu masuk dari tepi bawah layar. max(100%, 60vh) menjamin kartu kecil
  // yang berada di tengah layar pun tetap menempuh jarak yang terlihat.
  const offscreen = 'translateY(max(100%, 60vh))'
  const wrapper = createAnimation()
    .addElement(root?.querySelector('.modal-wrapper') as Element)
    .keyframes(
      entering
        ? [
            { offset: 0, opacity: '0', transform: offscreen },
            { offset: 0.4, opacity: '1' },
            { offset: 1, opacity: '1', transform: 'translateY(0)' },
          ]
        : [
            { offset: 0, opacity: '1', transform: 'translateY(0)' },
            { offset: 0.6, opacity: '1' },
            { offset: 1, opacity: '0', transform: offscreen },
          ],
    )

  return createAnimation()
    .addElement(baseEl)
    .easing(entering ? MODAL_ENTER_EASING : MODAL_LEAVE_EASING)
    .duration(duration)
    .addAnimation([backdrop, wrapper])
}

export const modalEnterAnimation = (baseEl: HTMLElement) => build(baseEl, 'enter')
export const modalLeaveAnimation = (baseEl: HTMLElement) => build(baseEl, 'leave')

/**
 * Modal SHEET (punya :breakpoints) — dibungkus, BUKAN diganti.
 * Gesture drag Ionic memutar ulang objek animasi ini (progressStart/Step) dan
 * mencari child 'wrapperAnimation'/'backdropAnimation', jadi builder bawaan
 * Ionic dipakai apa adanya dan hanya durasi + easing parent yang disamakan.
 * Builder md dipakai di semua platform supaya gerakan sama di iOS & Android.
 */
type IonicAnimation = ReturnType<typeof createAnimation>
type SheetBuilder = (baseEl: HTMLElement, opts?: unknown) => IonicAnimation

export const sheetModalEnterAnimation = (baseEl: HTMLElement, opts?: unknown) =>
  (mdEnterAnimation as SheetBuilder)(baseEl, opts)
    .duration(prefersReducedMotion() ? 1 : MODAL_ENTER_MS)
    .easing(MODAL_ENTER_EASING)

export const sheetModalLeaveAnimation = (baseEl: HTMLElement, opts?: unknown) =>
  (mdLeaveAnimation as SheetBuilder)(baseEl, opts)
    .duration(prefersReducedMotion() ? 1 : MODAL_LEAVE_MS)
    .easing(MODAL_LEAVE_EASING)
