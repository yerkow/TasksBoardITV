import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { componentTagger } from "lovable-tagger";
import type { ServerOptions } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Проверяем наличие SSL сертификатов
  const certsPath = path.resolve(__dirname, 'server/certs');
  const keyPath = path.join(certsPath, 'key.pem');
  const certPath = path.join(certsPath, 'cert.pem');
  
  const hasSSL = existsSync(keyPath) && existsSync(certPath);
  
  // Настройка сервера с правильными типами
  const serverConfig: ServerOptions = {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  };
  
  // Добавляем HTTPS только если есть сертификаты
  if (hasSSL) {
    serverConfig.https = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath)
    };
  }
  
  return {
    server: serverConfig,
    build: {
      target: ['es2015', 'chrome58', 'firefox57', 'safari11'], // Поддержка старых браузеров
      modulePreload: {
        polyfill: true
      },
      cssCodeSplit: false
    },
  esbuild: {
    target: 'es2015' // Совместимость с мобильными браузерами
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
};
});
