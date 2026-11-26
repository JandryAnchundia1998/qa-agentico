// Revisa la instalación y, si se indica, un proyecto o un ticket.
// Uso: npm run verificar [-- <proyecto> | <proyecto>/<ticket>]
// Nunca muestra contraseñas: de las CLAVE_* solo informa si están definidas.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RAIZ, PROYECTOS, SISTEMAS, DEL_TICKET, listarProyectos, listarTickets, listarSistemas, mapaCompleto, variableDe,
  faseDe, resolver, leerEntorno, atajo, rel,
} from './comun.mjs';

const fallos = [];
const avisos = [];
const ok = (t) => console.log(`  OK     ${t}`);
const info = (t) => console.log(`  -      ${t}`);
const falta = (t) => (fallos.push(t), console.log(`  FALTA  ${t}`));
const aviso = (t) => (avisos.push(t), console.log(`  AVISO  ${t}`));

// ── Instalación ──────────────────────────────────────────────────────────────
console.log('\nInstalación');
const mayor = Number(process.versions.node.split('.')[0]);
const menor = Number(process.versions.node.split('.')[1]);
if (mayor > 22 || (mayor === 22 && menor >= 13)) ok(`Node ${process.version}`);
else if (mayor >= 20) aviso(`Node ${process.version}: funciona, pero npm run documentos necesita la versión 22.13 o superior`);
else falta(`Node ${process.version}: se necesita la versión 22.13 o superior`);

const paquete = (nombre) => path.join(RAIZ, 'node_modules', ...nombre.split('/'), 'package.json');
const sinInstalar = ['@playwright/test', '@playwright/cli', 'dotenv', 'pdfjs-dist'].filter((d) => !fs.existsSync(paquete(d)));
if (sinInstalar.length) falta(`Dependencias sin instalar (${sinInstalar.join(', ')}): ejecuta npm install`);
else ok('Dependencias instaladas');

