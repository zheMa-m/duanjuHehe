<script setup lang="ts">
import AppBottomNav from '~/components/app/AppBottomNav.vue'
</script>

<template>
  <div class="app-layout">
    <main class="app-main">
      <slot />
    </main>
    <AppBottomNav />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  background: #f8fafc;
  color: #0f172a;
  font-family: var(--font-sans);
  max-width: 480px;
  margin: 0 auto;
}
.app-main { padding-bottom: 72px; }
</style>
