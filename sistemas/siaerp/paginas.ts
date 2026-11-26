import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { iniciarSesion } from './sesion';

/**
 * Acciones reutilizables de SIAERP testing, para todas las pruebas que lo usan.
 * Las pruebas que abren SIAERP llevan la etiqueta @visible (bloquea el navegador oculto).
 *
 * Uso (EasyCore como sistema principal y SIAERP en otra pestaña):
 *   import { solicitudes } from '@sistemas/siaerp/paginas';
 *   const siaerp = await page.context().newPage();
 *   const marco = await solicitudes.abrir(siaerp);
 *   await solicitudes.filtrar(marco, 'broker:(1016)');
 */

// ── Inspecciones › Solicitudes de Inspección (dentro de un iframe) ───────────

/** Entra a SIAERP, abre «Inspecciones» › «Solicitudes de Inspección» y devuelve el iframe de la pantalla. */
async function abrir(page: Page): Promise<FrameLocator> {
  await iniciarSesion(page, '');
  await page.getByRole('link', { name: 'Inspecciones' }).click();
  await page.getByText('Solicitudes de Inspección', { exact: true }).click();
  const marco = page.frameLocator('iframe');
  await expect(marco.getByRole('textbox', { name: 'Buscar' })).toBeVisible();
  return marco;
}

/** Escribe el filtro (ej.: «broker:(1016)» o un # Caso) y lo aplica con Enter. */
async function filtrar(marco: FrameLocator, texto: string): Promise<void> {
  const buscar = marco.getByRole('textbox', { name: 'Buscar' });
  await buscar.fill(texto);
  await buscar.press('Enter');
}

/** Texto del total «(1 - 20 de N)». */
const total = (marco: FrameLocator): Locator => marco.getByText(/^\(1 - \d+ de \d+\)$/);

/** Fila del # Caso en la grilla. */
const fila = (marco: FrameLocator, caso: string): Locator =>
  marco.getByRole('row').filter({ has: marco.getByRole('gridcell', { name: caso, exact: true }) });

/** Botón «Nueva Solicitud» (formulario de solicitud de inspección). */
const nuevaSolicitud = (marco: FrameLocator): Locator => marco.getByText('Nueva Solicitud');

export const solicitudes = { abrir, filtrar, total, fila, nuevaSolicitud };

// ── Solicitud de un caso (Solicitud.aspx?id=<caso>) ──────────────────────────

/** Abre directamente la solicitud del caso, fuera del iframe. */
async function abrirCaso(page: Page, caso: string): Promise<void> {
  await iniciarSesion(page, '');
  await page.goto(new URL(`insurance/inspeccion/Solicitud.aspx?id=${caso}`, page.url()).href);
}

/** Abre «SEGUIMIENTO / HISTORIAL» de la solicitud abierta. */
async function abrirHistorial(page: Page): Promise<void> {
  await page.getByText('SEGUIMIENTO / HISTORIAL').click();
  await expect(page.getByPlaceholder('Ingrese nuevo comentario, observación')).toBeVisible();
}

/** Agrega un comentario en «SEGUIMIENTO / HISTORIAL» (escritura: la prueba lleva @escritura). */
async function agregarComentario(page: Page, texto: string): Promise<Locator> {
  await page.getByPlaceholder('Ingrese nuevo comentario, observación').fill(texto);
  await page.getByRole('button', { name: 'Agregar' }).click();
  const nueva = page.getByRole('row').filter({ hasText: texto });
  await expect(nueva).toBeVisible();
  return nueva;
}

export const solicitud = { abrirCaso, abrirHistorial, agregarComentario };
