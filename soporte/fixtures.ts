import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { carpetaTicket, entorno, navegador } from './entorno';
import { inicioDeSesion, sesionDelRol } from './sesiones';

export const VERDE = '#00C853'; // resultado correcto
export const ROJO = '#FF1744'; // defecto

type Evidencia = (objetivo: Locator, opciones?: { ok?: boolean }) => Promise<string>;
type OtraSesion = (rol: string, sistema?: string) => Promise<Page>;

type Opciones = {
  /** Rol con el que la prueba empieza ya autenticada: test.use({ rol: 'ADMIN' }). Sin rol, empieza sin sesión. */
  rol: string | undefined;
  /** Sistema del rol y de las rutas relativas; por defecto, el SISTEMA del ticket. */
  sistema: string | undefined;
};

/** true si el sistema indicado no es el principal del ticket. */
const esOtroSistema = (sistema?: string) => Boolean(sistema && sistema.trim().toLowerCase() !== entorno.sistema());

/**
 * Fixtures de todas las pruebas:
 * - `test.use({ rol })`: la prueba empieza con la sesión del rol ya iniciada (un inicio de sesión por rol y corrida).
 * - `evidencia(locator)`: resalta el elemento (verde; rojo con `{ ok: false }`), captura la ventana visible,
 *   quita el resaltado y adjunta la imagen al reporte. Con `npm run ejecutar` la captura es la evidencia oficial
 *   (qa/evidencias/<ID>_<n>.png); en la suite, la de regresión (qa/evidencias/automatizadas/).
 * - `otraSesion(rol, sistema?)`: otra pestaña con otra sesión (otro rol u otro sistema) en la misma prueba.
 */
export const test = base.extend<{ evidencia: Evidencia; otraSesion: OtraSesion } & Opciones>({
  rol: [undefined, { option: true }],
  sistema: [undefined, { option: true }],

  baseURL: async ({ sistema, baseURL }, use) => {
    await use(esOtroSistema(sistema) ? entorno.url(sistema) : baseURL);
  },

  storageState: async ({ rol, sistema, storageState, browser }, use) => {
    await use(rol ? await sesionDelRol(browser, rol, sistema) : storageState);
  },

  otraSesion: async ({ browser }, use) => {
    const contextos: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (rol, sistema) => {
      const contexto = await browser.newContext({
        ...navegador,
        baseURL: entorno.url(sistema),
        storageState: await sesionDelRol(browser, rol, sistema),
      });
      contextos.push(contexto);
      return contexto.newPage();
    });
    for (const contexto of contextos) await contexto.close();
  },

  // eslint-disable-next-line no-empty-pattern
  evidencia: async ({}, use, testInfo) => {
    const id = testInfo.title.trim().split(/\s+/)[0] || 'caso';
    const oficial = process.env.QA_EVIDENCIA === 'oficial';
    const carpeta = path.join(carpetaTicket(), 'qa', 'evidencias', ...(oficial ? [] : ['automatizadas']));
    // Las capturas de una ejecución reemplazan a las anteriores del mismo caso (no se mezclan corridas).
    const propias = new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+\\.png$`);
    if (fs.existsSync(carpeta)) {
      for (const f of fs.readdirSync(carpeta)) if (propias.test(f)) fs.rmSync(path.join(carpeta, f));
    }
    let n = 0;
    await use(async (objetivo, opciones = {}) => {
      const color = opciones.ok === false ? ROJO : VERDE;
      const archivo = path.join(carpeta, `${id}_${++n}.png`);
      fs.mkdirSync(carpeta, { recursive: true });
      await objetivo.evaluate((el, c) => {
        const e = el as HTMLElement;
        e.scrollIntoView({ block: 'center', inline: 'nearest' });
        e.dataset.qaEstilo = e.getAttribute('style') ?? '';
        e.style.outline = `4px solid ${c}`;
        e.style.outlineOffset = '2px';
      }, color);
      try {
        await objetivo.page().screenshot({ path: archivo });
      } finally {
        await objetivo
          .evaluate((el) => {
            const e = el as HTMLElement;
            const previo = e.dataset.qaEstilo;
            if (previo) e.setAttribute('style', previo);
            else e.removeAttribute('style');
            delete e.dataset.qaEstilo;
          })
          .catch(() => undefined);
      }
      await testInfo.attach(path.basename(archivo), { path: archivo, contentType: 'image/png' });
      return archivo;
    });
  },
});

/** Inicio de sesión explícito, para los casos que validan el propio inicio de sesión o los permisos. */
export async function iniciarSesion(page: Page, rol: string, sistema?: string): Promise<void> {
  await inicioDeSesion(sistema)(page, rol);
}

export { expect, entorno };
