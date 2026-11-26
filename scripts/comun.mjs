import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROYECTOS = path.join(RAIZ, 'proyectos');
export const SISTEMAS = path.join(RAIZ, 'sistemas');

/*
 * Estructura:
 *   sistemas/<sistema>/              mapa.md, sesion.ts y paginas.ts: lo que se sabe de un sistema, para todos los proyectos
 *   proyectos/<proyecto>/            .env compartido por sus tickets (y sesion.ts en proyectos anteriores)
 *   proyectos/<proyecto>/<ticket>/   documentos/, .env (SISTEMA y lo que cambie del proyecto) y qa/
 * Un ticket es un funcional, un sprint o un grupo de historias de usuario de un sistema.
 */

const subcarpetas = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'))
        .map((d) => d.name)
        .sort((a, b) => a.localeCompare(b))
    : [];

/** Carpetas de proyecto, en orden alfabético. */
export const listarProyectos = () => subcarpetas(PROYECTOS);

/** Carpetas que pertenecen a un ticket; si aparecen directamente en el proyecto, es la estructura anterior. */
export const DEL_TICKET = ['documentos', 'qa'];

/** Carpetas de ticket de un proyecto, en orden alfabético. */
export const listarTickets = (dirProyecto) => subcarpetas(dirProyecto).filter((n) => !DEL_TICKET.includes(n));

export const rel = (dir) => path.relative(RAIZ, dir).split(path.sep).join('/');

