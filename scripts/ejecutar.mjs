// Fase 3: ejecuta un caso con el navegador visible y guarda su evidencia oficial (la que va a Arpsis).
// Uso: npm run ejecutar -- <proyecto>/<ticket> <ID o texto del caso>
// Ej.: npm run ejecutar -- PR-368/Sprint-05 TC-RF01-01
// - Corre la prueba qa/pruebas/<sección>/<ID>.spec.ts del caso, de a una y con ventana.
// - Las capturas de evidencia(...) quedan en qa/evidencias/<ID>_<n>.png y reemplazan las anteriores de ese caso.
// - Al final muestra la ruta absoluta de cada captura, para la línea «Evidencias:» del diseño.
import fs from 'node:fs';
import path from 'node:path';
import { resolver, rel, salirConError, playwright, escaparRegex, hayPruebas } from './comun.mjs';

const [arg, ...resto] = process.argv.slice(2);
const { ticket } = resolver(arg);
const filtro = resto.join(' ').trim();
if (!ticket || !filtro) salirConError('Uso: npm run ejecutar -- <proyecto>/<ticket> <ID del caso>   (ej.: npm run ejecutar -- PR-368/Sprint-05 TC-RF01-01)');
if (!hayPruebas(ticket)) salirConError(`${rel(ticket)}/qa/pruebas/ aún no tiene pruebas (*.spec.ts). Escribe primero la del caso.`);

const evidencias = path.join(ticket, 'qa', 'evidencias');
const inicio = Date.now();
const estado = playwright(['test', '-g', escaparRegex(filtro), '--headed', '--workers=1'], {
  TICKET: ticket,
  QA_EVIDENCIA: 'oficial',
  QA_REPORTE: 'reporte-parcial',
});

const nuevas = fs.existsSync(evidencias)
  ? fs
      .readdirSync(evidencias)
      .filter((f) => f.endsWith('.png') && fs.statSync(path.join(evidencias, f)).mtimeMs >= inicio - 1000)
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  : [];
console.log(nuevas.length ? '\nEvidencias:' : '\nSin evidencias nuevas (la prueba no llegó a evidencia(...)).');
for (const f of nuevas) console.log(`  ${path.join(evidencias, f)}`);
console.log(`Detalle: ${rel(ticket)}/qa/reporte-parcial/index.html`);
process.exit(estado);
