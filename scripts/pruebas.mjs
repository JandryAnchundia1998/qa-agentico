// Ejecuta la suite automatizada de un ticket.
// Uso: npm run pruebas -- <proyecto>/<ticket> [regresion | fallidas] [ID o texto del caso] [visible]
//   npm run pruebas -- PR-368/Sprint-05              suite completa (cierre de la Fase 3) → qa/reporte/
//   npm run pruebas -- PR-368/Sprint-05 regresion    sin las pruebas @escritura y con 1 reintento → qa/reporte/
//   npm run pruebas -- PR-368/Sprint-05 fallidas     solo las que fallaron en la corrida anterior → qa/reporte-parcial/
//   npm run pruebas -- PR-368/Sprint-05 TC-RF01-01   solo los casos que coinciden → qa/reporte-parcial/
// Corre en dos fases que se unen en un solo reporte:
//   1. pruebas sin etiqueta, tantas a la vez como PARALELO en el .env (1 por defecto = en serie);
//   2. @serie, @escritura y @visible, de a una, cuando terminó la fase 1 (no se cruzan con las demás).
// Sin guiones a propósito: en PowerShell, npm se queda con opciones como -g o --headed.
// Desde otra terminal también acepta opciones de Playwright: … <proyecto>/<ticket> -g "TC-RF01-01" --headed
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, resolver, listarTickets, atajo, rel, salirConError, playwright, escaparRegex, hayPruebas, sinTildes } from './comun.mjs';

const [arg, ...resto] = process.argv.slice(2);
const { proyecto, ticket } = resolver(arg);
if (!ticket) {
  const tickets = listarTickets(proyecto);
  salirConError(
    `Indica el ticket: npm run pruebas -- ${atajo(proyecto)}/<ticket>. ` +
      (tickets.length ? `Tickets: ${tickets.join(', ')}` : 'Este proyecto aún no tiene tickets.'),
  );
}
if (!hayPruebas(ticket)) salirConError(`${rel(ticket)}/qa/pruebas/ aún no tiene pruebas (*.spec.ts).`);

const directo = resto.some((a) => a.startsWith('-'));
const palabras = directo ? [] : [...resto];
const tomar = (nombre) => {
  const i = palabras.findIndex((p) => sinTildes(p) === nombre);
  if (i >= 0) palabras.splice(i, 1);
  return i >= 0;
};
const regresion = tomar('regresion');
const fallidas = tomar('fallidas');
const visible = tomar('visible');
const filtro = palabras.join(' ').trim();

const opciones = ['--pass-with-no-tests'];
if (directo) opciones.push(...resto);
if (filtro) opciones.push('-g', escaparRegex(filtro));
if (regresion) opciones.push('--grep-invert', '@escritura');
if (fallidas) opciones.push('--last-failed');
if (visible) opciones.push('--headed');

const parcial = Boolean(filtro || fallidas || directo);
const env = { TICKET: ticket, QA_REPORTE: parcial ? 'reporte-parcial' : 'reporte', ...(regresion ? { QA_REINTENTOS: '1' } : {}) };

const blob = path.join(ticket, 'qa', '.blob');
fs.rmSync(blob, { recursive: true, force: true });

console.log('\nFase 1 · pruebas sin etiqueta');
const fase1 = playwright(['test', '--project=general', ...opciones], { ...env, QA_FASE: '1' });
console.log('\nFase 2 · @serie, @escritura y @visible, de a una');
const fase2 = playwright(['test', '--project=serie', '--project=visible', '--workers=1', ...opciones], { ...env, QA_FASE: '2' });

// Une las dos fases en un solo reporte y un solo resumen.
const todo = path.join(blob, 'todo');
fs.mkdirSync(todo, { recursive: true });
for (const f of ['fase-1', 'fase-2']) {
  const dir = path.join(blob, f);
  if (!fs.existsSync(dir)) continue;
  for (const zip of fs.readdirSync(dir).filter((z) => z.endsWith('.zip'))) fs.copyFileSync(path.join(dir, zip), path.join(todo, `${f}-${zip}`));
}
const fusion = fs.readdirSync(todo).length
  ? playwright(['merge-reports', '--config', path.join(RAIZ, 'soporte', 'fusion.config.ts'), todo], env)
  : 0;
fs.rmSync(blob, { recursive: true, force: true });

const reporte = `${rel(ticket)}/qa/${env.QA_REPORTE}`;
console.log(`\nReporte: ${reporte}/index.html  (ábrelo con: npx playwright show-report "${reporte}")`);
process.exit(fase1 || fase2 || fusion ? 1 : 0);
