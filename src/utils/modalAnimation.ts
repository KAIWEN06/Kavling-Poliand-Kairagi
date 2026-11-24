import { createAnimation } from '@ionic/vue'
import {
  MODAL_ENTER_MS,
  MODAL_LEAVE_MS,
  MODAL_TRAVEL_PX,
  MOTION_EASE_MODAL_IN_CSS,
  MOTION_EASE_MODAL_OUT_CSS,
} from '@/utils/motionTokens'
// @ts-expect-error — builder internal Ionic tidak punya deklarasi tipe untuk path ini
import { mdEnterAnimation } from '@ionic/core/dist/collection/components/modal/animations/md.enter.js'
// @ts-expect-error — idem
import { mdLeaveAnimation } from '@ionic/core/dist/collection/components/modal/animations/md.leave.js'

/**
 * Animasi bersama untuk SEMUA overlay: <IonModal>, alert, dan AppModal.vue.
 * Nilai durasi, kurva, dan jarak datang dari motionTokens.ts (cermin token CSS
 * --dur-modal-*, --ease-modal-*, --modal-travel) supaya semuanya terasa sama.
 *
 * Gerak: naik pelan sejauh 40px sambil memudar masuk, lalu mengendap.
 * Keluar lebih singkat dan tenang. Hanya transform dan opacity.
 */
export { MODAL_ENTER_MS, MODAL_LEAVE_MS }
export const MODAL_ENTER_EASING = MOTION_EASE_MODAL_IN_CSS
export const MODAL_LEAVE_EASING = MOTION_EASE_MODAL_OUT_CSS

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function build(baseEl: HTMLElement, direction: 'enter' | 'leave', wrapperSelector = '.modal-wrapper') {
  const root = baseEl.shadowRoot
  const entering = direction === 'enter'
  const duration = prefersReducedMotion() ? 1 : entering ? MODAL_ENTER_MS : MODAL_LEAVE_MS

  const backdrop = createAnimation()
    .addElement(root?.querySelector('ion-backdrop') as Element)
    .fromTo('opacity', entering ? '0.01' : 'var(--backdrop-opacity)', entering ? 'var(--backdrop-opacity)' : '0.01')

  const away = `translateY(${MODAL_TRAVEL_PX}px) scale(0.985)`
  const rest = 'translateY(0) scale(1)'
  const wrapper = createAnimation()
    .addElement(root?.querySelector(wrapperSelector) as Element)
    .keyframes(
      entering
        ? [
            { offset: 0, opacity: '0', transform: away },
            { offset: 0.5, opacity: '1' },
            { offset: 1, opacity: '1', transform: rest },
          ]
        : [
            { offset: 0, opacity: '1', transform: rest },
            { offset: 0.4, opacity: '1' },
            { offset: 1, opacity: '0', transform: away },
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

/** Dialog konfirmasi bawaan Ionic (alertController, <ion-alert>). Dipasang global di main.ts. */
export const alertEnterAnimation = (baseEl: HTMLElement) => build(baseEl, 'enter', '.alert-wrapper')
export const alertLeaveAnimation = (baseEl: HTMLElement) => build(baseEl, 'leave', '.alert-wrapper')

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
