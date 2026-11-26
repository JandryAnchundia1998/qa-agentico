import path from 'node:path';
import { carpetaTicket } from './entorno';

/**
 * Une en un solo reporte las dos fases de `npm run pruebas` (paralelo y en serie).
 * Lo usa scripts/pruebas.mjs con: playwright merge-reports --config soporte/fusion.config.ts
 */
const qa = path.join(carpetaTicket(), 'qa');

export default {
  testDir: path.join(qa, 'pruebas'),
  reporter: [
    [path.join(__dirname, 'resumen.ts'), { lineas: false }],
    ['html', { outputFolder: path.join(qa, process.env.QA_REPORTE || 'reporte'), open: 'never' }],
  ],
};
