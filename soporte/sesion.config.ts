import { defineConfig } from '@playwright/test';

/** Configuración de `npm run sesion` (solo corre soporte/guardar-sesion.spec.ts). */
export default defineConfig({
  testDir: __dirname,
  testMatch: 'guardar-sesion.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: 'line',
  outputDir: `${__dirname}/../node_modules/.cache/qa-sesion`,
  use: {
    channel: 'chrome',
    headless: process.env.QA_VISIBLE !== '1',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
});
