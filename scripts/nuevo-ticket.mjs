// Crea proyectos/<proyecto>/<ticket>/ a partir de plantilla/ticket/.
// Uso: npm run ticket -- <proyecto> "<nombre del ticket>" [sistema=<sistema>]
// Ej.: npm run ticket -- PR-368 "FN0002-3 Registro de pagos" sistema=easycore
// El ticket es un funcional, un sprint o un grupo de historias de usuario de un sistema: tiene sus documentos, su qa/ y sus pruebas.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, SISTEMAS, nombreCarpeta, nombreSistema, listarSistemas, mapaCompleto, resolver, atajo, rel, hoy, salirConError } from './comun.mjs';

const [argProyecto, ...resto] = process.argv.slice(2);
const marcaSistema = resto.find((p) => /^sistema=/i.test(p));
const sistema = marcaSistema ? nombreSistema(marcaSistema.slice('sistema='.length)) : '';
const nombre = resto.filter((p) => p !== marcaSistema).join(' ').trim();
if (!argProyecto || !nombre) {
  salirConError('Uso: npm run ticket -- <proyecto> "<nombre del ticket>" [sistema=<sistema>]   (ej.: npm run ticket -- PR-368 "Sprint 05" sistema=easycore)');
}

if (/[\\/]/.test(argProyecto.replace(/^proyectos[\\/]/, ''))) {
  salirConError('Indica solo el proyecto y, después, el nombre del ticket: npm run ticket -- <proyecto> "<nombre del ticket>"');
}
const { proyecto } = resolver(argProyecto);
const carpeta = nombreCarpeta(nombre);
if (!carpeta) salirConError(`El nombre «${nombre}» no sirve como nombre de carpeta.`);

const destino = path.join(proyecto, carpeta);
if (fs.existsSync(destino)) salirConError(`Ya existe ${rel(destino)}. Elige otro nombre o retoma ese ticket.`);

fs.cpSync(path.join(RAIZ, 'plantilla', 'ticket'), destino, { recursive: true });
const env = path.join(destino, '.env');
fs.renameSync(path.join(destino, '.env.example'), env);
if (sistema) fs.writeFileSync(env, fs.readFileSync(env, 'utf8').replace(/^SISTEMA=.*$/m, `SISTEMA=${sistema}`));

const estado = path.join(destino, 'qa', 'estado.md');
const titulo = `${path.basename(proyecto)} · ${nombre}`;
fs.writeFileSync(
  estado,
  fs.readFileSync(estado, 'utf8').replaceAll('{{NOMBRE}}', titulo).replaceAll('{{FECHA}}', hoy()).replaceAll('{{SISTEMA}}', sistema || 'sin definir'),
);

const disponibles = listarSistemas();
let lineaSistema;
if (!sistema) {
  lineaSistema = `Escribe en su .env el sistema que prueba: SISTEMA=<sistema>${disponibles.length ? ` (sistemas: ${disponibles.join(', ')})` : ''}`;
} else if (!fs.existsSync(path.join(SISTEMAS, sistema))) {
  lineaSistema = `El sistema «${sistema}» es nuevo: créalo con npm run sistema -- "${sistema}"`;
} else {
  lineaSistema = `Sistema ${sistema}: ${mapaCompleto(path.join(SISTEMAS, sistema)) ? 'conocido (ya tiene mapa)' : 'mapa pendiente'}`;
}

const ref = `${atajo(proyecto)}/${carpeta}`;
console.log(`
Ticket creado: ${rel(destino)}
${lineaSistema}

Siguiente paso (lo haces tú):
  1. Coloca los documentos del ticket (funcional o historias de usuario) en ${rel(destino)}/documentos/
  2. Si este ticket usa datos distintos a los del proyecto (desarrollador, ambiente, funcional en Arpsis…),
     escríbelos en su .env: notepad "${env}"
  3. Escribe «listo» en Claude.

Para referirte a este ticket en los comandos: ${ref}
`);
