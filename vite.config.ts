import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Custom logger to filter out gradient warnings
const customLogger = {
  hasWarned: false,
  info(msg: string) {
    console.log(msg);
  },
  warn(msg: string) {
    // Filter out gradient syntax warnings
    if (msg.includes('Gradient has outdated direction syntax')) {
      return;
    }
    console.warn(msg);
  },
  error(msg: string) {
    console.error(msg);
  },
  clearScreen() {
    console.clear();
  },
  hasErrorLogged() {
    return false;
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  customLogger: mode === 'development' ? customLogger : undefined,
}));
