import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Acciones reutilizables de las pantallas de EasyCore (Oficina Virtual), para todas las pruebas que lo usan.
 * Solo navegación y localizadores: las aserciones del resultado esperado van en cada prueba.
 *
 * Uso:
 *   import { consulta } from '@sistemas/easycore/paginas';
 *   await consulta.abrir(page);
 *   const modal = await consulta.abrirDetalle(page, datos.caso);
 */

// ── Broker › Consulta de inspecciones (/inspections/list) ────────────────────

const RUTA_CONSULTA = '/inspections/list';

/** La primera carga de la consulta trae la cartera completa y puede tardar hasta ~30 s (mapa.md › Particularidades). */
const CARGA_CONSULTA = 45_000;

/** Abre la consulta por URL (con la sesión ya iniciada) y espera el encabezado. */
async function abrir(page: Page): Promise<void> {
  await page.goto(RUTA_CONSULTA);
  await expect(page.getByRole('heading', { name: 'Solicitudes de inspección' })).toBeVisible({ timeout: CARGA_CONSULTA });
}

/** Abre la consulta desde el menú: «Broker» › «Consulta de inspecciones». */
async function abrirPorMenu(page: Page): Promise<void> {
  const menu = page.getByRole('navigation');
  await menu.getByText('Broker', { exact: true }).first().click();
  await menu.getByText('Consulta de inspecciones', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Solicitudes de inspección' })).toBeVisible({ timeout: CARGA_CONSULTA });
}

/** Campo «Buscar» de la grilla (exacto: Superadmin tiene además «Buscar módulo o menú» en la cabecera). */
const buscador = (page: Page): Locator => page.getByRole('textbox', { name: 'Buscar', exact: true });

/** Texto «Resultados x - y de N» de la grilla. */
const contador = (page: Page): Locator => page.getByText(/Resultados \d+ - \d+ de \d+/);

/** Total N de «Resultados x - y de N». */
async function total(page: Page): Promise<number> {
  await expect(contador(page)).toBeVisible();
  return Number((await contador(page).innerText()).match(/de (\d+)/)![1]);
}

/** Filas de datos de la grilla (10 por página). */
const filas = (page: Page): Locator => page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');

/** Fila del caso (celda «N° caso» exacta). */
const fila = (page: Page, caso: string): Locator =>
  page.getByRole('row').filter({ has: page.getByRole('cell', { name: caso, exact: true }) });

/** Escribe el caso en «Buscar» y devuelve su fila ya visible. */
async function buscarCaso(page: Page, caso: string): Promise<Locator> {
  await buscador(page).fill(caso);
  const f = fila(page, caso);
  await expect(f).toBeVisible();
  return f;
}

/**
 * Ícono «Ver detalle» de una fila. No tiene nombre accesible (solo tooltip): se ubica por su id.
 * Anotado en mapa.md › Particularidades.
 */
const iconoDetalle = (f: Locator): Locator => f.locator('#detail-icon-action');

/** Botón «Ver seguimiento» de una fila. */
const botonSeguimiento = (f: Locator): Locator => f.getByRole('button', { name: 'Ver seguimiento' });

/** Busca el caso, abre «Ver detalle» y devuelve el modal «Detalle de inspección». */
async function abrirDetalle(page: Page, caso: string): Promise<Locator> {
  await iconoDetalle(await buscarCaso(page, caso)).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('heading', { name: 'Detalle de inspección' })).toBeVisible();
  return modal;
}

/** Busca el caso, abre «Ver seguimiento» y devuelve el modal «Seguimiento de inspección». */
async function abrirSeguimiento(page: Page, caso: string): Promise<Locator> {
  await botonSeguimiento(await buscarCaso(page, caso)).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('heading', { name: 'Seguimiento de inspección' })).toBeVisible();
  return modal;
}

/** Cierra el modal abierto (botón «Close»). */
async function cerrarModal(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

export const consulta = {
  ruta: RUTA_CONSULTA,
  abrir,
  abrirPorMenu,
  buscador,
  contador,
  total,
  filas,
  fila,
  buscarCaso,
  iconoDetalle,
  botonSeguimiento,
  abrirDetalle,
  abrirSeguimiento,
  cerrarModal,
};
