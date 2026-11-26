import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { carpetaTicket, entorno, navegador } from './soporte/entorno';

/**
 * Suite automatizada de un ticket. Se ejecuta con: npm run pruebas -- <proyecto>/<ticket> (ver LEEME.md)
 * - Pruebas:          proyectos/<proyecto>/<ticket>/qa/pruebas/<sección>/<ID>.spec.ts
 * - Inicio de sesión: sistemas/<SISTEMA>/sesion.ts (tickets anteriores: proyectos/<proyecto>/sesion.ts)
 * - URL y usuarios:   proyectos/<proyecto>/.env, con lo que sobrescriba proyectos/<proyecto>/<ticket>/.env
 * - Reporte:          qa/reporte/ (suite completa) o qa/reporte-parcial/ (un caso, un filtro o las fallidas)
 *
 * Grupos por etiqueta:
 * - general:  pruebas sin etiqueta; tantas a la vez como PARALELO en el .env (1 por defecto = en serie).
 * - serie:    @serie (no puede correr junto a otras) y @escritura (crea o modifica datos), de a una.
 * - visible:  @visible (el sistema bloquea el navegador oculto), de a una y con ventana.
 * npm run pruebas corre primero «general» y después «serie» y «visible», y une ambas fases en un reporte.
 */
const qa = path.join(carpetaTicket(), 'qa');
const fase = process.env.QA_FASE; // 1 o 2, la fija npm run pruebas
const reporte = path.join(qa, process.env.QA_REPORTE || 'reporte');
// En serie por defecto: en ambientes compartidos, varias pruebas a la vez causan esperas agotadas e intermitencias.
const paralelo = Math.max(1, Number(process.env.PARALELO || entorno.opcional('PARALELO') || 1) || 1);
const EN_SERIE = /@serie|@escritura|@visible/;
const soporte = (archivo: string) => path.join(__dirname, 'soporte', archivo);

export default defineConfig({
  testDir: path.join(qa, 'pruebas'),
  testMatch: '**/*.spec.ts',
  workers: paralelo,
  retries: Number(process.env.QA_REINTENTOS || 0), // 0: un fallo se revisa con playwright-cli; regresion usa 1
  timeout: 90_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(qa, 'resultados', fase ? `fase-${fase}` : 'ultima'),
  globalSetup: soporte('limpiar-sesiones.ts'),
  globalTeardown: soporte('limpiar-sesiones.ts'),
  // --list solo lista: no debe reemplazar el reporte de la última corrida.
  reporter: process.argv.includes('--list')
    ? [[soporte('resumen.ts')]]
    : fase
    ? [[soporte('resumen.ts'), { resumen: false }], ['blob', { outputDir: path.join(qa, '.blob', `fase-${fase}`) }]]
    : [[soporte('resumen.ts')], ['html', { outputFolder: reporte, open: 'never' }]],
  use: {
    baseURL: entorno.valor('URL'),
    channel: 'chrome', // el mismo Chrome que usa playwright-cli
    ...navegador,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'general', grepInvert: EN_SERIE, fullyParallel: true },
    { name: 'serie', grep: /@serie|@escritura/, grepInvert: /@visible/, workers: 1 },
    { name: 'visible', grep: /@visible/, workers: 1, use: { headless: false } },
  ],
});