if (!sinInstalar.includes('@playwright/cli')) {
  const pkg = JSON.parse(fs.readFileSync(paquete('@playwright/cli'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['playwright-cli'];
  const r = bin ? spawnSync(process.execPath, [path.join(path.dirname(paquete('@playwright/cli')), bin), '--version'], { encoding: 'utf8' }) : null;
  if (r?.status === 0) ok(`playwright-cli ${r.stdout.trim()}`);
  else falta('playwright-cli no responde: ejecuta npm install');
}

if (!sinInstalar.includes('@playwright/test')) {
  try {
    const { chromium } = await import('@playwright/test');
    const navegador = await chromium.launch({ channel: 'chrome' });
    await navegador.close();
    ok('Google Chrome disponible');
  } catch {
    falta('Google Chrome no disponible: instálalo o ejecuta npx playwright install chrome');
  }
}

// ── Utilidades ───────────────────────────────────────────────────────────────
function listarTicketsCon(dirProyecto, mostrar) {
  const tickets = listarTickets(dirProyecto);
  if (!tickets.length) mostrar(`Sin tickets. Crea uno con: npm run ticket -- ${atajo(dirProyecto)} "<nombre>"`);
  for (const t of tickets) mostrar(`${t} · Fase: ${faseDe(path.join(dirProyecto, t))}`);
}

function revisarEstructura(dirProyecto) {
  const antiguas = DEL_TICKET.filter((n) => fs.existsSync(path.join(dirProyecto, n)));
  if (antiguas.length) {
    aviso(`${rel(dirProyecto)} tiene ${antiguas.join('/ y ')}/ fuera de un ticket (estructura anterior): muévelas a un ticket.`);
  }
}

/** Estado de un sistema: si existe su carpeta y si su mapa ya está completo. */
function revisarSistema(nombre, papel) {
  const dir = path.join(SISTEMAS, nombre);
  if (!fs.existsSync(dir)) {
    falta(`${papel} «${nombre}» no existe en sistemas/. Créalo con: npm run sistema -- "${nombre}"`);
    return;
  }
  if (!fs.existsSync(path.join(dir, 'sesion.ts'))) falta(`Falta ${rel(dir)}/sesion.ts`);
  if (mapaCompleto(dir)) ok(`${papel} ${nombre}: conocido (${rel(dir)}/mapa.md)`);
  else info(`${papel} ${nombre}: nuevo, su mapa está pendiente (se completa en el reconocimiento de la Fase 3)`);
}

/** Revisa las variables. modo 'proyecto': solo el .env del proyecto; 'ticket': proyecto + ticket combinados. */
async function revisarEntorno(parse, dirProyecto, dirTicket) {
  const { valores: v, origen, hayProyecto, hayTicket } = leerEntorno(parse, dirProyecto, dirTicket);
  const deTicket = (k) => (origen[k] === 'ticket' ? ' (del ticket)' : '');
  const val = (k) => v[k] ?? '';
  const esTicket = Boolean(dirTicket);

  if (!hayProyecto) falta(`No existe ${rel(dirProyecto)}/.env`);
  if (esTicket && !hayTicket) info(`${rel(dirTicket)}/.env no existe (opcional: usa solo el del proyecto)`);

  const usadas = new Set(['URL', 'AMBIENTE', 'DESARROLLADOR', 'FUNCIONAL_ARPSIS', 'SISTEMA', 'OTROS_SISTEMAS', 'PARALELO']);

  if (esTicket) {
    const sistema = val('SISTEMA').toLowerCase();
    const disponibles = listarSistemas();
    if (sistema) revisarSistema(sistema, 'Sistema');
    else if (fs.existsSync(path.join(dirProyecto, 'sesion.ts'))) {
      aviso(`SISTEMA vacío: el ticket usa ${rel(dirProyecto)}/sesion.ts (estructura anterior). Escribe en su .env SISTEMA=<sistema>${disponibles.length ? ` (${disponibles.join(', ')})` : ''}`);
    } else {
      falta(`SISTEMA vacío: escribe en el .env del ticket el sistema que prueba, ej.: SISTEMA=easycore${disponibles.length ? ` (sistemas: ${disponibles.join(', ')})` : ''}`);
    }
    for (const otro of val('OTROS_SISTEMAS').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
      revisarSistema(otro, 'Otro sistema');
      if (!val(`URL_${variableDe(otro)}`)) falta(`Falta URL_${variableDe(otro)} (URL de ${otro}) en el .env`);
    }
    const paralelo = val('PARALELO');
    info(`PARALELO = ${paralelo || '1 (por defecto, en serie)'}: pruebas a la vez en la suite`);
  }

  let url = val('URL');
  if (!url) falta('URL vacía en .env');
  else {
    try {
      new URL(url);
      ok(`URL = ${url}${deTicket('URL')}`);
    } catch {
      falta(`URL no válida en .env: ${url}`);
      url = '';
    }
  }

  const ambientes = ['Desarrollo', 'Calidad', 'Preproducción', 'Producción'];
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const amb = val('AMBIENTE');
  if (ambientes.some((a) => norm(a) === norm(amb))) ok(`AMBIENTE = ${amb}${deTicket('AMBIENTE')}`);
  else falta(`AMBIENTE debe ser ${ambientes.join(', ')}${amb ? ` (dice «${amb}»)` : ''}`);

  if (val('DESARROLLADOR')) ok(`DESARROLLADOR = ${val('DESARROLLADOR')}${deTicket('DESARROLLADOR')}`);
  else if (esTicket) falta('DESARROLLADOR vacío: escríbelo en el .env del ticket o del proyecto (nombre como aparece en Arpsis)');
  else info('DESARROLLADOR vacío en el proyecto: defínelo aquí o en el .env de cada ticket');

  if (esTicket) {
    if (val('FUNCIONAL_ARPSIS')) ok(`FUNCIONAL_ARPSIS = ${val('FUNCIONAL_ARPSIS')}${deTicket('FUNCIONAL_ARPSIS')}`);
    else info('FUNCIONAL_ARPSIS vacío (opcional, en el .env del ticket)');
  }

  const roles = Object.keys(v).filter((k) => k.startsWith('USUARIO_')).map((k) => k.slice('USUARIO_'.length));
  if (!roles.length) falta('Agrega al menos un usuario en el .env del proyecto: USUARIO_<ROL> y CLAVE_<ROL>');
  for (const rol of roles) {
    usadas.add(`USUARIO_${rol}`).add(`CLAVE_${rol}`);
    const usuario = val(`USUARIO_${rol}`);
    const clave = val(`CLAVE_${rol}`);
    const marca = deTicket(`USUARIO_${rol}`) || deTicket(`CLAVE_${rol}`);
    if (usuario && clave) ok(`Rol ${rol}: usuario ${usuario} · clave definida${marca}`);
    else if (!usuario && !clave) falta(`Rol ${rol}: USUARIO_${rol} y CLAVE_${rol} vacíos`);
    else falta(`Rol ${rol}: ${usuario ? `CLAVE_${rol}` : `USUARIO_${rol}`} vacío`);
  }

  for (const k of Object.keys(v).filter((k) => k.startsWith('URL_'))) {
    usadas.add(k);
    if (val(k)) ok(`${k} = ${val(k)}${deTicket(k)}`);
    else aviso(`${k} vacía`);
  }

  const otras = Object.keys(v).filter((k) => !usadas.has(k));
  if (otras.length) info(`Otras variables (valores ocultos): ${otras.join(', ')}`);

  if (url) {
    try {
      const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
      ok(`La URL responde (HTTP ${r.status})`);
    } catch (e) {
      aviso(`La URL no responde (${e.cause?.code ?? e.name}). ¿Falta la VPN o el ambiente está caído?`);
    }
  }
}

// ── Proyectos, proyecto o ticket ─────────────────────────────────────────────
const arg = process.argv[2];
if (!arg) {
  console.log('\nProyectos');
  const lista = listarProyectos();
  if (!lista.length) info('Ninguno todavía. Crea uno con: npm run nuevo -- "<nombre>"');
  for (const p of lista) {
    info(`${p}   (en comandos: ${atajo(path.join(PROYECTOS, p))})`);
    listarTicketsCon(path.join(PROYECTOS, p), (t) => console.log(`           · ${t}`));
  }
  console.log('\nSistemas');
  const sistemas = listarSistemas();
  if (!sistemas.length) info('Ninguno todavía. Se crean con: npm run sistema -- "<nombre>"');
  for (const s of sistemas) info(`${s} · ${mapaCompleto(path.join(SISTEMAS, s)) ? 'conocido' : 'mapa pendiente'}`);
} else {
  const { parse } = await import('dotenv');
  const { proyecto, ticket } = resolver(arg);

  if (!ticket) {
    console.log(`\nProyecto ${rel(proyecto)}`);
    revisarEstructura(proyecto);
    await revisarEntorno(parse, proyecto, null);
    console.log('\nTickets');
    listarTicketsCon(proyecto, info);
  } else {
    console.log(`\nTicket ${rel(ticket)} · Fase: ${faseDe(ticket)}`);
    revisarEstructura(proyecto);

    const carpetaDocs = path.join(ticket, 'documentos');
    const docs = fs.existsSync(carpetaDocs)
      ? fs
          .readdirSync(carpetaDocs, { recursive: true })
          .map(String)
          .filter((f) => !f.split(/[\\/]/).some((p) => p.startsWith('.')) && fs.statSync(path.join(carpetaDocs, f)).isFile())
      : [];
    if (docs.length) ok(`Documentos (${docs.length}): ${docs.join(' · ')}`);
    else falta(`Documentos: coloca el funcional o las historias de usuario en ${rel(ticket)}/documentos/`);
    if (docs.some((d) => /\.pdf$/i.test(d)) && !fs.existsSync(path.join(carpetaDocs, '.texto'))) {
      info(`PDF sin pasar a texto: npm run documentos -- ${atajo(proyecto)}/${path.basename(ticket)}`);
    }

    console.log('\nVariables (.env del proyecto + .env del ticket)');
    await revisarEntorno(parse, proyecto, ticket);
  }
}

console.log(
  fallos.length
    ? `\nResultado: ${fallos.length} punto(s) por completar.\n`
    : `\nResultado: todo listo${avisos.length ? `, con ${avisos.length} aviso(s)` : ''}.\n`,
);
process.exit(fallos.length ? 1 : 0);
