// Crea sistemas/<sistema>/ a partir de plantilla/sistema/. Uso: npm run sistema -- "<nombre>"
// Ej.: npm run sistema -- "EasyCore"  →  sistemas/easycore/ (mapa.md, sesion.ts y paginas.ts)
// Un sistema se crea una sola vez y lo reutilizan todos los proyectos y tickets que lo prueban.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, SISTEMAS, nombreSistema, variableDe, rel, hoy, salirConError, listarSistemas } from './comun.mjs';

const nombre = process.argv.slice(2).join(' ').trim();
if (!nombre) {
  const lista = listarSistemas();
  salirConError(`Uso: npm run sistema -- "<nombre>"   (ej.: npm run sistema -- "EasyCore")${lista.length ? `\nSistemas: ${lista.join(', ')}` : ''}`);
}
const carpeta = nombreSistema(nombre);
if (!carpeta) salirConError(`El nombre «${nombre}» no sirve como nombre de carpeta.`);
const destino = path.join(SISTEMAS, carpeta);
if (fs.existsSync(destino)) salirConError(`Ya existe ${rel(destino)}: ese sistema ya está registrado.`);

fs.mkdirSync(SISTEMAS, { recursive: true });
fs.cpSync(path.join(RAIZ, 'plantilla', 'sistema'), destino, { recursive: true });
for (const archivo of fs.readdirSync(destino)) {
  const ruta = path.join(destino, archivo);
  const texto = fs.readFileSync(ruta, 'utf8')
    .replaceAll('{{SISTEMA}}', carpeta)
    .replaceAll('{{NOMBRE}}', nombre)
    .replaceAll('{{VARIABLE}}', variableDe(carpeta))
    .replaceAll('{{FECHA}}', hoy());
  fs.writeFileSync(ruta, texto);
}

console.log(`
Sistema creado: ${rel(destino)}

Lo completa Claude en el primer ticket que lo use (reconocimiento de la Fase 3):
  - mapa.md     cómo se entra, menús, pantallas y particularidades
  - sesion.ts   inicio de sesión por rol
  - paginas.ts  acciones reutilizables de sus pantallas

En el .env del ticket: SISTEMA=${carpeta}   (si es otro sistema del ticket: OTROS_SISTEMAS=${carpeta})
`);
