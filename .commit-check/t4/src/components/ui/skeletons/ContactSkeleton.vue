<template>
  <div class="contact-page contact-page-skeleton">
    <section class="contact-hero">
      <div class="hero-copy contact-hero-skeleton">
        <Skeleton width="82px" height="22px" border-radius="999px" />
        <Skeleton width="225px" height="34px" border-radius="7px" />
        <Skeleton width="185px" height="34px" border-radius="7px" />
        <Skeleton width="92%" height="10px" border-radius="5px" />
        <Skeleton width="76%" height="10px" border-radius="5px" />
      </div>
      <div class="hero-decoration">
        <Skeleton width="82px" height="82px" border-radius="50%" />
      </div>
    </section>

    <section class="contact-section">
      <div class="section-heading">
        <div class="contact-heading-skeleton">
          <Skeleton width="125px" height="8px" border-radius="4px" />
          <Skeleton width="220px" height="20px" border-radius="5px" />
        </div>
      </div>

      <div class="contact-list">
        <div v-for="i in 2" :key="`contact-skeleton-${i}`" class="contact-card contact-card-skeleton">
          <div class="contact-icon">
            <Skeleton width="50px" height="50px" border-radius="15px" />
          </div>
          <div class="contact-info contact-info-skeleton">
            <Skeleton :width="i === 1 ? '62px' : '48px'" height="8px" border-radius="4px" />
            <Skeleton :width="i === 1 ? '145px' : '95px'" height="15px" border-radius="5px" />
            <Skeleton :width="i === 1 ? '190px' : '175px'" height="8px" border-radius="4px" />
          </div>
          <Skeleton width="31px" height="31px" border-radius="50%" />
        </div>
      </div>
    </section>

    <section class="social-section">
      <div class="section-heading">
        <div class="contact-heading-skeleton">
          <Skeleton width="105px" height="8px" border-radius="4px" />
          <Skeleton width="190px" height="20px" border-radius="5px" />
        </div>
      </div>

      <div class="social-grid">
        <div v-for="i in 3" :key="`social-skeleton-${i}`" class="social-card social-card-skeleton">
          <div class="social-icon">
            <Skeleton width="45px" height="45px" border-radius="14px" />
          </div>
          <div class="social-info social-info-skeleton">
            <Skeleton width="58px" height="8px" border-radius="4px" />
            <Skeleton :width="i === 1 ? '118px' : i === 2 ? '105px' : '110px'" height="14px" border-radius="5px" />
            <Skeleton width="145px" height="8px" border-radius="4px" />
          </div>
          <Skeleton width="17px" height="17px" border-radius="50%" />
        </div>
      </div>
    </section>

    <section class="location-card">
      <div class="location-icon">
        <Skeleton width="52px" height="52px" border-radius="16px" />
      </div>
      <div class="location-copy-skeleton">
        <Skeleton width="52px" height="8px" border-radius="4px" />
        <Skeleton width="125px" height="17px" border-radius="5px" />
        <Skeleton width="100%" height="8px" border-radius="4px" />
        <Skeleton width="82%" height="8px" border-radius="4px" />
      </div>
      <Skeleton width="108px" height="40px" border-radius="9px" />
    </section>

    <div class="page-bottom-space" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'
</script>

<style scoped>
.contact-page-skeleton {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 18px 18px 0;
  pointer-events: none;
  user-select: none;
}

.contact-hero-skeleton {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: min(100%, 590px);
}

.contact-heading-skeleton,
.contact-info-skeleton,
.social-info-skeleton,
.location-copy-skeleton {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.contact-heading-skeleton {
  gap: 5px;
}

.contact-info-skeleton,
.social-info-skeleton {
  gap: 5px;
}

.location-copy-skeleton {
  gap: 6px;
  min-width: 0;
}

@media (max-width: 560px) {
  .location-copy-skeleton {
    width: 100%;
  }
}
</style>
