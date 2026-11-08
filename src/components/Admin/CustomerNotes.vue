<template>
  <section class="notes-area" aria-labelledby="notes-heading">
    <header class="notes-head">
      <div class="notes-heading-copy">
        <h2 id="notes-heading">Catatan</h2>
        <p>{{ notes.length }} catatan tersimpan</p>
      </div>

      <AppButton size="small" variant="primary" @click="openEditor()">
        <ion-icon :icon="addOutline" aria-hidden="true" />
        Tambah catatan
      </AppButton>
    </header>

    <div class="notes-toolbar">
      <label class="notes-search">
        <ion-icon :icon="searchOutline" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari judul atau isi catatan"
          aria-label="Cari catatan"
        />
      </label>

      <div class="toolbar-controls">
        <label class="visually-hidden" for="notes-category-filter">Filter kategori</label>
        <select id="notes-category-filter" v-model="categoryFilter">
          <option value="all">Semua kategori</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>

        <label class="visually-hidden" for="notes-sort">Urutkan catatan</label>
        <select id="notes-sort" v-model="sortMode">
          <option value="updated">Terbaru</option>
          <option value="created">Terlama</option>
        </select>

        <button
          type="button"
          class="pin-filter"
          :class="{ 'is-active': pinnedOnly }"
          :aria-pressed="pinnedOnly"
          @click="pinnedOnly = !pinnedOnly"
        >
          <ion-icon :icon="pinOutline" aria-hidden="true" />
          {{ pinnedOnly ? 'Disematkan' : 'Semua' }}
        </button>
      </div>
    </div>

    <p v-if="saveMessage" class="save-message" role="status">
      {{ saveMessage }}
    </p>
    <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>

    <div v-if="loading" class="notes-state" role="status">
      <ion-spinner name="crescent" />
      <p>Memuat catatan...</p>
    </div>

    <div v-else-if="errorMessage" class="notes-state" role="alert">
      <strong>Catatan gagal dimuat</strong>
      <p>{{ errorMessage }}</p>
      <button type="button" class="state-action" @click="loadNotes">
        Coba lagi
      </button>
    </div>

    <template v-else>
      <div v-if="filteredNotes.length" class="note-list">
        <article
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-card"
          :class="{ 'is-pinned': note.is_pinned }"
        >
          <div class="note-card-head">
            <div class="note-title-wrap">
              <span v-if="note.is_pinned" class="pinned-mark" aria-label="Catatan disematkan">
                <ion-icon :icon="pinOutline" aria-hidden="true" />
              </span>
              <h3>{{ note.title }}</h3>
            </div>

            <button
              type="button"
              class="icon-button note-menu-trigger"
              :aria-label="`Buka aksi untuk ${note.title}`"
              :aria-expanded="menuNote?.id === note.id"
              @click="openMenu(note)"
            >
              <ion-icon :icon="ellipsisVertical" aria-hidden="true" />
            </button>
          </div>

          <p class="note-content">{{ note.content }}</p>

          <footer class="note-meta">
            <span class="category-label">{{ note.category }}</span>
            <time :datetime="note.updated_at">
              Diperbarui {{ formatDate(note.updated_at) }}
            </time>
          </footer>
        </article>
      </div>

      <div v-else class="notes-state empty-state">
        <img
          v-if="!hasActiveFilters"
          :src="emptyNotesMascot"
          alt=""
          class="empty-state-mascot"
          aria-hidden="true"
        />
        <img
          v-else
          :src="emptyFilterMascot"
          alt=""
          class="empty-state-mascot"
          aria-hidden="true"
        />
        <strong>{{ hasActiveFilters ? 'Catatan tidak ditemukan' : 'Belum ada catatan' }}</strong>
        <p>
          {{
            hasActiveFilters
              ? 'Coba ubah kata kunci atau filter yang digunakan.'
              : 'Simpan informasi penting, hasil pertemuan, atau tindak lanjut customer di sini.'
          }}
        </p>
        <button
          v-if="!hasActiveFilters"
          type="button"
          class="state-action"
          @click="openEditor()"
        >
          Tambah catatan
        </button>
        <button
          v-else
          type="button"
          class="text-action"
          @click="clearFilters"
        >
          Hapus filter
        </button>
      </div>
    </template>

    <!-- Editor catatan -->
    <div v-if="editing" class="modal-overlay" @click.self="closeEditor">
      <section
        class="modal-panel editor-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'note-editor-title'"
      >
        <header class="sheet-head">
          <div>
            <p class="eyebrow">{{ form.id ? 'PERBARUI INFORMASI' : 'INFORMASI CUSTOMER' }}</p>
            <h2 id="note-editor-title">
              {{ form.id ? 'Edit catatan' : 'Catatan baru' }}
            </h2>
          </div>
          <button type="button" class="icon-button close-button" aria-label="Tutup" @click="closeEditor">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </header>

        <form class="note-form" @submit.prevent="saveNote">
          <label class="form-field">
            <span>Judul catatan</span>
            <input
              v-model.trim="form.title"
              type="text"
              maxlength="80"
              placeholder="Contoh: Preferensi lokasi customer"
              required
            />
          </label>

          <label class="form-field">
            <span>Isi catatan</span>
            <textarea
              v-model.trim="form.content"
              rows="6"
              maxlength="3000"
              placeholder="Tuliskan informasi yang perlu diingat..."
              required
            />
            <small>{{ form.content.length }}/3000 karakter</small>
          </label>

          <label class="form-field">
            <span>Kategori</span>
            <select v-model="form.category">
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </label>

          <label class="pin-toggle">
            <input v-model="form.is_pinned" type="checkbox" />
            <span>
              <strong>Sematkan catatan</strong>
              <small>Catatan akan ditampilkan lebih dahulu.</small>
            </span>
          </label>

          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

          <div class="sheet-actions">
            <button type="button" class="secondary-action" :disabled="saving" @click="closeEditor">
              Batal
            </button>
            <button type="submit" class="primary-action" :disabled="saving">
              <ion-spinner v-if="saving" name="crescent" />
              {{ saving ? 'Menyimpan...' : 'Simpan catatan' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- Menu aksi catatan -->
    <div v-if="menuNote" class="menu-backdrop" @click.self="menuNote = null">
      <div class="note-popover" role="menu" :aria-label="`Aksi ${menuNote.title}`">
        <button type="button" role="menuitem" @click="openEditor(menuNote)">
          <ion-icon :icon="createOutline" aria-hidden="true" />
          Edit catatan
        </button>
        <button type="button" role="menuitem" @click="togglePin(menuNote)">
          <ion-icon :icon="pinOutline" aria-hidden="true" />
          {{ menuNote.is_pinned ? 'Lepas sematan' : 'Sematkan' }}
        </button>
        <button type="button" role="menuitem" @click="showHistory(menuNote)">
          <ion-icon :icon="timeOutline" aria-hidden="true" />
          Lihat riwayat
        </button>
        <button type="button" role="menuitem" class="danger-action" @click="deleteNote(menuNote)">
          <ion-icon :icon="trashOutline" aria-hidden="true" />
          Hapus catatan
        </button>
      </div>
    </div>

    <!-- Riwayat perubahan -->
    <div v-if="historyNote" class="modal-overlay history-overlay" @click.self="closeHistory">
      <section
        class="modal-panel history-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <header class="sheet-head">
          <div class="history-heading">
            <p class="eyebrow">AKTIVITAS CATATAN</p>
            <h2 id="history-title">Riwayat perubahan</h2>
            <p class="history-note-title">{{ historyNote.title }}</p>
          </div>
          <button type="button" class="icon-button close-button" aria-label="Tutup riwayat" @click="closeHistory">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </header>

        <div v-if="historyLoading" class="history-state" role="status">
          <ion-spinner name="crescent" />
          <p>Memuat riwayat...</p>
        </div>

        <div v-else-if="historyError" class="history-state" role="alert">
          <strong>Riwayat gagal dimuat</strong>
          <p>{{ historyError }}</p>
          <button type="button" class="state-action" @click="retryHistory">
            Coba lagi
          </button>
        </div>

        <div v-else-if="!historyRows.length" class="history-state">
          <div class="empty-state-icon">
            <ion-icon :icon="timeOutline" aria-hidden="true" />
          </div>
          <strong>Belum ada riwayat</strong>
          <p>Aktivitas setelah fitur riwayat diaktifkan akan tercatat di sini.</p>
        </div>

        <ol v-else class="history-timeline">
          <li v-for="row in historyRows" :key="row.id" class="history-item">
            <span class="timeline-marker" aria-hidden="true"></span>
            <div class="history-entry">
              <div class="history-entry-head">
                <strong>{{ historyActionLabel(row.action) }}</strong>
                <time :datetime="row.created_at">{{ formatDate(row.created_at) }}</time>
              </div>
              <ul v-if="historyDetails(row).length" class="history-changes">
                <li v-for="(detail, index) in historyDetails(row)" :key="`${row.id}-${index}`">
                  {{ detail }}
                </li>
              </ul>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import {
  addOutline,
  closeOutline,
  createOutline,
  ellipsisVertical,
  pinOutline,
  searchOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons'
import AppButton from '@/components/ui/AppButton.vue'
import emptyFilterMascot from '@/assets/mascot/MascotInvestigatingSearch Filters.png'
import emptyNotesMascot from '@/assets/mascot/MascotWritingaNewNote.png'
import {
  customerNotesService,
  type CustomerNote,
  type CustomerNoteHistory,
  type NoteCategory,
} from '@/services/Admin/customerNotesService'

const props = defineProps<{ customerId: number }>()

const categories: NoteCategory[] = [
  'Follow Up',
  'Preferensi Kavling',
  'Hasil Pertemuan',
  'Informasi Customer',
  'Lainnya',
]

const notes = ref<CustomerNote[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const formError = ref('')
const saveMessage = ref('')
const search = ref('')
const categoryFilter = ref('all')
const sortMode = ref<'updated' | 'created'>('updated')
const pinnedOnly = ref(false)
const editing = ref(false)
const menuNote = ref<CustomerNote | null>(null)
const historyNote = ref<CustomerNote | null>(null)
const historyRows = ref<CustomerNoteHistory[]>([])
const historyLoading = ref(false)
const historyError = ref('')

const form = reactive<{
  id: string
  title: string
  content: string
  category: NoteCategory
  is_pinned: boolean
}>({
  id: '',
  title: '',
  content: '',
  category: 'Follow Up',
  is_pinned: false,
})

const hasActiveFilters = computed(() =>
  Boolean(search.value.trim()) ||
  categoryFilter.value !== 'all' ||
  pinnedOnly.value,
)

const filteredNotes = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return [...notes.value]
    .filter((note) => {
      const matchesSearch =
        !keyword ||
        `${note.title} ${note.content}`.toLowerCase().includes(keyword)

      const matchesCategory =
        categoryFilter.value === 'all' ||
        note.category === categoryFilter.value

      const matchesPinned = !pinnedOnly.value || note.is_pinned

      return matchesSearch && matchesCategory && matchesPinned
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

      const first = sortMode.value === 'created' ? a.created_at : a.updated_at
      const second = sortMode.value === 'created' ? b.created_at : b.updated_at

      return sortMode.value === 'created'
        ? first.localeCompare(second)
        : second.localeCompare(first)
    })
})

async function loadNotes() {
  loading.value = true
  errorMessage.value = ''

  try {
    notes.value = await customerNotesService.list(props.customerId)
  } catch (error) {
    console.error('[CustomerNotes] Gagal memuat catatan:', error)
    errorMessage.value =
      error instanceof Error ? error.message : 'Catatan gagal dimuat.'
  } finally {
    loading.value = false
  }
}

function openEditor(note?: CustomerNote) {
  menuNote.value = null
  formError.value = ''

  Object.assign(
    form,
    note
      ? {
          id: note.id,
          title: note.title,
          content: note.content,
          category: note.category,
          is_pinned: note.is_pinned,
        }
      : {
          id: '',
          title: '',
          content: '',
          category: 'Follow Up',
          is_pinned: false,
        },
  )

  editing.value = true
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: true } }))
}

