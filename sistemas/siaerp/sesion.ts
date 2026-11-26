import { expect, type Page } from '@playwright/test';
import { entorno } from '../../soporte/entorno';

const SISTEMA = 'siaerp';

/**
 * «Inicio de sesión» de SIAERP testing. No pide credenciales: la URL del .env ya identifica al usuario
 * (URL_SIAERP como otro sistema; URL si SIAERP es el sistema principal del ticket). El rol no se usa.
 * SIAERP testing bloquea el navegador oculto: las pruebas que lo abren llevan la etiqueta @visible.
 */
export async function iniciarSesion(page: Page, _rol: string): Promise<void> {
  await page.goto(entorno.url(SISTEMA));
  await expect(page.getByRole('link', { name: 'Inspecciones' })).toBeVisible();
}
