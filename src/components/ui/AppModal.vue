<template>
  <Transition name="app-modal">
    <div
      v-if="modelValue"
      class="app-modal"
      :class="[`app-modal--${variant}`, { 'app-modal--no-footer': !showFooter, 'app-modal--slide': slideConfirm && showConfirm, 'app-modal--keyboard': keyboardHeight > 0 }]"
      :style="{ '--app-modal-keyboard-height': `${keyboardHeight}px` }"
      @click.self="handleBackdrop"
      @touchmove.self.prevent
    >
      <section
        ref="dialogRef"
        class="app-modal__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-label="title ? undefined : ariaLabel"
        tabindex="-1"
        :style="panelStyle"
        @keydown="handleKeydown"
      >
        <header v-if="showHeader" class="app-modal__header">
          <slot name="header">
            <h2 v-if="title" :id="titleId" class="app-modal__title">
              {{ title }}
            </h2>

            <span v-else class="app-modal__title-spacer" aria-hidden="true" />

            <button
              v-if="showClose"
              type="button"
              class="app-modal__close"
              aria-label="Tutup modal"
              :disabled="loading"
              @click="requestClose('close-button')"
            >
              <ion-icon :icon="closeOutline" aria-hidden="true" />
            </button>
          </slot>
        </header>

        <div v-if="showDivider" class="app-modal__divider" />

        <div class="app-modal__body">
          <slot />
        </div>

        <footer v-if="showFooter" class="app-modal__footer">
          <slot name="footer">
            <SlideToConfirm
              v-if="showConfirm && slideConfirm"
              class="app-modal__slide"
              :label="slideLabel || confirmText"
              :variant="slideVariant"
              :loading="loading"
              :disabled="confirmDisabled"
              @confirm="$emit('confirm')"
            />

            <AppButton
              v-if="showCancel"
              type="button"
              variant="neutral"
              :fill="slideConfirm ? 'clear' : 'outline'"
              :disabled="loading"
              @click="requestClose('cancel')"
            >
              {{ cancelText }}
            </AppButton>

            <AppButton
              v-if="showConfirm && !slideConfirm"
              type="button"
              :variant="confirmVariant"
              :loading="loading"
              :disabled="confirmDisabled || loading"
              @click="$emit('confirm')"
            >
              {{ confirmText }}
            </AppButton>
          </slot>
        </footer>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Keyboard } from '@capacitor/keyboard'
import type { PluginListenerHandle } from '@capacitor/core'
import { IonIcon } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import AppButton from '@/components/ui/AppButton.vue'
import SlideToConfirm from '@/components/ui/SlideToConfirm.vue'

type ModalVariant = 'bottom-sheet' | 'dialog' | 'fullscreen'
type ConfirmVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral'
type CloseReason = 'close-button' | 'cancel' | 'backdrop' | 'escape'

interface Props {
  modelValue: boolean
  title?: string
  ariaLabel?: string
  variant?: ModalVariant
  showHeader?: boolean
  showClose?: boolean
  showDivider?: boolean
  showFooter?: boolean
  showCancel?: boolean
  showConfirm?: boolean
  cancelText?: string
  confirmText?: string
  confirmVariant?: ConfirmVariant
  loading?: boolean
  confirmDisabled?: boolean
  /** Aksi penting: konfirmasi lewat geser, bukan ketuk. */
  slideConfirm?: boolean
  slideLabel?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  maxWidth?: string
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  ariaLabel: 'Dialog',
  variant: 'bottom-sheet',
  showHeader: true,
  showClose: true,
  showDivider: true,
  showFooter: true,
  showCancel: true,
  showConfirm: true,
  cancelText: 'Batal',
  confirmText: 'Simpan',
  confirmVariant: 'primary',
  loading: false,
  confirmDisabled: false,
  slideConfirm: false,
  slideLabel: '',
  closeOnBackdrop: true,
  closeOnEscape: true,
  maxWidth: '560px',
  maxHeight: '90dvh',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
  close: [reason: CloseReason]
}>()

const dialogRef = ref<HTMLElement | null>(null)
const keyboardHeight = ref(0)
let pluginKeyboardHeight = 0
let keyboardListeners: PluginListenerHandle[] = []
let modalActivation = 0
const titleId = `app-modal-title-${Math.random().toString(36).slice(2, 10)}`
const previousActiveElement = ref<HTMLElement | null>(null)
const previousBodyOverflow = ref('')
const previousBodyOverscroll = ref('')

