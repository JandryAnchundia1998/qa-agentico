import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Acciones reutilizables de las pantallas de {{NOMBRE}}, para todas las pruebas que lo usan.
 * Reglas:
 * - Una sección por pantalla, con el nombre de la pantalla (ver mapa.md › Menús y rutas).
 * - Solo navegación y localizadores: las aserciones del resultado esperado van en cada prueba.
 * - Localizadores getByRole / getByLabel / getByText. Si un elemento no tiene nombre accesible, su
 *   localizador vive solo aquí, con un comentario, y se anota en mapa.md › Particularidades.
 * - Rutas relativas a la URL del sistema (page.goto('ruta')).
 *
 * Uso en una prueba:
 *   import { ejemplo } from '@sistemas/{{SISTEMA}}/paginas';
 *   await ejemplo.abrir(page);
 */

/** Pantalla de ejemplo: reemplázala por la primera pantalla real del sistema. */
async function abrir(page: Page): Promise<void> {
  await page.goto('');
  await expect(page.locator('body')).toBeVisible();
}

/** Fila de una tabla que contiene el texto indicado en una celda exacta. */
function fila(page: Page, texto: string): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: texto, exact: true }) });
}

export const ejemplo = { abrir, fila };