function closeEditor() {
  if (saving.value) return
  editing.value = false
  formError.value = ''
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
}

async function saveNote() {
  if (!form.title.trim() || !form.content.trim()) {
    formError.value = 'Judul dan isi catatan wajib diisi.'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    if (form.id) {
      const updated = await customerNotesService.update(form.id, {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_pinned: form.is_pinned,
      })

      notes.value = notes.value.map((note) =>
        note.id === updated.id ? updated : note,
      )
      saveMessage.value = 'Catatan berhasil diperbarui.'
    } else {
      const created = await customerNotesService.create(props.customerId, {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_pinned: form.is_pinned,
      })

      notes.value = [created, ...notes.value]
      saveMessage.value = 'Catatan berhasil ditambahkan.'
    }

    editing.value = false
    window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
    window.setTimeout(() => {
      saveMessage.value = ''
    }, 2800)
  } catch (error) {
    console.error('[CustomerNotes] Gagal menyimpan catatan:', error)
    formError.value =
      error instanceof Error ? error.message : 'Catatan belum berhasil disimpan.'
  } finally {
    saving.value = false
  }
}

function openMenu(note: CustomerNote) {
  menuNote.value = menuNote.value?.id === note.id ? null : note
}

async function togglePin(note: CustomerNote) {
  menuNote.value = null
  actionError.value = ''

  try {
    const updated = await customerNotesService.update(note.id, {
      is_pinned: !note.is_pinned,
    })

    notes.value = notes.value.map((item) =>
      item.id === updated.id ? updated : item,
    )
    saveMessage.value = updated.is_pinned
      ? 'Catatan disematkan.'
      : 'Sematan catatan dilepas.'
  } catch (error) {
    console.error('[CustomerNotes] Gagal mengubah pin:', error)
    actionError.value =
      error instanceof Error ? error.message : 'Status pin gagal diperbarui.'
  }
}