const slideVariant = computed<'primary' | 'success' | 'danger' | 'neutral'>(() =>
  props.confirmVariant === 'secondary' ? 'primary' : props.confirmVariant,
)

const panelStyle = computed(() => ({
  '--app-modal-max-width': props.maxWidth,
  '--app-modal-max-height': props.maxHeight,
}))

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements() {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => element.getAttribute('aria-hidden') !== 'true')
}

function lockPage() {
  previousBodyOverflow.value = document.body.style.overflow
  previousBodyOverscroll.value = document.body.style.overscrollBehavior
  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  document.documentElement.style.overflow = 'hidden'
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: true } }))
}

function unlockPage() {
  document.body.style.overflow = previousBodyOverflow.value
  document.body.style.overscrollBehavior = previousBodyOverscroll.value
  document.documentElement.style.overflow = ''
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
}

/**
 * Android WebView (resize: none) menggulung dokumen saat input fokus sehingga overlay fixed
 * ikut terlempar. Kita kembalikan scroll ke 0, ikuti visualViewport, lalu tampilkan field di
 * dalam body modal (bukan menggeser seluruh modal).
 */
function syncViewport() {
  const vv = window.visualViewport
  if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0)

  if (!vv) {
    keyboardHeight.value = pluginKeyboardHeight
    return
  }

  const covered = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
  keyboardHeight.value = Math.max(pluginKeyboardHeight, covered > 80 ? covered : 0)
}

function revealFocusedField(event: FocusEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.matches('input, textarea, select, [contenteditable="true"]')) return
  window.setTimeout(() => {
    if (document.activeElement !== target) return
    syncViewport()
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }, 280)
}

async function activateModal() {
  if (typeof document === 'undefined') return
  const activation = ++modalActivation

  previousActiveElement.value = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null

  lockPage()
  await nextTick()

  const focusable = getFocusableElements()
  ;(focusable[0] || dialogRef.value)?.focus()
  document.addEventListener('keydown', handleDocumentKeydown)
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
  window.addEventListener('scroll', syncViewport, { passive: true })
  dialogRef.value?.addEventListener('focusin', revealFocusedField)

  try {
    const listeners = await Promise.all([
      Keyboard.addListener('keyboardWillShow', ({ keyboardHeight: height }) => {
        pluginKeyboardHeight = height
        syncViewport()
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        pluginKeyboardHeight = 0
        syncViewport()
      }),
    ])

    if (!props.modelValue || activation !== modalActivation) {
      listeners.forEach((listener) => { void listener.remove() })
      return
    }

    keyboardListeners = listeners
  } catch {
    pluginKeyboardHeight = 0
  }
}

function deactivateModal() {
  if (typeof document === 'undefined') return

  modalActivation += 1
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('scroll', syncViewport)
  dialogRef.value?.removeEventListener('focusin', revealFocusedField)
  keyboardListeners.forEach((listener) => { void listener.remove() })
  keyboardListeners = []
  pluginKeyboardHeight = 0
  keyboardHeight.value = 0
  unlockPage()
  previousActiveElement.value?.focus()
  previousActiveElement.value = null
}

function requestClose(reason: CloseReason) {
  if (props.loading) return

  emit('close', reason)

  if (reason === 'cancel') emit('cancel')
  emit('update:modelValue', false)
}

function handleBackdrop() {
  if (props.closeOnBackdrop) requestClose('backdrop')
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape) {
    event.preventDefault()
    requestClose('escape')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (!focusable.length) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  if (props.modelValue) void activateModal()
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) void activateModal()
    else deactivateModal()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (props.modelValue) deactivateModal()
})
</script>

<style scoped>
.app-modal {
  position: fixed;
  z-index: 11000;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* Overlay selalu menutup seluruh layar (tidak ikut menyusut), jadi halaman di belakang
     tidak pernah tersentuh. Ruang keyboard dan status bar diatur lewat padding. */
  box-sizing: border-box;
  padding: max(env(safe-area-inset-top, 0px), 12px) 0 var(--app-modal-keyboard-height, 0px);
  overscroll-behavior: contain;
}

.app-modal__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--app-modal-max-width, 560px);
  max-height: min(var(--app-modal-max-height, 90dvh), 100%, 760px);
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-bottom: 0;
  border-radius: var(--radius-panel) var(--radius-panel) 0 0;
  background: var(--surface-primary);
  color: var(--text-primary);
  box-shadow: 0 -8px 30px rgb(37 37 37 / 12%);
  outline: none;
  padding-bottom: env(safe-area-inset-bottom);
}

.app-modal__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 70px;
  padding: 12px 16px;
}

