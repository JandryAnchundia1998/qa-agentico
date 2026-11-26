// Fase 1: pasa a texto los PDF del ticket y lista las páginas que hay que mirar como imagen.
// Uso: npm run documentos -- <proyecto>/<ticket>
// Crea documentos/.texto/<documento>.md con el texto de cada página. Las páginas marcadas «con imágenes»
// (capturas, mockups, diagramas) o «sin texto» (escaneadas) se revisan además como imagen. Word, Excel e
// imágenes se leen directamente.
import fs from 'node:fs';
import path from 'node:path';
import { resolver, rel, salirConError } from './comun.mjs';

const { ticket } = resolver(process.argv[2]);
if (!ticket) salirConError('Uso: npm run documentos -- <proyecto>/<ticket>');
const [mayor, menor] = process.versions.node.split('.').map(Number);
if (mayor < 22 || (mayor === 22 && menor < 13)) salirConError(`Este comando necesita Node 22.13 o superior (tienes ${process.version}).`);

let pdfjs;
try {
  pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
} catch {
  salirConError('Falta la librería de PDF. Ejecuta: npm install');
}
const { getDocument, OPS } = pdfjs;
const IMAGENES = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat].filter((x) => x !== undefined));

const carpeta = path.join(ticket, 'documentos');
const salida = path.join(carpeta, '.texto');
const archivos = fs.existsSync(carpeta)
  ? fs
      .readdirSync(carpeta, { recursive: true })
      .map(String)
      .filter((f) => !f.split(/[\\/]/).some((p) => p.startsWith('.')) && fs.statSync(path.join(carpeta, f)).isFile())
  : [];
if (!archivos.length) salirConError(`No hay documentos en ${rel(carpeta)}/`);

/** Texto de una página: respeta los saltos de línea del PDF y quita espacios repetidos. */
function textoDe(contenido) {
  return contenido.items
    .map((i) => (i.str ?? '') + (i.hasEOL ? '\n' : ' '))
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const rango = (paginas) => (paginas.length ? paginas.join(', ') : 'ninguna');

fs.mkdirSync(salida, { recursive: true });
console.log(`\nDocumentos de ${rel(ticket)}`);
for (const archivo of archivos) {
  const ruta = path.join(carpeta, archivo);
  if (/credencial|contrase|password|clave|secret|token|\.env/i.test(path.basename(archivo))) {
    console.log(`  OMITIDO ${archivo} (posibles credenciales: no se lee; sus datos van en el .env)`);
    continue;
  }
  if (!/\.pdf$/i.test(archivo)) {
    console.log(`  LEER   ${archivo} (no es PDF: se lee directamente)`);
    continue;
  }
  try {
    const tarea = getDocument({ data: new Uint8Array(fs.readFileSync(ruta)), verbosity: 0, isEvalSupported: false, useSystemFonts: true });
    const doc = await tarea.promise;
    const conImagenes = [];
    const sinTexto = [];
    const partes = [`# ${archivo}\n\nTexto extraído con npm run documentos. Las páginas «con imágenes» o «sin texto» se revisan también como imagen.\n`];
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const texto = textoDe(await pagina.getTextContent());
      const operaciones = await pagina.getOperatorList();
      const imagenes = operaciones.fnArray.some((fn) => IMAGENES.has(fn));
      if (imagenes) conImagenes.push(n);
      if (texto.length < 40) sinTexto.push(n);
      const marcas = [imagenes ? 'con imágenes' : '', texto.length < 40 ? 'sin texto' : ''].filter(Boolean).join(' · ');
      partes.push(`## Página ${n}${marcas ? ` · ${marcas}` : ''}\n\n${texto || '(sin texto)'}\n`);
      pagina.cleanup();
    }
    await tarea.destroy();
    const destino = path.join(salida, `${archivo.replace(/[\\/]/g, '_').replace(/\.pdf$/i, '')}.md`);
    fs.writeFileSync(destino, partes.join('\n'));
    console.log(`  OK     ${archivo}: ${doc.numPages} página(s)`);
    console.log(`         con imágenes: ${rango(conImagenes)} · sin texto: ${rango(sinTexto)}`);
    console.log(`         texto: ${rel(destino)}`);
  } catch (e) {
    console.log(`  ERROR  ${archivo}: ${e.message} (léelo directamente)`);
  }
}
console.log('');
