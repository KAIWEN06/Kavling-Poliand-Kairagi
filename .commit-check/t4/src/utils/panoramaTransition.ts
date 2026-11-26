import { createAnimation, type Animation } from '@ionic/vue'
import { MOTION_EASE_OUT_CSS } from '@/utils/motionTokens'

/**
 * Masuk ke 360°: halaman lama membesar seakan kamera menembusnya, panorama
 * memudar masuk. Ionic memakai builder yang sama (direction 'back') saat kembali.
 */
export function panoramaTransition(_baseEl: HTMLElement, options: any): Animation {
  const back = options.direction === 'back'
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const entering = createAnimation().addElement(options.enteringEl)
  const leaving = createAnimation().addElement(options.leavingEl)

  entering.beforeRemoveClass('ion-page-invisible')

  if (back) {
    // Panorama (leaving) harus berada di atas selama memudar keluar.
    entering.beforeStyles({ 'z-index': '99' }).fromTo('opacity', '1', '1')
    leaving.beforeStyles({ 'z-index': '101' }).fromTo('opacity', '1', '0')
    if (!reduced) leaving.fromTo('transform', 'scale(1)', 'scale(1.12)')
  } else {
    entering.beforeStyles({ 'z-index': '101' }).fromTo('opacity', '0', '1')
    leaving.beforeStyles({ 'z-index': '99' }).fromTo('opacity', '1', '1')
    if (!reduced) {
      entering.fromTo('transform', 'scale(1.08)', 'scale(1)')
      leaving.fromTo('transform', 'scale(1)', 'scale(1.16)').afterClearStyles(['transform'])
    }
  }

  return createAnimation()
    .duration(reduced ? 140 : back ? 300 : 520)
    .easing(MOTION_EASE_OUT_CSS)
    .addAnimation([entering, leaving])
}
