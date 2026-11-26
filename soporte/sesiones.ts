import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from '@playwright/test';
import { RAIZ, SISTEMAS, carpetaProyecto, carpetaTicket, entorno, navegador } from './entorno';

export type IniciarSesion = (page: Page, rol: string) => Promise<void>;

/** Estado de navegador vacío (sin cookies ni almacenamiento local). */
export const SIN_SESION = { cookies: [], origins: [] };

/** Sesiones guardadas del ticket. Son temporales: se borran al empezar y al terminar cada corrida. */
export const carpetaSesiones = (): string => path.join(carpetaTicket(), 'qa', '.sesiones');

/** Nombre del sistema en minúsculas: el indicado o el SISTEMA del ticket. */
const nombreSistema = (sistema?: string): string => (sistema || entorno.sistema()).trim().toLowerCase();

/**
 * Inicio de sesión de un sistema: sistemas/<sistema>/sesion.ts.
 * Tickets sin SISTEMA en el .env: el sesion.ts del proyecto (estructura anterior).
 */
export function inicioDeSesion(sistema?: string): IniciarSesion {
  const nombre = nombreSistema(sistema);
  const archivo = nombre ? path.join(SISTEMAS, nombre, 'sesion.ts') : path.join(carpetaProyecto(), 'sesion.ts');
  if (!fs.existsSync(archivo)) {
    throw new Error(
      nombre
        ? `No existe ${path.relative(RAIZ, archivo)}. Créalo con: npm run sistema -- "${nombre}"`
        : 'El ticket no define SISTEMA en su .env y el proyecto no tiene sesion.ts.',
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const modulo = require(archivo) as { iniciarSesion?: IniciarSesion };
  if (typeof modulo.iniciarSesion !== 'function') throw new Error(`${path.relative(RAIZ, archivo)} no exporta iniciarSesion(page, rol).`);
  return modulo.iniciarSesion;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Archivo con la sesión del rol ya iniciada. La primera prueba de cada rol inicia sesión y la guarda;
 * las demás la reutilizan. Con varios workers, solo uno inicia sesión y el resto espera.
 */
export async function sesionDelRol(browser: Browser, rol: string, sistema?: string): Promise<string> {
  const dir = carpetaSesiones();
  const archivo = path.join(dir, `${nombreSistema(sistema) || 'proyecto'}-${rol.toUpperCase()}.json`);
  if (fs.existsSync(archivo)) return archivo;
  fs.mkdirSync(dir, { recursive: true });

  const candado = `${archivo}.lock`;
  try {
    fs.closeSync(fs.openSync(candado, 'wx'));
  } catch {
    // Otro worker está iniciando sesión con este rol: espera su resultado.
    for (let i = 0; i < 240 && !fs.existsSync(archivo); i++) {
      if (!fs.existsSync(candado)) break;
      await esperar(500);
    }
    if (fs.existsSync(archivo)) return archivo;
    throw new Error(`No se pudo iniciar sesión con el rol ${rol}: revisa el error de la primera prueba de ese rol.`);
  }

  try {
    // Contexto sin sesión: dentro de una prueba, Playwright aplica a browser.newContext() la sesión de la prueba
    // si no se indica otra.
    const contexto = await browser.newContext({ ...navegador, baseURL: entorno.url(sistema), storageState: SIN_SESION });
    try {
      const page = await contexto.newPage();
      await inicioDeSesion(sistema)(page, rol);
      const temporal = `${archivo}.${process.pid}.tmp`;
      await contexto.storageState({ path: temporal });
      fs.renameSync(temporal, archivo);
    } finally {
      await contexto.close();
    }
  } finally {
    fs.rmSync(candado, { force: true });
  }
  return archivo;
}