async function deleteNote(note: CustomerNote) {
  menuNote.value = null

  const confirmed = window.confirm(`Hapus catatan "${note.title}"?`)
  if (!confirmed || deleting.value) return

  deleting.value = true
  actionError.value = ''

  try {
    await customerNotesService.remove(note.id)
    notes.value = notes.value.filter((item) => item.id !== note.id)
    saveMessage.value = 'Catatan berhasil dihapus.'
  } catch (error) {
    console.error('[CustomerNotes] Gagal menghapus catatan:', error)
    actionError.value =
      error instanceof Error ? error.message : 'Catatan gagal dihapus.'
  } finally {
    deleting.value = false
  }
}

async function showHistory(note: CustomerNote) {
  menuNote.value = null
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: true } }))
  historyNote.value = note
  historyRows.value = []
  historyError.value = ''
  historyLoading.value = true

  try {
    historyRows.value = await customerNotesService.history(note.id)
  } catch (error) {
    console.error('[CustomerNotes] Gagal memuat riwayat:', error)
    historyError.value =
      error instanceof Error ? error.message : 'Gagal mengambil riwayat catatan.'
  } finally {
    historyLoading.value = false
  }
}

function closeHistory() {
  historyNote.value = null
  historyRows.value = []
  historyError.value = ''
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
}

