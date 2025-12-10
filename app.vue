<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

// Register service worker for PWA functionality
onMounted(() => {
  if ('serviceWorker' in navigator) {
    const config = useRuntimeConfig()
    const baseURL = config.app.baseURL || '/'
    
    // Build service worker path dynamically
    const swPath = `${baseURL}sw.js`.replace(/\/+/g, '/')
    const scope = baseURL
    
    navigator.serviceWorker.register(swPath, { scope })
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  }
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: black;
  color: white;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Prevent zoom on double tap (iOS) */
* {
  touch-action: manipulation;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
