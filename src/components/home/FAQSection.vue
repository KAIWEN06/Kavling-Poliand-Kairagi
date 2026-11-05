<template>
  <section class="faq-section">

    <!-- HEADER -->
    <div class="faq-container">

      <div class="faq-header">
        <div>
          <h2>FAQ</h2>
          <span class="faq-line"></span>
        </div>
      </div>

      <!-- LOADING -->
      <div
        v-if="loading"
        class="faq-loading"
      >
        <ion-spinner name="crescent" />
      </div>

      <!-- FAQ LIST -->
      <div
        v-else
        class="faq-list"
      >

        <div
          v-for="(faq, index) in faqs"
          :key="faq.id || index"
          class="faq-item"
          :class="{ open: openIndex === index }"
        >

          <!-- QUESTION -->
          <button
            type="button"
            class="faq-question"
            @click="toggleFaq(index)"
          >

            <span>
              {{ faq.question }}
            </span>

            <ion-icon
              :icon="
                openIndex === index
                  ? chevronUpOutline
                  : chevronDownOutline
              "
            />

          </button>

          <!-- ANSWER -->
          <div
            v-show="openIndex === index"
            class="faq-answer"
          >
            {{ faq.answer }}
          </div>

        </div>

        <!-- EMPTY -->
        <div
          v-if="faqs.length === 0"
          class="faq-empty"
        >
          Belum ada pertanyaan FAQ.
        </div>

      </div>

    </div>

  </section>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted
} from 'vue'

import {
  IonIcon,
  IonSpinner
} from '@ionic/vue'

import {
  chevronUpOutline,
  chevronDownOutline
} from 'ionicons/icons'

import { faqService } from '@/services/faqService'

interface FAQ {
  id?: string | number
  question: string
  answer: string
}

const faqs = ref<FAQ[]>([])

const loading = ref(true)

const openIndex = ref<number | null>(null)

/* =========================================================
   LOAD FAQ
========================================================= */

async function loadFaqs() {

  loading.value = true

  try {

    const result = await faqService.getFaqs()

    faqs.value = Array.isArray(result)
      ? result
      : []

  } catch (error) {

    console.error(
      'Gagal mengambil FAQ:',
      error
    )

    faqs.value = []

  } finally {

    loading.value = false

  }

}

/* =========================================================
   TOGGLE
========================================================= */

function toggleFaq(index: number) {

  if (openIndex.value === index) {

    openIndex.value = null

  } else {

    openIndex.value = index

  }

}

/* =========================================================
   MOUNT
========================================================= */

onMounted(() => {

  loadFaqs()

})

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

  font-size: 11px;

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

  font-size: 10px;

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

</style>