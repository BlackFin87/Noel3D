/** @type {import('tailwindcss').Config} */
export default {
  // Chỉ định các file cần áp dụng giao diện
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700', // Định nghĩa màu "Vàng Kim Loại" riêng cho dự án này
      }
    },
  },
  plugins: [],
}