.app-modal__title {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-primary);
  font-size: 19px;
  font-weight: var(--font-weight-bold);
  line-height: 1.3;
}

.app-modal__title-spacer {
  flex: 1;
}

.app-modal__close {
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-primary);
  font-size: 19px;
  cursor: pointer;
}

.app-modal__close:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.app-modal__divider {
  flex: 0 0 auto;
  height: 1px;
  margin: 0 16px;
  background: var(--border-default);
}

.app-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 18px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.app-modal__footer {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-default);
  background: var(--surface-primary);
}

.app-modal__footer > * {
  min-width: 0;
  margin: 0;
}

.app-modal--slide .app-modal__footer {
  grid-template-columns: minmax(0, 1fr);
}

.app-modal__close:focus-visible,
.app-modal__panel :deep(button:focus-visible),
.app-modal__panel :deep(input:focus-visible),
.app-modal__panel :deep(select:focus-visible),
.app-modal__panel :deep(textarea:focus-visible),
.app-modal__panel :deep(a:focus-visible) {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.app-modal--dialog {
  align-items: center;
  padding: max(env(safe-area-inset-top, 0px), 16px) 16px max(16px, var(--app-modal-keyboard-height, 0px));
}

.app-modal--dialog .app-modal__panel {
  width: min(100%, var(--app-modal-max-width, 560px));
  max-height: min(var(--app-modal-max-height, 90dvh), 100%, 760px);
  padding-bottom: 0;
  border-bottom: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
}

.app-modal--fullscreen {
  align-items: stretch;
  padding: 0 0 var(--app-modal-keyboard-height, 0px);
}

/* Keyboard terbuka: area bawah sudah dilewati keyboard, jangan tambah safe-area lagi. */
.app-modal--keyboard .app-modal__panel,
.app-modal--keyboard .app-modal__footer {
  padding-bottom: 0;
}

.app-modal--keyboard .app-modal__footer {
  padding-bottom: 12px;
}

.app-modal__body :deep(input),
.app-modal__body :deep(textarea),
.app-modal__body :deep(select) {
  font-size: max(16px, 1em);
  scroll-margin: 24px;
}

.app-modal--fullscreen .app-modal__panel {
  width: 100%;
  max-width: none;
  max-height: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
}

.app-modal--no-footer .app-modal__body {
  padding-bottom: calc(18px + env(safe-area-inset-bottom));
}

/* Gerak modal: pendek, pelan, lembut. Token di theme/variables.css (--dur-modal-*, --ease-modal-*). */
.app-modal {
  background: transparent;
}

/* backdrop terpisah supaya hanya opacity yang beranimasi (tanpa repaint) */
.app-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(37 37 37 / 44%);
}

.app-modal__panel {
  position: relative;
  z-index: 1;
}

.app-modal-enter-active::before,
.app-modal-leave-active::before {
  transition: opacity var(--modal-dur) var(--modal-ease);
}

.app-modal-enter-active .app-modal__panel,
.app-modal-leave-active .app-modal__panel {
  transition:
    transform var(--modal-dur) var(--modal-ease),
    opacity var(--modal-dur) var(--modal-ease);
  will-change: transform, opacity;
}

.app-modal-enter-active {
  --modal-dur: var(--dur-modal-in);
  --modal-ease: var(--ease-modal-in);
}

.app-modal-leave-active {
  --modal-dur: var(--dur-modal-out);
  --modal-ease: var(--ease-modal-out);
}

.app-modal-enter-from::before,
.app-modal-leave-to::before {
  opacity: 0;
}

.app-modal-enter-from .app-modal__panel,
.app-modal-leave-to .app-modal__panel {
  transform: translateY(var(--modal-travel)) scale(0.985);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-modal-enter-active,
  .app-modal-leave-active {
    --modal-dur: 1ms;
  }

  .app-modal-enter-from .app-modal__panel,
  .app-modal-leave-to .app-modal__panel {
    transform: none;
  }
}

@media (min-width: 700px) {
  .app-modal--bottom-sheet {
    align-items: center;
    padding: 24px;
  }

  .app-modal--bottom-sheet .app-modal__panel {
    width: min(100%, var(--app-modal-max-width, 560px));
    max-height: min(var(--app-modal-max-height, 86dvh), 760px);
    border-bottom: 1px solid var(--border-default);
    border-radius: var(--radius-panel);
  }

  .app-modal--fullscreen .app-modal__panel {
    width: 100%;
    max-width: none;
    border-radius: 0;
  }
}
</style>