function retryHistory() {
  if (historyNote.value) {
    void showHistory(historyNote.value)
  }
}

function historyActionLabel(action: CustomerNoteHistory['action']) {
  const labels: Record<CustomerNoteHistory['action'], string> = {
    CREATE: 'Catatan dibuat',
    UPDATE: 'Catatan diperbarui',
    DELETE: 'Catatan dihapus',
  }

  return labels[action] ?? 'Aktivitas catatan'
}

function historyDetails(row: CustomerNoteHistory): string[] {
  const oldData = row.old_data ?? {}
  const newData = row.new_data ?? {}

  if (row.action === 'CREATE') {
    return [
      `Judul: ${String(newData.title ?? 'Tanpa judul')}`,
      `Kategori: ${String(newData.category ?? 'Lainnya')}`,
      'Catatan baru ditambahkan.',
    ]
  }

  if (row.action === 'DELETE') {
    return [
      `Judul: ${String(oldData.title ?? 'Tanpa judul')}`,
      `Kategori: ${String(oldData.category ?? 'Lainnya')}`,
      'Catatan dihapus.',
    ]
  }

  const fields: Array<{ key: keyof typeof oldData; label: string }> = [
    { key: 'title', label: 'Judul' },
    { key: 'content', label: 'Isi catatan' },
    { key: 'category', label: 'Kategori' },
    { key: 'is_pinned', label: 'Sematan' },
  ]

  return fields
    .filter(({ key }) => oldData[key] !== newData[key])
    .map(({ key, label }) => {
      const formatValue = (value: unknown) => {
        if (key === 'is_pinned') return value ? 'Aktif' : 'Tidak aktif'
        const text = String(value ?? '-').trim()
        return text.length > 180 ? `${text.slice(0, 180)}…` : text
      }

      return `${label}: ${formatValue(oldData[key])} → ${formatValue(newData[key])}`
    })
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function clearFilters() {
  search.value = ''
  categoryFilter.value = 'all'
  pinnedOnly.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  if (historyNote.value) closeHistory()
  else if (editing.value) closeEditor()
  else if (menuNote.value) menuNote.value = null
}

watch(() => props.customerId, loadNotes)
onMounted(() => {
  loadNotes()
  window.addEventListener('keydown', handleEscape)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
})
</script>

<style scoped>
.notes-area {
  min-width: 0;
  padding-top: 14px;
  color: var(--text-primary);
  font-family: var(--font-primary);
}

.notes-head,
.note-card-head,
.sheet-head,
.note-meta,
.history-entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-heading-copy h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.025em;
}

