<template>
  <section v-if="loading || faqs.length || isAdmin" class="faq-section">
    <div class="faq-container">
      <SectionHeader title="Pertanyaan umum">
        <AdminEditButton v-if="isAdmin" label="Tambah pertanyaan" :icon="addOutline" @click="openAdd" />
      </SectionHeader>

      <div v-if="loading" class="faq-loading">
        <ion-spinner name="crescent" />
      </div>

      <div v-else class="faq-list">
        <div
          v-for="(faq, index) in faqs"
          :key="faq.id || index"
          class="faq-item"
          :class="{ open: openIndex === index }"
        >
          <button
            type="button"
            class="faq-question"
            :aria-expanded="openIndex === index"
            @click="toggleFaq(index)"
          >
            <span>{{ faq.question }}</span>
            <ion-icon :icon="chevronDownOutline" aria-hidden="true" />
          </button>

          <Transition name="faq-answer">
          <div v-show="openIndex === index" class="faq-answer">
            {{ faq.answer }}
            <div v-if="isAdmin" class="faq-admin">
              <button type="button" class="faq-mini" @click="openEdit(faq)"><ion-icon :icon="createOutline" aria-hidden="true" /> Ubah</button>
              <button type="button" class="faq-mini danger" @click="askDelete(faq)"><ion-icon :icon="trashOutline" aria-hidden="true" /> Hapus</button>
            </div>
          </div>
          </Transition>
        </div>

        <div v-if="faqs.length === 0" class="faq-empty">
          Belum ada pertanyaan. Tekan “Tambah pertanyaan” untuk mengisinya.
        </div>
      </div>
    </div>

    <CmsItemFormModal v-model="formOpen" type="faq" :item="editingItem" :count="faqs.length" @saved="onSaved" />

    <AppModal
      v-model="deleteOpen"
      variant="dialog"
      title="Hapus pertanyaan ini?"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    >
      <p class="confirm-text">“{{ deleteTarget?.question }}” akan dihapus dari situs web dan tidak bisa dikembalikan.</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import { ref, onMounted } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import { addOutline, chevronDownOutline, createOutline, trashOutline } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsItemFormModal from '@/components/Admin/CmsItemFormModal.vue'
import { faqService, type FaqItem } from '@/services/faqService'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const { isAdmin } = useCmsAdmin()

const faqs = ref<FaqItem[]>([])
const loading = ref(true)
const openIndex = ref<number | null>(null)

const formOpen = ref(false)
const editingItem = ref<FaqItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<FaqItem | null>(null)
const deleting = ref(false)

async function loadFaqs({ silent = false }: LoadOptions = {}) {
  try {
    const result = await faqService.getFaqs()
    faqs.value = Array.isArray(result) ? result : []
  } catch (error) {
    console.error('Gagal mengambil FAQ:', error)
    if (!silent) faqs.value = []
  } finally {
    loading.value = false
  }
}

function toggleFaq(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}

function openAdd() { editingItem.value = null; formOpen.value = true }
function openEdit(item: FaqItem) { editingItem.value = item; formOpen.value = true }
async function onSaved(message: string) { toast.success(message); await loadFaqs() }

function askDelete(item: FaqItem) { deleteTarget.value = item; deleteOpen.value = true }
async function confirmDelete() {
  const item = deleteTarget.value
  if (!item?.id) return
  deleting.value = true
  try {
    await faqService.deleteFaq(item.id)
    deleteOpen.value = false
    openIndex.value = null
    toast.success('Pertanyaan dihapus.')
    await loadFaqs()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Pertanyaan gagal dihapus.')
  } finally {
    deleting.value = false
  }
}

onMounted(() => loadFaqs())

useRealtimeRefresh(['faqs'], () => loadFaqs({ silent: true }))

</script>


<style scoped>
.faq-section { display: block; width: 100%; margin: 0; padding: 36px 0 30px; box-sizing: border-box; }
.faq-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }

.faq-loading { display: flex; justify-content: center; padding: 24px 0; }
.faq-list { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.faq-item {
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.faq-item.open { border-color: var(--poliland-gold, #cba044); box-shadow: var(--shadow-md); }

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  margin: 0;
  padding: 14px 16px;
  border: 0;
  border-radius: var(--radius-card, 16px);
  background: transparent;
  color: var(--text-primary, #252525);
  font: 700 15px/1.4 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast) var(--ease-out);
}
.faq-question:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.faq-question:active { background: var(--surface-sunken, #f0ede5); transform: scale(0.98); }
.faq-question ion-icon { flex: 0 0 auto; color: var(--poliland-green, #355a2c); font-size: 20px; transition: transform var(--dur-base) var(--ease-out); }
.faq-item.open .faq-question ion-icon { transform: rotate(180deg); }

/* Hanya saat membuka; menutup langsung agar daftar tidak terasa lambat. */
.faq-answer-enter-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.faq-answer-enter-from { opacity: 0; transform: translate3d(0, -6px, 0); }

.faq-answer { padding: 0 16px 16px; color: var(--text-secondary, #5f5f66); font-size: 15px; line-height: 1.7; white-space: pre-line; }

.faq-admin { display: flex; gap: 8px; margin-top: 12px; }
.faq-mini { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border: 1px solid var(--border-strong, #d5d0c4); border-radius: 12px; background: var(--surface-primary, #fff); color: var(--poliland-gold-text, #805708); font: 700 13px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif); cursor: pointer; touch-action: manipulation; }
.faq-mini.danger { color: var(--status-danger, #b3261e); }
.faq-mini { transition: transform var(--dur-base) var(--ease-spring); }
.faq-mini:active { transform: scale(0.97); }
.faq-mini:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }

.faq-empty { padding: 18px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.55; text-align: center; }
.confirm-text { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
  .faq-question:active,
  .faq-mini:active { transform: none; }
  .faq-answer-enter-from { transform: none; }
}
</style>
