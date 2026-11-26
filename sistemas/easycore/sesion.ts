import { expect, type Page } from '@playwright/test';
import { entorno } from '../../soporte/entorno';

const SISTEMA = 'easycore';

/**
 * Página de inicio de sesión del rol. En EasyCore cada tipo de usuario tiene la suya:
 * brokers en la URL del sistema y Superadmin en URL_SUPERADMIN (ver mapa.md › Acceso).
 */
function urlDelRol(rol: string): string {
  return entorno.opcional(`URL_${rol.toUpperCase()}`) || entorno.url(SISTEMA);
}

/**
 * Inicio de sesión de EasyCore (Oficina Virtual), compartido por todos los proyectos y tickets que lo prueban.
 * Usa USUARIO_<ROL> y CLAVE_<ROL> del .env (USUARIO_EASYCORE_<ROL> si EasyCore no es el sistema principal del ticket).
 */
export async function iniciarSesion(page: Page, rol: string): Promise<void> {
  await page.goto(urlDelRol(rol));
  // Solo escribe si está en el formulario de inicio de sesión (nunca en otra pantalla con campos parecidos).
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('textbox', { name: 'Correo' }).fill(entorno.usuario(rol, SISTEMA));
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(entorno.clave(rol, SISTEMA));
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).not.toHaveURL(/\/auth\//);
}
