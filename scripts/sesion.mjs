// Deja la sesión de un rol iniciada en el navegador de playwright-cli sin escribir la contraseña:
// inicia sesión con el usuario y la clave del .env (igual que las pruebas) y la carga en playwright-cli.
// Uso: npm run sesion -- <proyecto>/<ticket> <ROL> [sistema] [visible]
// Ej.: npm run sesion -- PR-368/Sprint-05 ADMIN   ·   npm run sesion -- PR-368/Sprint-05 ADMIN siaerp visible
// Si el navegador de playwright-cli no está abierto, lo abre (visible). Si ya está abierto, conserva sus pestañas.
// Solo funciona si el sistema guarda la sesión en cookies o almacenamiento local (lo indica su mapa.md).
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, resolver, rel, salirConError, playwright, playwrightCli, sinTildes } from './comun.mjs';

const [arg, rol, ...resto] = process.argv.slice(2);
const { ticket } = resolver(arg);
if (!ticket || !rol) salirConError('Uso: npm run sesion -- <proyecto>/<ticket> <ROL> [sistema] [visible]');
const visible = resto.some((p) => sinTildes(p) === 'visible');
const sistema = resto.find((p) => sinTildes(p) !== 'visible') ?? '';

const dir = path.join(ticket, 'qa', '.sesiones');
const destino = path.join(dir, `cli-${rol.toUpperCase()}.json`);
const borrar = () => {
  fs.rmSync(destino, { force: true });
  fs.rmSync(`${destino}.url`, { force: true });
};
fs.mkdirSync(dir, { recursive: true });
borrar();

console.log(`Iniciando sesión con el rol ${rol.toUpperCase()}…`);
const estado = playwright(['test', '--config', path.join(RAIZ, 'soporte', 'sesion.config.ts')], {
  TICKET: ticket,
  QA_ROL: rol,
  QA_SISTEMA: sistema,
  QA_DESTINO: destino,
  QA_VISIBLE: visible ? '1' : '',
});
if (estado !== 0 || !fs.existsSync(destino)) {
  borrar();
  salirConError('No se pudo iniciar sesión. Revisa el usuario y la clave del rol con: npm run verificar -- <proyecto>/<ticket>');
}

try {
  const url = fs.readFileSync(`${destino}.url`, 'utf8').trim();
  const relativo = path.relative(RAIZ, destino).split(path.sep).join('/');
  if (/\(no browsers\)/i.test(playwrightCli(['list']).salida)) {
    const abierto = playwrightCli(['open', 'about:blank', '--headed']);
    if (!abierto.ok) salirConError(`No se pudo abrir el navegador de playwright-cli:\n${abierto.salida.trim()}`);
  }
  const carga = playwrightCli(['state-load', relativo]);
  if (!carga.ok) salirConError(`No se pudo cargar la sesión en playwright-cli:\n${carga.salida.trim()}`);
  playwrightCli(['goto', url]);
  const actual = playwrightCli(['eval', '() => location.href', '--raw']).salida.trim().replace(/^"|"$/g, '');
  if (actual && actual.split(/[?#]/)[0] !== url.split(/[?#]/)[0]) {
    console.log(`AVISO: el sistema no conservó la sesión (quedó en ${actual}). Inicia sesión a mano en la ventana y anótalo en el mapa.md del sistema.`);
  } else {
    console.log(`Sesión de ${rol.toUpperCase()} lista en playwright-cli: ${url}`);
  }
} finally {
  borrar(); // la sesión no queda en disco
}
console.log(`(${rel(ticket)})`);
