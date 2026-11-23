<template>
  <AppModal
    :model-value="modelValue"
    :title="title"
    :loading="busy"
    :confirm-disabled="busy || !ready"
    confirm-text="Simpan"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="submit"
  >
    <p v-if="error" class="panel-modal__error" role="alert">{{ error }}</p>
    <CmsHomePanel v-if="panel === 'home' && modelValue" ref="editor" embedded :only="section" @notify="onNotify" @saved="onSaved" />
    <CmsLocationPanel v-else-if="panel === 'location' && modelValue" ref="editor" embedded @notify="onNotify" @saved="onSaved" />
    <CmsContactPanel v-else-if="panel === 'contact' && modelValue" ref="editor" embedded @notify="onNotify" @saved="onSaved" />
  </AppModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import CmsHomePanel from '@/components/Admin/CmsHomePanel.vue'
import CmsLocationPanel from '@/components/Admin/CmsLocationPanel.vue'
import CmsContactPanel from '@/components/Admin/CmsContactPanel.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

type HomeSection = 'hero' | 'highlights' | 'features' | 'about' | 'cta'

/**
 * Modal sunting untuk halaman publik. Isinya panel yang sama dengan Kelola Konten,
 * jadi aturan validasi dan penyimpanannya selalu sama di kedua tempat.
 */
const props = defineProps<{
  modelValue: boolean
  title: string
  panel: 'home' | 'location' | 'contact'
  section?: HomeSection
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()

const editor = ref<{ save: () => Promise<boolean>; saving: boolean; loading: boolean } | null>(null)
const error = ref('')
const busy = ref(false)
const ready = computed(() => !!editor.value && !editor.value.loading)

watch(() => props.modelValue, (open) => { if (open) error.value = '' })

function onNotify(message: string, type: 'success' | 'error' = 'success') {
  error.value = type === 'error' ? message : ''
}

async function submit() {
  if (!editor.value) return
  busy.value = true
  error.value = ''
  try {
    await editor.value.save()
  } finally {
    busy.value = false
  }
}

function onSaved() {
  toast.success('Tersimpan dan langsung tampil di website.')
  emit('update:modelValue', false)
  emit('saved')
}
</script>

<style scoped>
.panel-modal__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: var(--danger-bg, #fbe7e6);
  color: var(--danger-text, #a8322d);
  font-size: 13px;
  line-height: 1.5;
}
</style>
