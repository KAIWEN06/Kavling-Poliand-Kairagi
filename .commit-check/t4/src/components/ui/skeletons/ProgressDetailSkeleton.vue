<template>
  <div class="detail-skeleton">
    <div class="skeleton hero"></div>

    <div class="content">
      <div class="title-row">
        <div class="title-group">
          <div class="skeleton eyebrow"></div>
          <div class="skeleton title"></div>
          <div class="skeleton subtitle"></div>
        </div>
        <div class="skeleton percentage"></div>
      </div>

      <div class="skeleton progress-bar"></div>

      <div class="meta-row">
        <div class="skeleton meta"></div>
        <div class="skeleton meta small"></div>
      </div>

      <section class="section">
        <div class="skeleton section-label"></div>
        <div class="skeleton section-title"></div>

        <div class="update-card">
          <div class="skeleton update-image"></div>
          <div class="update-content">
            <div class="skeleton line"></div>
            <div class="skeleton line medium"></div>
            <div class="skeleton line short"></div>
            <div class="skeleton date"></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="skeleton section-label"></div>
        <div class="skeleton section-title"></div>

        <div class="photo-grid">
          <div v-for="i in 4" :key="i" class="skeleton photo"></div>
        </div>
      </section>

      <section class="section">
        <div class="skeleton section-label"></div>
        <div class="skeleton section-title"></div>

        <div class="timeline">
          <div v-for="i in 4" :key="i" class="timeline-item">
            <div class="skeleton timeline-dot"></div>
            <div class="timeline-content">
              <div class="skeleton line"></div>
              <div class="skeleton line medium"></div>
              <div class="skeleton line short"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.detail-skeleton{width:100%;min-height:100%;background:#f8f7f2}.content{padding:20px 16px 90px;max-width:680px;margin:0 auto}.skeleton{position:relative;overflow:hidden;background:#e7e5dc;border-radius:7px}.skeleton::after{position:absolute;inset:0;content:"";transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:shimmer 1.35s ease-in-out infinite}.hero{width:100%;height:210px;border-radius:0}.title-row{display:flex;justify-content:space-between;gap:15px;margin-top:20px}.title-group{flex:1;min-width:0}.eyebrow{width:78px;height:8px;margin-bottom:8px}.title{width:170px;height:22px;margin-bottom:8px}.subtitle{width:85%;height:9px}.percentage{width:48px;height:25px;border-radius:6px}.progress-bar{width:100%;height:7px;margin-top:17px;border-radius:999px}.meta-row{display:flex;justify-content:space-between;gap:10px;margin-top:10px}.meta{width:92px;height:9px}.meta.small{width:75px}.section{margin-top:30px}.section-label{width:82px;height:8px;margin-bottom:7px}.section-title{width:145px;height:19px;margin-bottom:13px}.update-card{display:grid;grid-template-columns:105px minmax(0,1fr);gap:12px;padding:9px;border:1px solid #e2dfd5;border-radius:17px;background:#fff}.update-image{width:105px;height:105px;border-radius:11px}.update-content{padding:7px 4px}.line{width:95%;height:10px;margin-bottom:8px}.line.medium{width:75%}.line.short{width:52%}.date{width:65px;height:8px;margin-top:16px}.photo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.photo{width:100%;height:125px;border-radius:12px}.timeline{display:flex;flex-direction:column}.timeline-item{position:relative;display:flex;gap:12px;min-height:72px}.timeline-item:not(:last-child)::before{position:absolute;left:6px;top:17px;bottom:0;width:2px;content:"";background:#e3e0d6}.timeline-dot{z-index:1;flex:0 0 14px;width:14px;height:14px;border-radius:50%;margin-top:2px}.timeline-content{flex:1;padding-bottom:18px}.timeline-content .line{width:90%;height:9px;margin-bottom:7px}.timeline-content .line.medium{width:70%}.timeline-content .line.short{width:45%}@keyframes shimmer{100%{transform:translateX(100%)}}@media(max-width:380px){.content{padding-inline:13px}.hero{height:190px}.update-card{grid-template-columns:92px minmax(0,1fr)}.update-image{width:92px;height:100px}.photo{height:110px}}
</style>
