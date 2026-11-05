<template>
  <div class="home-skeleton">

    <!-- HERO -->
    <section class="hero">

      <div class="hero-content">

        <Skeleton
          width="100px"
          height="14px"
        />

        <Skeleton
          width="75%"
          height="36px"
          border-radius="10px"
        />

        <Skeleton
          width="100%"
          height="14px"
        />

        <Skeleton
          width="70%"
          height="14px"
        />

        <div class="hero-buttons">

          <Skeleton
            width="130px"
            height="44px"
            border-radius="12px"
          />

          <Skeleton
            width="44px"
            height="44px"
            border-radius="12px"
          />

        </div>

      </div>

    </section>


    <!-- STATISTICS -->
    <section class="section">

      <div class="section-header">

        <Skeleton
          width="140px"
          height="24px"
        />

        <Skeleton
          width="50px"
          height="16px"
        />

      </div>

      <div class="stats">

        <div
          v-for="i in 4"
          :key="i"
          class="stat-card"
        >

          <Skeleton
            width="42px"
            height="42px"
            border-radius="12px"
          />

          <div class="stat-content">

            <Skeleton
              width="55px"
              height="20px"
            />

            <Skeleton
              width="80px"
              height="12px"
            />

          </div>

        </div>

      </div>

    </section>


    <!-- FEATURES -->
    <section class="section">

      <div class="section-header">

        <Skeleton
          width="170px"
          height="24px"
        />

      </div>

      <div class="feature-list">

        <div
          v-for="i in 3"
          :key="i"
          class="feature-card"
        >

          <Skeleton
            width="50px"
            height="50px"
            border-radius="14px"
          />

          <div class="feature-content">

            <Skeleton
              width="130px"
              height="18px"
            />

            <Skeleton
              width="100%"
              height="12px"
            />

            <Skeleton
              width="75%"
              height="12px"
            />

          </div>

        </div>

      </div>

    </section>


    <!-- ABOUT -->
    <section class="section">

      <Skeleton
        width="110px"
        height="24px"
      />

      <Skeleton
        width="100%"
        height="200px"
        border-radius="18px"
      />

      <div class="text-lines">

        <Skeleton
          width="100%"
          height="13px"
        />

        <Skeleton
          width="100%"
          height="13px"
        />

        <Skeleton
          width="70%"
          height="13px"
        />

      </div>

    </section>


    <!-- GALLERY -->
    <section class="section">

      <div class="section-header">

        <Skeleton
          width="120px"
          height="24px"
        />

        <Skeleton
          width="50px"
          height="16px"
        />

      </div>

      <div class="gallery">

        <Skeleton
          width="100%"
          height="180px"
          border-radius="16px"
        />

        <Skeleton
          width="100%"
          height="130px"
          border-radius="16px"
        />

        <Skeleton
          width="100%"
          height="130px"
          border-radius="16px"
        />

      </div>

    </section>


    <!-- SITEPLAN -->
    <section class="section">

      <div class="section-header">

        <Skeleton
          width="160px"
          height="24px"
        />

        <Skeleton
          width="60px"
          height="16px"
        />

      </div>

      <Skeleton
        width="100%"
        height="180px"
        border-radius="18px"
      />

    </section>


    <!-- PROGRESS -->
    <section class="section">

      <div class="section-header">

        <Skeleton
          width="120px"
          height="24px"
        />

        <Skeleton
          width="50px"
          height="16px"
        />

      </div>

      <div class="progress-list">

        <div
          v-for="i in 2"
          :key="i"
          class="progress-card"
        >

          <div class="progress-header">

            <Skeleton
              width="50px"
              height="50px"
              border-radius="14px"
            />

            <div class="progress-title">

              <Skeleton
                width="130px"
                height="18px"
              />

              <Skeleton
                width="90px"
                height="12px"
              />

            </div>

          </div>

          <Skeleton
            width="100%"
            height="8px"
            border-radius="999px"
          />

          <div class="progress-footer">

            <Skeleton
              width="70px"
              height="12px"
            />

            <Skeleton
              width="40px"
              height="12px"
            />

          </div>

        </div>

      </div>

    </section>


    <!-- FAQ -->
    <section class="section">

      <Skeleton
        width="80px"
        height="24px"
      />

      <div class="faq">

        <Skeleton
          v-for="i in 4"
          :key="i"
          width="100%"
          height="56px"
          border-radius="14px"
        />

      </div>

    </section>


    <!-- CTA -->
    <section class="section">

      <Skeleton
        width="100%"
        height="190px"
        border-radius="20px"
      />

    </section>


    <!-- CONTACT -->
    <section class="section">

      <Skeleton
        width="120px"
        height="24px"
      />

      <div class="contact">

        <Skeleton
          width="100%"
          height="52px"
          border-radius="14px"
        />

        <Skeleton
          width="100%"
          height="52px"
          border-radius="14px"
        />

        <Skeleton
          width="100%"
          height="52px"
          border-radius="14px"
        />

      </div>

    </section>

    <div class="bottom-space" />

  </div>
</template>


<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'
</script>


<style scoped>

.home-skeleton {
  width: 100%;
  min-height: 100%;

  background: #fafaf7;
}


/* HERO */

.hero {
  min-height: 360px;

  padding: 80px 24px 40px;

  display: flex;
  align-items: center;
}

.hero-content {
  width: 100%;

  display: flex;
  flex-direction: column;

  gap: 14px;
}

.hero-buttons {
  display: flex;
  gap: 10px;

  padding-top: 8px;
}


/* SECTION */

.section {
  padding: 28px 16px 0;
}


/* HEADER */

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 14px;
}


/* STATS */

.stats {
  display: grid;

  grid-template-columns: repeat(2, 1fr);

  gap: 10px;
}

.stat-card {
  display: flex;
  align-items: center;

  gap: 10px;

  padding: 14px;

  border-radius: 16px;

  background: #ffffff;
}

.stat-content {
  display: flex;
  flex-direction: column;

  gap: 7px;
}


/* FEATURES */

.feature-list {
  display: flex;
  flex-direction: column;

  gap: 10px;
}

.feature-card {
  display: flex;
  align-items: center;

  gap: 14px;

  padding: 16px;

  border-radius: 16px;

  background: #ffffff;
}

.feature-content {
  flex: 1;

  display: flex;
  flex-direction: column;

  gap: 8px;
}


/* ABOUT */

.text-lines {
  display: flex;
  flex-direction: column;

  gap: 8px;

  margin-top: 14px;
}


/* GALLERY */

.gallery {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 8px;
}

.gallery > :first-child {
  grid-column: span 2;

  height: 200px !important;
}


/* PROGRESS */

.progress-list {
  display: flex;
  flex-direction: column;

  gap: 10px;
}

.progress-card {
  display: flex;
  flex-direction: column;

  gap: 14px;

  padding: 16px;

  border-radius: 18px;

  background: #ffffff;
}

.progress-header {
  display: flex;
  align-items: center;

  gap: 12px;
}

.progress-title {
  flex: 1;

  display: flex;
  flex-direction: column;

  gap: 7px;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
}


/* FAQ */

.faq {
  display: flex;
  flex-direction: column;

  gap: 10px;

  margin-top: 14px;
}


/* CONTACT */

.contact {
  display: flex;
  flex-direction: column;

  gap: 10px;

  margin-top: 14px;
}


/* BOTTOM */

.bottom-space {
  height: 160px;
}

</style>