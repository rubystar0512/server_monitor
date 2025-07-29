import react from "@vitejs/plugin-react";
export default {
  plugins: [react()],
  server: {
    host: true,
    port: 3335,
    strictPort: true,
  },
};
