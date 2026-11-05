import { ref } from 'vue'

export function usePageLoading() {
  const isLoading = ref(true)

  const startLoading = () => {
    isLoading.value = true
  }

  const stopLoading = () => {
    isLoading.value = false
  }

  return {
    isLoading,
    startLoading,
    stopLoading
  }
}