<template>
  <section class="activity-section">

    <!-- HEADER -->
    <div class="activity-header">

      <h2>
        Aktivitas Terbaru
      </h2>

      <button
        type="button"
        class="view-all-button"
        @click="$emit('view-all')"
      >
        Lihat Semua
        <span>›</span>
      </button>

    </div>


    <!-- ACTIVITY LIST -->
    <div class="activity-list">

      <article
        v-for="activity in activities"
        :key="activity.id"
        class="activity-card"
      >

        <!-- AVATAR -->
        <div class="activity-avatar">
          {{ activity.initials }}
        </div>


        <!-- INFORMATION -->
        <div class="activity-info">

          <h3>
            {{ activity.name }}
          </h3>

          <p>
            {{ activity.description }}
          </p>

        </div>


        <!-- STATUS -->
        <div class="activity-right">

          <span
            :class="[
              'activity-status',
              `status-${activity.statusType}`
            ]"
          >
            {{ activity.status }}
          </span>

          <span class="activity-time">
            {{ activity.time }}
          </span>

        </div>

      </article>

    </div>

  </section>
</template>


<script setup lang="ts">

interface Activity {
  id: number
  initials: string
  name: string
  description: string
  status: string
  statusType: string
  time: string
}


defineProps<{
  activities: Activity[]
}>()


defineEmits<{
  'view-all': []
}>()

</script>


<style scoped>

.activity-section {
  position: relative;

  z-index: 2;

  margin-bottom: 170px;
}


/* =====================================================
   HEADER
   ===================================================== */

.activity-header {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 16px;

  margin-bottom: 26px;
}


.activity-header h2 {
  margin: 0;

  color: #292929;

  font-size: 25px;

  line-height: 1.1;

  font-weight: 800;

  letter-spacing: -0.4px;
}


.view-all-button {
  display: flex;

  align-items: center;

  gap: 2px;

  flex-shrink: 0;

  padding: 0;

  border: 0;

  background: transparent;

  color: #c39f4c;

  font-family: inherit;

  font-size: 14px;

  font-weight: 600;

  cursor: pointer;
}


.view-all-button span {
  font-size: 21px;

  line-height: 1;
}


/* =====================================================
   LIST
   ===================================================== */

.activity-list {
  display: flex;

  flex-direction: column;

  gap: 18px;
}


/* =====================================================
   CARD
   ===================================================== */

.activity-card {
  min-height: 108px;

  display: flex;

  align-items: center;

  gap: 14px;

  padding:
    16px
    18px
    16px
    16px;

  border-radius: 18px;

  background: #ffffff;

  box-shadow:
    0 1px 5px
    rgba(45, 45, 45, 0.025);
}


/* =====================================================
   AVATAR
   ===================================================== */

.activity-avatar {
  width: 50px;

  height: 50px;

  display: flex;

  align-items: center;

  justify-content: center;

  flex-shrink: 0;

  border-radius: 50%;

  background: #f2e9d0;

  color: #4a463d;

  font-size: 15px;

  font-weight: 700;
}


/* =====================================================
   INFO
   ===================================================== */

.activity-info {
  min-width: 0;

  flex: 1;
}


.activity-info h3 {
  margin: 0 0 5px;

  overflow: hidden;

  color: #292929;

  font-size: 16px;

  line-height: 1.1;

  font-weight: 750;

  text-overflow: ellipsis;

  white-space: nowrap;
}


.activity-info p {
  margin: 0;

  color: #747474;

  font-size: 13px;

  line-height: 1.25;

  font-weight: 500;
}


/* =====================================================
   RIGHT
   ===================================================== */

.activity-right {
  display: flex;

  flex-direction: column;

  align-items: flex-end;

  justify-content: center;

  gap: 10px;

  flex-shrink: 0;
}


.activity-status {
  min-width: 96px;

  padding:
    9px
    13px;

  border-radius: 13px;

  color: #414141;

  font-size: 13px;

  line-height: 1;

  font-weight: 700;

  text-align: center;

  white-space: nowrap;
}


.status-followup {
  background: #f2d5ce;
}


.status-booking {
  background: #f9eaca;
}


.status-prospect {
  background: #f2d5ce;
}


.activity-time {
  color: #747474;

  font-size: 12px;

  line-height: 1;

  white-space: nowrap;
}


@media (max-width: 360px) {

  .activity-header h2 {
    font-size: 22px;
  }

  .view-all-button {
    font-size: 12px;
  }

  .activity-card {
    gap: 10px;

    padding:
      14px
      12px;
  }

  .activity-avatar {
    width: 44px;

    height: 44px;

    font-size: 13px;
  }

  .activity-info h3 {
    font-size: 14px;
  }

  .activity-info p {
    font-size: 11px;
  }

  .activity-status {
    min-width: 82px;

    padding:
      8px
      9px;

    font-size: 11px;
  }

  .activity-time {
    font-size: 10px;
  }
}

</style>