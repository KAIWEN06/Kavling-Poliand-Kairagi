<template>
  <div class="progress-skeleton">
    <main class="progress-page">
      <!-- FILTER -->
      <section class="filter-section">
        <div class="skeleton skeleton-count"></div>
        <div class="filter-scroll">
          <div v-for="i in 6" :key="i" class="skeleton skeleton-chip" :class="`chip-${i}`"></div>
        </div>
      </section>

      <!-- FEATURED -->
      <section class="featured-section">
        <div class="section-heading">
          <div>
            <div class="skeleton skeleton-label"></div>
            <div class="skeleton skeleton-title"></div>
          </div>
        </div>

        <article class="featured-card">
          <div class="skeleton featured-image"></div>

          <div class="featured-content">
            <div class="featured-title-row">
              <div class="featured-copy">
                <div class="skeleton skeleton-featured-name"></div>
                <div class="skeleton skeleton-description"></div>
                <div class="skeleton skeleton-description short"></div>
              </div>

              <div class="skeleton skeleton-percentage"></div>
            </div>

            <div class="skeleton skeleton-progress"></div>

            <div class="featured-footer">
              <div class="skeleton skeleton-status"></div>
              <div class="skeleton skeleton-date"></div>
            </div>
          </div>
        </article>
      </section>

      <!-- PROJECT LIST -->
      <section class="projects-section">
        <div class="section-heading">
          <div>
            <div class="skeleton skeleton-label"></div>
            <div class="skeleton skeleton-title project-title"></div>
          </div>

          <div class="skeleton skeleton-section-count"></div>
        </div>

        <div class="project-list">
          <article v-for="i in 5" :key="i" class="project-card">
            <div class="skeleton project-thumbnail"></div>

            <div class="project-body">
              <div class="project-top">
                <div class="skeleton skeleton-category"></div>
                <div class="skeleton skeleton-project-percentage"></div>
              </div>

              <div class="skeleton skeleton-project-name"></div>

              <div class="skeleton skeleton-project-description"></div>
              <div class="skeleton skeleton-project-description short"></div>

              <div class="skeleton skeleton-project-progress"></div>

              <div class="project-meta">
                <div class="skeleton skeleton-meta"></div>
                <div class="skeleton skeleton-meta update"></div>
              </div>
            </div>

            <div class="skeleton skeleton-arrow"></div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.progress-skeleton {
  width: 100%;
  min-height: 100%;
  background: var(--pl-background, #f8f7f2);
}

.progress-page {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 16px calc(90px + env(safe-area-inset-bottom));
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 7px;
  background: #e9e7df;
}

.skeleton::after {
  position: absolute;
  inset: 0;
  content: "";
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,.45) 50%,
    transparent 100%
  );
  animation: skeleton-shimmer 1.35s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* FILTER */

.filter-section {
  margin-bottom: 25px;
}

.skeleton-count {
  width: 82px;
  height: 11px;
  margin-bottom: 10px;
  border-radius: 5px;
}

.filter-scroll {
  display: flex;
  gap: 7px;
  overflow: hidden;
}

.skeleton-chip {
  flex: 0 0 auto;
  height: 34px;
  border-radius: 999px;
}

.chip-1 {
  width: 52px;
}

.chip-2 {
  width: 64px;
}

.chip-3 {
  width: 78px;
}

.chip-4 {
  width: 88px;
}

.chip-5 {
  width: 61px;
}

.chip-6 {
  width: 67px;
}

/* SECTION */

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}

.skeleton-label {
  width: 82px;
  height: 8px;
  margin-bottom: 7px;
  border-radius: 4px;
}

.skeleton-title {
  width: 138px;
  height: 19px;
  border-radius: 5px;
}

.skeleton-title.project-title {
  width: 160px;
}

.skeleton-section-count {
  width: 25px;
  height: 25px;
  border-radius: 50%;
}

/* FEATURED */

.featured-section {
  margin-bottom: 29px;
}

.featured-card {
  overflow: hidden;
  border: 1px solid #e4e1d8;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(45,45,45,.05);
}

.featured-image {
  width: 100%;
  height: 190px;
  border-radius: 0;
}

.featured-content {
  padding: 16px;
}

.featured-title-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.featured-copy {
  flex: 1;
  min-width: 0;
}

.skeleton-featured-name {
  width: 125px;
  height: 17px;
  margin-bottom: 8px;
}

.skeleton-description {
  width: 92%;
  height: 9px;
  margin-bottom: 6px;
  border-radius: 4px;
}

.skeleton-description.short {
  width: 67%;
}

.skeleton-percentage {
  flex: 0 0 auto;
  width: 39px;
  height: 22px;
  border-radius: 5px;
}

.skeleton-progress {
  width: 100%;
  height: 7px;
  margin-top: 15px;
  border-radius: 999px;
}

.featured-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.skeleton-status {
  width: 92px;
  height: 9px;
  border-radius: 4px;
}

.skeleton-date {
  width: 76px;
  height: 9px;
  border-radius: 4px;
}

/* PROJECT LIST */

.projects-section {
  margin-bottom: 27px;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.project-card {
  display: grid;
  grid-template-columns: 105px minmax(0, 1fr) 17px;
  align-items: center;
  gap: 12px;
  min-height: 126px;
  padding: 9px;
  border: 1px solid #e4e1d8;
  border-radius: 17px;
  background: #fff;
}

.project-thumbnail {
  width: 105px;
  height: 108px;
  border-radius: 11px;
}

.project-body {
  min-width: 0;
}

.project-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}

.skeleton-category {
  width: 57px;
  height: 8px;
  border-radius: 4px;
}

.skeleton-project-percentage {
  width: 31px;
  height: 15px;
  border-radius: 4px;
}

.skeleton-project-name {
  width: 110px;
  height: 14px;
  margin-top: 8px;
  margin-bottom: 7px;
  border-radius: 4px;
}

.skeleton-project-description {
  width: 95%;
  height: 8px;
  margin-bottom: 5px;
  border-radius: 4px;
}

.skeleton-project-description.short {
  width: 68%;
}

.skeleton-project-progress {
  width: 100%;
  height: 5px;
  margin-top: 10px;
  border-radius: 999px;
}

.project-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  margin-top: 8px;
}

.skeleton-meta {
  width: 61px;
  height: 8px;
  border-radius: 4px;
}

.skeleton-meta.update {
  width: 48px;
}

.skeleton-arrow {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

/* MOBILE */

@media (max-width: 380px) {
  .progress-page {
    padding-inline: 13px;
  }

  .project-card {
    grid-template-columns: 92px minmax(0, 1fr) 15px;
    gap: 9px;
  }

  .project-thumbnail {
    width: 92px;
    height: 103px;
  }

  .skeleton-title.project-title {
    width: 145px;
  }
}
</style>