<template>
  <!-- Satu pintu "Akun" untuk semua role. Client punya formulir data diri
       (tabel customers); role lain memakai halaman profil + keluar akun. -->
  <AkunClientPage v-if="profile?.role === 'client'" />
  <ProfilePage v-else />
</template>

<script setup lang="ts">
import AkunClientPage from '@/views/client/AkunClientPage.vue'
import ProfilePage from '@/views/account/ProfilePage.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

const { profile } = useCurrentUser()
</script>
