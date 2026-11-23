<template>
  <section v-if="loading || faqs.length || isAdmin" class="faq-section">
    <div class="faq-container">
      <div class="faq-header">
        <div>
          <h2>Pertanyaan Umum</h2>
          <span class="faq-line"></span>
        </div>
        <AdminEditButton v-if="isAdmin" label="Tambah pertanyaan" :icon="addOutline" @click="openAdd" />
      </div>

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
            <ion-icon :icon="openIndex === index ? chevronUpOutline : chevronDownOutline" aria-hidden="true" />
          </button>

          <div v-show="openIndex === index" class="faq-answer">
            {{ faq.answer }}
            <div v-if="isAdmin" class="faq-admin">
              <button type="button" class="faq-mini" @click="openEdit(faq)"><ion-icon :icon="createOutline" aria-hidden="true" /> Edit</button>
              <button type="button" class="faq-mini danger" @click="askDelete(faq)"><ion-icon :icon="trashOutline" aria-hidden="true" /> Hapus</button>
            </div>
          </div>
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
      <p class="confirm-text">“{{ deleteTarget?.question }}” akan dihapus dari website dan tidak bisa dikembalikan.</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import { addOutline, chevronUpOutline, chevronDownOutline, createOutline, trashOutline } from 'ionicons/icons'
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

async function loadFaqs() {
  try {
    const result = await faqService.getFaqs()
    faqs.value = Array.isArray(result) ? result : []
  } catch (error) {
    console.error('Gagal mengambil FAQ:', error)
    faqs.value = []
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

onMounted(loadFaqs)
</script>


<style scoped>

/* =========================================================
   SECTION
========================================================= */

.faq-section {
  display: block;

  width: 100%;

  height: auto;
  min-height: 0;

  margin: 0;
  padding: 28px 0 30px;

  background: #FAFAF7;

  box-sizing: border-box;

  overflow: visible;
}

/* =========================================================
   CONTAINER
========================================================= */

.faq-container {
  display: block;

  width: 100%;

  max-width: 1200px;

  margin: 0 auto;

  padding: 0 16px;

  box-sizing: border-box;
}

/* =========================================================
   HEADER
========================================================= */

.faq-header {
  display: flex;

  align-items: center;

  margin-bottom: 16px;
}

.faq-header h2 {
  margin: 0;

  color: #1A1A1A;

  font-size: 20px;

  line-height: 1.2;

  font-weight: 800;
}

.faq-line {
  display: block;

  width: 34px;
  height: 3px;

  margin-top: 7px;

  background: #556B2F;

  border-radius: 999px;
}

/* =========================================================
   LIST
========================================================= */

.faq-list {
  display: flex;

  flex-direction: column;

  width: 100%;

  gap: 8px;
}

/* =========================================================
   ITEM
========================================================= */

.faq-item {
  display: block;

  width: 100%;

  height: auto;

  background: #FFFFFF;

  border:
    1px solid
    #E3E3E3;

  border-radius: 10px;

  overflow: visible;

  box-sizing: border-box;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.faq-item.open {
  border-color: #8CA072;

  box-shadow:
    0 4px 12px
    rgba(0, 0, 0, 0.04);
}

/* =========================================================
   QUESTION
========================================================= */

.faq-question {
  display: flex;

  align-items: center;

  justify-content: space-between;

  width: 100%;

  min-height: 48px;

  margin: 0;

  padding: 12px 14px;

  border: 0;

  outline: none;

  background: transparent;

  color: #292929;

  font-family: inherit;

  font-size: 13px;

  font-weight: 700;

  line-height: 1.4;

  text-align: left;

  cursor: pointer;

  box-sizing: border-box;
}

.faq-question span {
  flex: 1;

  padding-right: 10px;
}

.faq-question ion-icon {
  flex-shrink: 0;

  color: #6B6B6B;

  font-size: 15px;
}

/* =========================================================
   ANSWER
========================================================= */

.faq-answer {
  display: block;

  width: 100%;

  margin: 0;

  padding: 0 14px 14px;

  color: #666666;

  font-size: 12px;

  font-weight: 400;

  line-height: 1.7;

  box-sizing: border-box;
}

/* =========================================================
   LOADING
========================================================= */

.faq-loading {
  display: flex;

  align-items: center;
  justify-content: center;

  width: 100%;

  min-height: 80px;
}

/* =========================================================
   EMPTY
========================================================= */

.faq-empty {
  width: 100%;

  padding: 20px;

  background: #FFFFFF;

  border:
    1px solid
    #E3E3E3;

  border-radius: 10px;

  color: #777777;

  font-size: 11px;

  text-align: center;

  box-sizing: border-box;
}


.faq-header { justify-content: space-between; gap: 12px; }
.faq-admin { display: flex; gap: 8px; margin-top: 12px; }
.faq-mini { display: inline-flex; align-items: center; gap: 5px; min-height: 40px; padding: 0 12px; border: 1px solid #E3E3E3; border-radius: 10px; background: #FFFFFF; color: #355A2C; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.faq-mini.danger { color: #D94B45; }
.faq-mini:focus-visible { outline: 3px solid #556B2F; outline-offset: 2px; }
.faq-question:focus-visible { outline: 3px solid #556B2F; outline-offset: -3px; border-radius: 10px; }
.confirm-text { margin: 0; color: #717178; font-size: 14px; line-height: 1.6; }
</style>