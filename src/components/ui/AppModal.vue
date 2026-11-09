<template>
  <Transition name="app-modal">
    <div
      v-if="modelValue"
      class="app-modal"
      :class="[`app-modal--${variant}`, { 'app-modal--no-footer': !showFooter }]"
      :style="{ '--app-modal-keyboard-height': `${keyboardHeight}px` }"
      @click.self="handleBackdrop"
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
            <AppButton
              v-if="showCancel"
              type="button"
              variant="neutral"
              fill="outline"
              :disabled="loading"
              @click="requestClose('cancel')"
            >
              {{ cancelText }}
            </AppButton>

            <AppButton
              v-if="showConfirm"
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
let keyboardListeners: PluginListenerHandle[] = []
let modalActivation = 0
const titleId = `app-modal-title-${Math.random().toString(36).slice(2, 10)}`
const previousActiveElement = ref<HTMLElement | null>(null)
const previousBodyOverflow = ref('')
const previousBodyOverscroll = ref('')

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
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: true } }))
}

function unlockPage() {
  document.body.style.overflow = previousBodyOverflow.value
  document.body.style.overscrollBehavior = previousBodyOverscroll.value
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
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

  try {
    const listeners = await Promise.all([
      Keyboard.addListener('keyboardWillShow', ({ keyboardHeight: height }) => {
        keyboardHeight.value = height
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        keyboardHeight.value = 0
      }),
    ])

    if (!props.modelValue || activation !== modalActivation) {
      listeners.forEach((listener) => { void listener.remove() })
      return
    }

    keyboardListeners = listeners
  } catch {
    keyboardHeight.value = 0
  }
}

function deactivateModal() {
  if (typeof document === 'undefined') return

  modalActivation += 1
  document.removeEventListener('keydown', handleDocumentKeydown)
  keyboardListeners.forEach((listener) => { void listener.remove() })
  keyboardListeners = []
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
  padding: 0;
  background: rgb(37 37 37 / 44%);
  overscroll-behavior: contain;
}

.app-modal:not(.app-modal--fullscreen) {
  bottom: var(--app-modal-keyboard-height, 0px);
}

.app-modal__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--app-modal-max-width, 560px);
  max-height: min(var(--app-modal-max-height, 90dvh), calc(100dvh - var(--app-modal-keyboard-height, 0px) - 16px), 760px);
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
  animation: app-modal-header-slide 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes app-modal-header-slide {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-modal__body {
  animation: app-modal-body-fade 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards 60ms;
  opacity: 0;
  transform: translateY(8px);
}

@keyframes app-modal-body-fade {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-modal__footer {
  animation: app-modal-footer-fade 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards 100ms;
  opacity: 0;
  transform: translateY(8px);
}

@keyframes app-modal-footer-fade {
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  padding: 16px;
}

.app-modal--dialog .app-modal__panel {
  width: min(100%, var(--app-modal-max-width, 560px));
  max-height: min(var(--app-modal-max-height, 90dvh), 760px);
  border-bottom: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
}

.app-modal--fullscreen {
  align-items: stretch;
  padding: 0;
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

.app-modal-enter-active,
.app-modal-leave-active {
  transition: background-color 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.app-modal-enter-active .app-modal__panel,
.app-modal-leave-active .app-modal__panel {
  transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.app-modal-enter-from,
.app-modal-leave-to {
  background: rgb(37 37 37 / 0%);
}

.app-modal--bottom-sheet.app-modal-enter-from .app-modal__panel,
.app-modal--bottom-sheet.app-modal-leave-to .app-modal__panel {
  transform: translateY(110%);
  opacity: 0;
}

.app-modal--bottom-sheet.app-modal-enter-to .app-modal__panel,
.app-modal--bottom-sheet.app-modal-leave-from .app-modal__panel {
  transform: translateY(0);
  opacity: 1;
}

.app-modal--dialog.app-modal-enter-from .app-modal__panel,
.app-modal--dialog.app-modal-leave-to .app-modal__panel {
  transform: translateY(20px) scale(0.96);
  opacity: 0;
}

.app-modal--dialog.app-modal-enter-to .app-modal__panel,
.app-modal--dialog.app-modal-leave-from .app-modal__panel {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.app-modal--fullscreen.app-modal-enter-from .app-modal__panel,
.app-modal--fullscreen.app-modal-leave-to .app-modal__panel {
  transform: translateY(30px);
  opacity: 0;
}

.app-modal--fullscreen.app-modal-enter-to .app-modal__panel,
.app-modal--fullscreen.app-modal-leave-from .app-modal__panel {
  transform: translateY(0);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .app-modal-enter-active,
  .app-modal-leave-active,
  .app-modal-enter-active .app-modal__panel,
  .app-modal-leave-active .app-modal__panel {
    transition-duration: 1ms;
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

@media (prefers-reduced-motion: reduce) {
  .app-modal-enter-active,
  .app-modal-leave-active,
  .app-modal-enter-active .app-modal__panel,
  .app-modal-leave-active .app-modal__panel {
    transition-duration: 1ms;
  }
}
</style>
