<template>
  <ion-button 
    :color="color" 
    :fill="fill" 
    :expand="expand" 
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </ion-button>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue';

withDefaults(defineProps<{
  color?: string;
  fill?: 'solid' | 'default' | 'clear' | 'outline';
  expand?: 'block' | 'full';
  disabled?: boolean;
}>(), {
  color: 'primary',
  fill: 'solid',
  disabled: false
});

defineEmits(['click']);
</script>