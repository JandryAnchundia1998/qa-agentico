import fs from 'node:fs';
import { test } from '@playwright/test';
import { entorno, navegador } from './entorno';
import { SIN_SESION, inicioDeSesion } from './sesiones';

/**
 * Lo usa `npm run sesion`: inicia sesión con un rol (usuario y clave del .env, como las pruebas)
 * y guarda la sesión y la URL final para cargarlas en el navegador de playwright-cli.
 * No pertenece a ninguna suite de ticket.
 */
test('guardar sesión para playwright-cli', async ({ browser }) => {
  const rol = process.env.QA_ROL!;
  const sistema = process.env.QA_SISTEMA || undefined;
  const contexto = await browser.newContext({ ...navegador, baseURL: entorno.url(sistema), storageState: SIN_SESION });
  try {
    const page = await contexto.newPage();
    await inicioDeSesion(sistema)(page, rol);
    await page.waitForLoadState();
    await contexto.storageState({ path: process.env.QA_DESTINO! });
    fs.writeFileSync(`${process.env.QA_DESTINO}.url`, page.url());
  } finally {
    await contexto.close();
  }
});
