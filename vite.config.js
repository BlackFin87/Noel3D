import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [react()],
    // LOGIC THÔNG MINH:
    // 1. Nếu đang chạy local (serve) -> Dùng đường dẫn gốc '/'
    // 2. Nếu đang đóng gói (build) -> Dùng đường dẫn GitHub '/noel-lop5a/'
    base: isDev ? '/' : '/Noel3D/', 
  }
})