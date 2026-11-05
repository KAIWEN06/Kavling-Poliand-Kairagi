<template>
  <button
    type="button"
    class="commission-card"
    @click="$emit('click')"
  >

    <div class="commission-content">

      <span class="commission-label">
        Total Komisi Saya
      </span>

      <strong class="commission-value">
        {{ formattedTotal }}
      </strong>

    </div>


    <div class="commission-action">
      <span>
        Lihat Detail
      </span>

      <span class="arrow">
        ›
      </span>
    </div>

  </button>
</template>


<script setup lang="ts">
import { computed } from 'vue'


const props = defineProps<{
  total: number
}>()


defineEmits<{
  click: []
}>()


const formattedTotal = computed(() => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(props.total)
})
</script>


<style scoped>

.commission-card {
  position: relative;

  z-index: 2;

  width: 100%;

  min-height: 130px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 16px;

  padding:
    20px
    24px;

  margin: 0 0 34px;

  border: 0;

  border-radius: 18px;

  background: #c9a754;

  color: #ffffff;

  text-align: left;

  font-family: inherit;

  cursor: pointer;

  box-shadow: none;

  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}


.commission-card:active {
  transform: scale(0.985);
}


.commission-content {
  display: flex;

  flex-direction: column;

  min-width: 0;
}


.commission-label {
  margin-bottom: 12px;

  font-size: 16px;

  line-height: 1.2;

  font-weight: 500;
}


.commission-value {
  font-size: 31px;

  line-height: 1;

  font-weight: 800;

  letter-spacing: -0.8px;

  white-space: nowrap;
}


.commission-action {
  display: flex;

  align-items: center;

  gap: 3px;

  flex-shrink: 0;

  margin-top: 25px;

  font-size: 15px;

  font-weight: 600;

  white-space: nowrap;
}


.arrow {
  font-size: 22px;

  line-height: 1;

  margin-top: -1px;
}


@media (max-width: 360px) {

  .commission-card {
    padding:
      18px
      20px;
  }

  .commission-value {
    font-size: 27px;
  }

  .commission-action {
    font-size: 13px;
  }
}

</style>