import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

/** Raíz del espacio de trabajo. */
export const RAIZ = path.resolve(__dirname, '..');

/** Carpeta con lo que se sabe de cada sistema (mapa, inicio de sesión y páginas), compartida por todos los proyectos. */
export const SISTEMAS = path.join(RAIZ, 'sistemas');

/** Ajustes del navegador comunes a las pruebas y a los inicios de sesión guardados. */
export const navegador = {
  viewport: { width: 1366, height: 768 },
  locale: 'es-EC',
  timezoneId: 'America/Guayaquil',
};

/** Carpeta del ticket en ejecución (proyectos/<proyecto>/<ticket>). La fija `npm run pruebas -- <proyecto>/<ticket>`. */
export function carpetaTicket(): string {
  const valor = process.env.TICKET;
  if (!valor) throw new Error('Ejecuta las pruebas con: npm run pruebas -- <proyecto>/<ticket>');
  const dir = path.resolve(RAIZ, valor);
  if (!fs.existsSync(dir)) throw new Error(`No existe la carpeta del ticket: ${dir}`);
  return dir;
}

/** Carpeta del proyecto al que pertenece el ticket en ejecución. */
export const carpetaProyecto = (): string => path.dirname(carpetaTicket());

let valores: Record<string, string> | undefined;

/** .env del proyecto combinado con el .env del ticket: un valor del ticket que no esté vacío reemplaza al del proyecto. */
function leer(): Record<string, string> {
  if (valores) return valores;
  const delProyecto = path.join(carpetaProyecto(), '.env');
  if (!fs.existsSync(delProyecto)) {
    throw new Error(`Falta ${path.relative(RAIZ, delProyecto)}. Revisa con: npm run verificar -- <proyecto>/<ticket>`);
  }
  const combinados: Record<string, string> = {};
  for (const archivo of [delProyecto, path.join(carpetaTicket(), '.env')]) {
    if (!fs.existsSync(archivo)) continue;
    for (const [k, v] of Object.entries(parse(fs.readFileSync(archivo)))) {
      if (v.trim() || !(k in combinados)) combinados[k] = v.trim();
    }
  }
  valores = combinados;
  return valores;
}

/** Valor del .env o vacío si no existe. */
function opcional(clave: string): string {
  return leer()[clave] ?? '';
}

/** Valor obligatorio del .env; si falta, la prueba falla con un mensaje claro. */
function valor(clave: string): string {
  const v = opcional(clave);
  if (!v) throw new Error(`Falta ${clave} en el .env del proyecto o del ticket.`);
  return v;
}

/** Nombre en mayúsculas para las variables: «easycore» → EASYCORE, «broker cifraseg» → BROKER_CIFRASEG. */
const VAR = (texto: string): string => texto.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

/** Sistema principal del ticket (SISTEMA del .env), en minúsculas; vacío si no se definió. */
const sistemaPrincipal = (): string => opcional('SISTEMA').trim().toLowerCase();

/**
 * Variable de un sistema. El sistema principal usa la variable sin prefijo (URL, USUARIO_<ROL>);
 * los demás, con el nombre del sistema (URL_<SISTEMA>, USUARIO_<SISTEMA>_<ROL>).
 * Tickets anteriores sin SISTEMA: si falta la variable con prefijo, se usa la que no lo tiene.
 */
function delSistema(base: string, sistema: string | undefined, sufijo = ''): string {
  const simple = `${base}${sufijo ? `_${sufijo}` : ''}`;
  if (!sistema || sistema.trim().toLowerCase() === sistemaPrincipal()) return valor(simple);
  const conPrefijo = `${base}_${VAR(sistema)}${sufijo ? `_${sufijo}` : ''}`;
  if (opcional(conPrefijo) || sistemaPrincipal()) return valor(conPrefijo);
  return valor(simple);
}

/** Datos del .env (proyecto + ticket). Las claves solo se usan para escribirlas en el inicio de sesión. */
export const entorno = {
  /** Valor obligatorio del .env. */
  valor,
  /** Valor del .env o vacío. */
  opcional,
  /** Sistema principal del ticket (SISTEMA), en minúsculas. */
  sistema: sistemaPrincipal,
  /** URL del sistema: URL para el principal, URL_<SISTEMA> para los demás. */
  url: (sistema?: string) => delSistema('URL', sistema),
  /** USUARIO_<ROL> del principal; USUARIO_<SISTEMA>_<ROL> de los demás. */
  usuario: (rol: string, sistema?: string) => delSistema('USUARIO', sistema, VAR(rol)),
  /** CLAVE_<ROL> del principal; CLAVE_<SISTEMA>_<ROL> de los demás. */
  clave: (rol: string, sistema?: string) => delSistema('CLAVE', sistema, VAR(rol)),
};
