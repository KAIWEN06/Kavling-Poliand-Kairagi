import { createAnimation } from '@ionic/vue'
import type { Animation } from '@ionic/vue'
import { MOTION_EASE_OUT_CSS } from '@/utils/motionTokens'

/**
 * Transisi halaman PoliLand: fade + slide halus (8px).
 * Pendek agar navigasi tidak terasa lambat; leaving hanya memudar.
 * Dipasang lewat `IonicVue({ navAnimation })` di main.ts.
 */
export function poliPageTransition(
  _baseEl: HTMLElement,
  opts: { enteringEl: HTMLElement; leavingEl?: HTMLElement; direction?: string },
): Animation {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const root = createAnimation().duration(reduced ? 0 : 240).easing(MOTION_EASE_OUT_CSS)

  const entering = createAnimation()
    .addElement(opts.enteringEl)
    .beforeRemoveClass('ion-page-invisible')
    .fromTo('opacity', '0', '1')
    .fromTo('transform', opts.direction === 'back' ? 'translateY(-6px)' : 'translateY(8px)', 'translateY(0)')

  root.addAnimation(entering)

  if (opts.leavingEl) {
    const leaving = createAnimation()
      .addElement(opts.leavingEl)
      .duration(reduced ? 0 : 160)
      .fromTo('opacity', '1', '0')
    root.addAnimation(leaving)
  }

  return root
}