/** Nombre de carpeta seguro: sin caracteres inválidos en Windows ni que la terminal interprete (# % & ; $ ` ! ^ '). */
export function nombreCarpeta(nombre) {
  return nombre
    .replace(/[<>:"/\\|?*#%&;$`!^'\u0000-\u001F]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.\-_]+|-+$/g, '');
}

/** Fase registrada en qa/estado.md («**Fase:** …») de un ticket. */
export function faseDe(dirTicket) {
  const archivo = path.join(dirTicket, 'qa', 'estado.md');
  if (!fs.existsSync(archivo)) return 'sin qa/estado.md';
  const m = fs.readFileSync(archivo, 'utf8').match(/\*\*Fase:\*\*\s*(.+)/);
  return m ? m[1].trim() : 'sin fase registrada';
}

export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function salirConError(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

// Comparación tolerante: sin tildes, mayúsculas, # ni separadores («PR-368» encuentra «#PR-368-MIGRACIÓN-…»).
const clave = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Busca un nombre entre las opciones: exacto, luego tolerante exacto y luego por inicio único. */
function elegir(nombre, opciones, tipo, ayuda) {
  if (opciones.includes(nombre)) return nombre;
  const k = clave(nombre);
  const iguales = opciones.filter((o) => clave(o) === k);
  if (iguales.length === 1) return iguales[0];
  const empiezan = k ? opciones.filter((o) => clave(o).startsWith(k)) : [];
  if (empiezan.length === 1) return empiezan[0];
  if (empiezan.length > 1) salirConError(`«${nombre}» coincide con varios ${tipo}s: ${empiezan.join(', ')}. Escribe más del nombre.`);
  salirConError(`No existe el ${tipo} «${nombre}». ${ayuda}`);
}

/**
 * Resuelve «<proyecto>» o «<proyecto>/<ticket>» (también con «proyectos/» delante o como ruta absoluta).
 * Acepta el inicio del nombre sin #, tildes ni mayúsculas. Devuelve { proyecto, ticket } con rutas absolutas
 * (ticket es null si solo se indicó el proyecto).
 */
export function resolver(arg) {
  const proyectos = listarProyectos();
  const ayudaProyectos = proyectos.length
    ? `Proyectos: ${proyectos.join(', ')}`
    : 'Aún no hay proyectos. Crea uno con: npm run nuevo -- "<nombre>"';
  if (!arg) salirConError(`Indica el proyecto y el ticket (<proyecto>/<ticket>). ${ayudaProyectos}`);

  let texto = arg.trim();
  if (path.isAbsolute(texto)) texto = path.relative(PROYECTOS, texto);
  const partes = texto.split(/[\\/]+/).filter(Boolean);
  if (partes[0] === 'proyectos') partes.shift();
  if (!partes.length || partes.length > 2 || partes.includes('..')) {
    salirConError(`«${arg}» no es válido. Usa <proyecto> o <proyecto>/<ticket>. ${ayudaProyectos}`);
  }

  const proyecto = path.join(PROYECTOS, elegir(partes[0], proyectos, 'proyecto', ayudaProyectos));
  if (partes.length === 1) return { proyecto, ticket: null };

  const tickets = listarTickets(proyecto);
  const ayudaTickets = tickets.length
    ? `Tickets de ${path.basename(proyecto)}: ${tickets.join(', ')}`
    : `${path.basename(proyecto)} aún no tiene tickets. Crea uno con: npm run ticket -- ${atajo(proyecto)} "<nombre>"`;
  const ticket = path.join(proyecto, elegir(partes[1], tickets, 'ticket', ayudaTickets));
  return { proyecto, ticket };
}

/** Nombre corto para escribir en la terminal sin comillas (sin # ni tildes) que resuelve al mismo proyecto. */
export function atajo(dirProyecto) {
  const nombre = path.basename(dirProyecto);
  const limpio = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_.-]/g, '');
  return limpio || `"${nombre}"`;
}

/**
 * Variables del .env del proyecto combinadas con las del .env del ticket. Un valor del ticket solo
 * reemplaza al del proyecto si no está vacío. `origen[k]` dice de cuál vino cada variable.
 */
export function leerEntorno(parse, dirProyecto, dirTicket) {
  const valores = {};
  const origen = {};
  const cargar = (archivo, etiqueta) => {
    if (!fs.existsSync(archivo)) return false;
    for (const [k, v] of Object.entries(parse(fs.readFileSync(archivo)))) {
      if (v.trim() || !(k in valores)) {
        valores[k] = v.trim();
        origen[k] = etiqueta;
      }
    }
    return true;
  };
  const hayProyecto = cargar(path.join(dirProyecto, '.env'), 'proyecto');
  const hayTicket = dirTicket ? cargar(path.join(dirTicket, '.env'), 'ticket') : false;
  return { valores, origen, hayProyecto, hayTicket };
}

// ── Sistemas ─────────────────────────────────────────────────────────────────

/** Carpetas de sistema (sistemas/<sistema>), en orden alfabético. */
export const listarSistemas = () => subcarpetas(SISTEMAS);

/** Nombre de carpeta de un sistema: minúsculas y sin espacios («Easy Core» → easy-core). */
export const nombreSistema = (nombre) => nombreCarpeta(nombre).toLowerCase();

/** Nombre en mayúsculas para las variables del .env («easy-core» → EASY_CORE). */
export const variableDe = (nombre) => nombre.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

/** true si el mapa del sistema ya se completó (no conserva marcas «pendiente» de la plantilla). */
export function mapaCompleto(dirSistema) {
  const archivo = path.join(dirSistema, 'mapa.md');
  return fs.existsSync(archivo) && !/\(pendiente\)/i.test(fs.readFileSync(archivo, 'utf8'));
}

// ── Playwright ───────────────────────────────────────────────────────────────

/** Playwright Test (suite automatizada). */
export const PLAYWRIGHT = path.join(RAIZ, 'node_modules', '@playwright', 'test', 'cli.js');

/** Ejecuta Playwright Test desde la raíz con la salida a la vista. Devuelve el código de salida. */
export function playwright(args, env = {}) {
  if (!fs.existsSync(PLAYWRIGHT)) salirConError('Faltan las dependencias. Ejecuta: npm install');
  // Sin NO_COLOR: Playwright fija FORCE_COLOR en sus procesos y Node avisaría del conflicto en cada prueba.
  const { NO_COLOR, ...base } = process.env;
  const r = spawnSync(process.execPath, [PLAYWRIGHT, ...args], { cwd: RAIZ, stdio: 'inherit', env: { ...base, ...env } });
  return r.status ?? 1;
}

/** Ejecutable de playwright-cli instalado en node_modules (null si falta). */
export function binPlaywrightCli() {
  const pkgFile = path.join(RAIZ, 'node_modules', '@playwright', 'cli', 'package.json');
  if (!fs.existsSync(pkgFile)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['playwright-cli'];
  return bin ? path.join(path.dirname(pkgFile), bin) : null;
}

/** Ejecuta un comando de playwright-cli desde la raíz sin mostrar su salida. Devuelve { ok, salida }. */
export function playwrightCli(args) {
  const bin = binPlaywrightCli();
  if (!bin) salirConError('playwright-cli no está instalado. Ejecuta: npm install');
  const r = spawnSync(process.execPath, [bin, ...args], { cwd: RAIZ, encoding: 'utf8' });
  const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { ok: r.status === 0 && !/^#+\s*Error|^Error:/m.test(salida), salida };
}

/** Escapa un texto para usarlo como expresión regular en el filtro -g de Playwright. */
export const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** true si el ticket tiene pruebas automatizadas (*.spec.ts). */
export function hayPruebas(dirTicket) {
  const dir = path.join(dirTicket, 'qa', 'pruebas');
  return fs.existsSync(dir) && fs.readdirSync(dir, { recursive: true }).some((f) => String(f).endsWith('.spec.ts'));
}

/** Quita tildes y pasa a minúsculas (para reconocer palabras como «regresión» o «regresion»). */
export const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
