<template>
  <div class="ui-toasts" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="ui-toast" tag="div" class="ui-toasts__stack">
      <div
        v-for="t in items"
        :key="t.id"
        class="ui-toast"
        :class="{ 'ui-toast--held': held === t.id, 'ui-toast--dragging': held === t.id && drag.x !== 0 }"
        :style="held === t.id ? dragStyle : undefined"
        @pointerdown="startDrag($event, t.id)"
        @pointermove="moveDrag($event, t.id)"
        @pointerup="endDrag(t.id)"
        @pointercancel="endDrag(t.id)"
        @mouseenter="pause(t.id)"
        @mouseleave="resume(t.id)"
        @focusin="pause(t.id)"
        @focusout="resume(t.id)"
      >
        <AppNotice floating dismissible :tone="t.tone" :title="t.title" :message="t.message" @dismiss="dismiss(t.id)">
          <template #extra>
            <span v-if="t.duration > 0" class="ui-toast__timer" :style="{ animationDuration: `${t.duration}ms` }" aria-hidden="true" />
          </template>
        </AppNotice>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import { useToast } from '@/composables/useToast'

const { items, dismiss, pause, resume } = useToast()

/* Geser ke samping untuk membuang; tahan untuk menjeda hitungan. */
const SWIPE_DISTANCE = 80
const held = ref<number | null>(null)
const drag = reactive({ start: 0, x: 0 })

const dragStyle = computed(() =>
  drag.x === 0 ? undefined : { transform: `translateX(${drag.x}px)`, opacity: String(Math.max(0.25, 1 - Math.abs(drag.x) / 260)) },
)

function startDrag(event: PointerEvent, id: number) {
  if ((event.target as HTMLElement).closest('button')) return
  held.value = id
  drag.start = event.clientX
  drag.x = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  pause(id)
}

function moveDrag(event: PointerEvent, id: number) {
  if (held.value === id) drag.x = event.clientX - drag.start
}

function endDrag(id: number) {
  if (held.value !== id) return
  const swiped = Math.abs(drag.x) > SWIPE_DISTANCE
  held.value = null
  drag.x = 0
  if (swiped) dismiss(id)
  else resume(id)
}
</script>

<style scoped>
/* Muncul dari atas: tidak menutupi navigasi bawah atau tombol di kaki modal. */
.ui-toasts {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: var(--nt-z-toast);
  display: flex;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-3)) var(--space-3) 0;
  pointer-events: none;
}
.ui-toasts__stack {
  position: relative;
  display: grid;
  gap: var(--space-2);
  width: min(440px, 100%);
}
.ui-toast {
  pointer-events: auto;
  touch-action: pan-y;
  transition: transform var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-out);
}
.ui-toast--dragging { transition: none; }

.ui-toast__timer {
  position: absolute;
  inset: auto 0 0 0;
  height: 3px;
  background: var(--nt-solid);
  transform-origin: left;
  animation: ui-toast-countdown linear both;
}
.ui-toast--held .ui-toast__timer { animation-play-state: paused; }
@media (hover: hover) and (pointer: fine) {
  .ui-toast:hover .ui-toast__timer { animation-play-state: paused; }
}
.ui-toast:focus-within .ui-toast__timer { animation-play-state: paused; }
@keyframes ui-toast-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }

.ui-toast-enter-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-slow) var(--ease-spring); }
.ui-toast-leave-active { transition: opacity var(--dur-fast) var(--ease-in), transform var(--dur-fast) var(--ease-in); position: absolute; width: 100%; pointer-events: none; }
.ui-toast-enter-from { opacity: 0; transform: translateY(-28px) scale(0.92); }
.ui-toast-leave-to { opacity: 0; transform: translateY(-14px) scale(0.96); }
.ui-toast-move { transition: transform var(--dur-base) var(--ease-out); }

@media (prefers-reduced-motion: reduce) {
  .ui-toast, .ui-toast-enter-active, .ui-toast-leave-active, .ui-toast-move { transition: opacity var(--dur-fast) linear; }
  .ui-toast-enter-from, .ui-toast-leave-to { transform: none; }
  .ui-toast__timer { display: none; }
}
</style>
