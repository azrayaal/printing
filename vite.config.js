import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Sebagian mesin Linux kehabisan kuota inotify (ENOSPC: System limit for
    // number of file watchers reached). Polling menghindari inotify sama
    // sekali sehingga dev server tetap jalan tanpa perlu ubah sysctl.
    // Jika kuota watcher sudah dinaikkan, bagian watch ini boleh dihapus:
    //   sudo sysctl fs.inotify.max_user_watches=524288
    watch: { usePolling: true, interval: 300 },
  },
})
