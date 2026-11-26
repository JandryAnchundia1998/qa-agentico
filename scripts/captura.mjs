// Captura manual con playwright-cli en un solo paso: resalta el elemento, captura la ventana visible,
// quita el resaltado y comprueba el archivo. Para bugs, casos no automatizables y pruebas exploratorias.
// Uso: npm run captura -- <proyecto>/<ticket> <ref> <nombre> [rojo]
// Ej.: npm run captura -- PR-368/Sprint-05 e15 BUG-01_1 rojo   →  qa/evidencias/BUG-01_1.png
// <ref> es la referencia del elemento en el último snapshot de playwright-cli (e15).
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, resolver, salirConError, playwrightCli, sinTildes } from './comun.mjs';

const [arg, objetivo, nombreArg, colorArg] = process.argv.slice(2);
const { ticket } = resolver(arg);
const nombre = (nombreArg ?? '').replace(/\.png$/i, '');
if (!ticket || !objetivo || !nombre) {
  salirConError('Uso: npm run captura -- <proyecto>/<ticket> <ref> <nombre> [rojo]   (ej.: npm run captura -- PR-368/Sprint-05 e15 TC-RF01-01_1)');
}
if (!/^(TC-[A-Z]+\d+-\d+|BUG-\d+)_\d+$/i.test(nombre)) {
  salirConError(`«${nombre}» no sigue el formato <ID del caso>_<n> (TC-RF01-01_1) o BUG-<NN>_<n> (BUG-01_1).`);
}
const rojo = colorArg && sinTildes(colorArg) === 'rojo';
const color = rojo ? '#FF1744' : '#00C853';

const archivo = path.join(ticket, 'qa', 'evidencias', `${nombre}.png`);
fs.mkdirSync(path.dirname(archivo), { recursive: true });
const relativo = path.relative(RAIZ, archivo).split(path.sep).join('/');

const resaltar = `(el) => { el.scrollIntoView({ block: 'center' }); el.dataset.qaEstilo = el.getAttribute('style') ?? ''; el.style.outline = '4px solid ${color}'; el.style.outlineOffset = '2px'; }`;
const quitar = `(el) => { const previo = el.dataset.qaEstilo; if (previo) el.setAttribute('style', previo); else el.removeAttribute('style'); delete el.dataset.qaEstilo; }`;

const paso = (args, que) => {
  const r = playwrightCli(args);
  if (!r.ok) salirConError(`No se pudo ${que}:\n${r.salida.trim().split('\n').slice(0, 6).join('\n')}`);
};

if (fs.existsSync(archivo)) fs.rmSync(archivo);
paso(['eval', resaltar, objetivo], `resaltar ${objetivo} (¿la referencia es del último snapshot?)`);
try {
  paso(['screenshot', '--filename', relativo], 'tomar la captura');
} finally {
  playwrightCli(['eval', quitar, objetivo]);
}

if (!fs.existsSync(archivo)) salirConError(`La captura no se guardó en ${archivo}`);
const kb = Math.round(fs.statSync(archivo).size / 1024);
console.log(`Captura: ${archivo} (${kb} KB)${kb > 5 * 1024 ? '  AVISO: supera 5 MB (límite de Arpsis)' : ''}`);
