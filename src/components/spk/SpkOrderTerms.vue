<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; title?: string }>(), {
  title: 'Ketentuan Pemesanan',
})
defineEmits<{ 'update:modelValue': [value: boolean] }>()

// Bagian IV dokumen SPK cetak. Bila dokumennya berubah, ubah juga di sini.
const TERMS = [
  'Pihak Kedua menyatakan telah menentukan Unit Kavling dan memesan Kavling sebagaimana tercantum dalam dokumen ini.',
  'Pihak Pertama telah menerima Booking Fee / Tanda Jadi sebagai bukti keseriusan dan pengikatan awal atas pemesanan Kavling yang disebutkan di atas.',
  'Sejak pembayaran Booking Fee / Tanda Jadi diterima dan SPK ini ditandatangani, Kavling yang dipesan akan ditandai dalam status Booked selama masa pemesanan yang disepakati.',
  'Booking Fee / Tanda Jadi tidak diperhitungkan sebagai bagian dari Harga Pembelian Unit Kavling.',
  'Pembayaran Cicilan Pertama dan Penandatanganan PPJB Notaris sebelum masa berlaku SPK ini berakhir.',
  'Apabila Pihak Kedua gagal melaksanakan Penandatanganan PPJB dan pembayaran cicilan pertama sesuai waktu yang telah disepakati, maka SPK ini secara otomatis batal dan biaya Booking Fee / Tanda Jadi tidak dikembalikan kepada Pihak Kedua.',
  'Proses penandatanganan AJB dan balik nama SHM Kavling akan diatur dalam PPJB Notaris.',
]
</script>

<template>
  <section class="spk-terms" aria-labelledby="spk-terms-title">
    <header class="spk-terms__head">
      <h3 id="spk-terms-title">{{ title }}</h3>
      <p>Isinya akan tercantum di SPK yang Anda tanda tangani. Pihak Pertama adalah penjual, Pihak Kedua adalah Anda.</p>
    </header>

    <ol class="spk-terms__list">
      <li v-for="(term, index) in TERMS" :key="index">
        <span class="spk-terms__number" aria-hidden="true">{{ index + 1 }}</span>
        <p>{{ term }}</p>
      </li>
    </ol>

    <label class="spk-terms__agree" :class="{ 'is-checked': modelValue }">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span>Saya sudah membaca ketujuh ketentuan ini.</span>
    </label>
  </section>
</template>

<style scoped>
.spk-terms {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
}

.spk-terms__head h3 {
  margin: 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.spk-terms__head h3::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  margin-top: 8px;
  border-radius: var(--radius-pill, 999px);
  background: var(--poliland-gold, #cba044);
}

.spk-terms__head p {
  margin: 10px 0 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  line-height: 1.55;
}

.spk-terms__list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.spk-terms__list li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  padding: 11px 0;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.spk-terms__number {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.spk-terms__list p {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.6;
}

.spk-terms__agree {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #fbf8f2);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 150ms) var(--ease-spring, ease-out), border-color var(--dur-fast, 150ms);
}

.spk-terms__agree.is-checked {
  border-color: var(--poliland-green, #355a2c);
}

.spk-terms__agree:active {
  transform: scale(0.98);
}

.spk-terms__agree:focus-within {
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.spk-terms__agree input {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin: 0;
  accent-color: var(--poliland-green, #355a2c);
}

@media (prefers-reduced-motion: reduce) {
  .spk-terms__agree { transition: none; }
  .spk-terms__agree:active { transform: none; }
}
</style>
