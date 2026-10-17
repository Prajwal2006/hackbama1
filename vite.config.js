import { defineConfig, loadEnv } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import scanPlugin from './server/scan-plugin.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [basicSsl(), scanPlugin(env)],
    preview: { host: true, port: 3000, strictPort: true, allowedHosts: true },
    server: { host: true, port: 3000, strictPort: true, allowedHosts: true },
  };
});