.notes-heading-copy p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.notes-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin: 16px 0 12px;
}

.notes-search {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
}

.notes-search ion-icon {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 17px;
}

.notes-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
}

.notes-search input::placeholder {
  color: var(--text-secondary);
}

.toolbar-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 7px;
}

.toolbar-controls select,
.pin-filter {
  min-width: 0;
  min-height: 42px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
}

.pin-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.pin-filter ion-icon {
  font-size: 15px;
}

.pin-filter.is-active {
  border-color: var(--poliland-gold-text);
  background: var(--poliland-gold-soft);
  color: var(--poliland-gold-text-soft);
}

.save-message {
  margin: 0 0 10px;
  color: var(--status-success);
  font-size: 12px;
  font-weight: var(--font-weight-medium);
}

.action-error {
  margin: 0 0 10px;
  color: var(--status-danger);
  font-size: 12px;
}

.note-list {
  display: grid;
  gap: 9px;
}

.note-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.note-card.is-pinned {
  border-inline-start: 3px solid var(--poliland-gold);
  padding-inline-start: 12px;
}

.note-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-width: 0;
}

.note-title-wrap h3 {
  margin: 1px 0 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.pinned-mark {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--poliland-gold-text);
  font-size: 15px;
}

.icon-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--surface-muted);
}

.note-menu-trigger {
  width: 36px;
  min-width: 36px;
  height: 36px;
  margin: -6px -7px 0 0;
  font-size: 18px;
}

.note-content {
  margin: 9px 0 13px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.note-meta {
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 11px;
}

.category-label {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text-primary);
  font-size: 10px;
  font-weight: var(--font-weight-medium);
}

.note-meta time {
  text-align: right;
}

.notes-state,
.history-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 30px 18px;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
  text-align: center;
}

.notes-state > ion-spinner,
.history-state > ion-spinner {
  color: var(--poliland-green);
}

.notes-state strong,
.history-state strong {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
}

.notes-state p,
.history-state p {
  max-width: 320px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.empty-state-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 20px;
}

.empty-state-mascot {
  display: block;
  width: min(180px, 58vw);
  height: auto;
  max-height: 150px;
  object-fit: contain;
  margin: -4px auto 0;
}

.state-action,
.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 15px;
  border: 1px solid var(--poliland-green);
  border-radius: var(--radius-control);
  background: var(--poliland-green);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.text-action {
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--poliland-green);
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
}

.modal-overlay {
  position: fixed;
  z-index: 11000;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px 12px calc(12px + env(safe-area-inset-bottom));
  background: rgb(37 37 37 / 42%);
}

.modal-panel {
  width: min(100%, 560px);
  max-height: min(calc(100dvh - 24px), 760px);
  overflow: auto;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-panel) var(--radius-panel) 0 0;
  background: var(--surface-primary);
  padding: 20px 18px calc(24px + env(safe-area-inset-bottom));
}

