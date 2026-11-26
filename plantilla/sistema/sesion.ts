import { expect, type Page } from '@playwright/test';
import { entorno } from '../../soporte/entorno';

const SISTEMA = '{{SISTEMA}}';

/**
 * Inicio de sesión de {{NOMBRE}}, compartido por todos los proyectos y tickets que lo prueban.
 * Usa el usuario y la clave del rol en el .env (ver mapa.md › Acceso). Nunca escribas valores aquí.
 * Claude ajusta estos localizadores a la pantalla real de inicio de sesión la primera vez.
 */
export async function iniciarSesion(page: Page, rol: string): Promise<void> {
  await page.goto(entorno.url(SISTEMA));
  // Solo escribe si está en el formulario de inicio de sesión: ajusta a su título o a un elemento propio.
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  await page.getByLabel('Usuario').fill(entorno.usuario(rol, SISTEMA));
  await page.getByLabel('Contraseña').fill(entorno.clave(rol, SISTEMA));
  await page.getByRole('button', { name: 'Ingresar' }).click();
  // Confirma que entró: ajusta a un elemento que solo aparece con la sesión iniciada.
  await expect(page.getByLabel('Contraseña')).toBeHidden();
}