.sheet-head {
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-default);
}

.eyebrow {
  margin: 0 0 5px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
}

.sheet-head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 19px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.025em;
}

.close-button {
  border-color: var(--border-default);
  background: var(--surface-muted);
  color: var(--text-primary);
}

.note-form {
  display: grid;
  gap: 15px;
  padding-top: 16px;
}

.form-field {
  display: grid;
  gap: 7px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
}

.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  min-height: 44px;
  padding: 11px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  outline: none;
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-regular);
}

.form-field textarea {
  min-height: 130px;
  resize: vertical;
  line-height: 1.55;
}

.form-field input:focus-visible,
.form-field textarea:focus-visible,
.form-field select:focus-visible,
.notes-search:focus-within {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.form-field small {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: var(--font-weight-regular);
  text-align: right;
}

.pin-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
}

.pin-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--poliland-green);
}

.pin-toggle span {
  display: grid;
  gap: 3px;
}

.pin-toggle strong {
  color: var(--text-primary);
  font-size: 12px;
}

.pin-toggle small {
  color: var(--text-secondary);
  font-size: 11px;
}

.form-error {
  margin: 0;
  color: var(--status-danger);
  font-size: 12px;
}

.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 9px;
  position: static;
  margin-top: 4px;
  padding-top: 0;
}

.sheet-actions button {
  min-height: 46px;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.sheet-actions button:disabled,
.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.secondary-action {
  border: 1px solid var(--border-default);
  background: var(--surface-primary);
  color: var(--text-primary);
}

.primary-action {
  min-height: 46px;
}

.menu-backdrop {
  position: fixed;
  z-index: 10002;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px 16px calc(92px + env(safe-area-inset-bottom));
  background: rgb(37 37 37 / 18%);
}

.note-popover {
  display: grid;
  width: min(240px, 100%);
  padding: 6px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.note-popover button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 11px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.note-popover button:hover {
  background: var(--surface-muted);
}

.note-popover ion-icon {
  font-size: 16px;
  color: var(--text-secondary);
}

.note-popover .danger-action,
.note-popover .danger-action ion-icon {
  color: var(--status-danger);
}

.history-panel {
  max-height: min(82vh, 700px);
}

.history-note-title {
  max-width: 390px;
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.history-state {
  margin-top: 16px;
}

.history-timeline {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 20px 0 4px;
  list-style: none;
}

.history-item {
  position: relative;
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 11px;
  padding-bottom: 20px;
}

.history-item:not(:last-child)::before {
  position: absolute;
  top: 13px;
  bottom: -1px;
  left: 5px;
  width: 1px;
  background: var(--border-default);
  content: '';
}

.timeline-marker {
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  border: 2px solid var(--surface-primary);
  border-radius: 50%;
  background: var(--poliland-green);
  box-shadow: 0 0 0 1px var(--poliland-green);
}

.history-entry {
  min-width: 0;
  padding: 0 0 2px;
}

.history-entry-head {
  align-items: flex-start;
  flex-wrap: wrap;
}

.history-entry-head strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
}

.history-entry-head time {
  color: var(--text-secondary);
  font-size: 10px;
}

.history-changes {
  display: grid;
  gap: 6px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}

.history-changes li {
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

button:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

@media (min-width: 640px) {
  .notes-toolbar {
    grid-template-columns: minmax(220px, 1fr) auto;
    align-items: center;
  }

  .toolbar-controls {
    grid-template-columns: 150px 120px auto;
  }

  .modal-overlay {
    align-items: center;
    padding: 24px;
  }

  .modal-panel {
    border-radius: var(--radius-panel);
    padding: 22px 22px 28px;
  }
}

@media (max-width: 360px) {
  .notes-head {
    align-items: flex-start;
  }

  .notes-head :deep(ion-button) {
    font-size: 11px;
  }

  .toolbar-controls {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .pin-filter {
    grid-column: 1 / -1;
  }

  .note-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .note-meta time {
    text-align: left;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .modal-panel {
    animation: panel-enter 160ms ease-out;
  }

  @keyframes panel-enter {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
