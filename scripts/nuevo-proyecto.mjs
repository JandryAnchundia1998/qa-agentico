// Crea proyectos/<nombre>/ a partir de plantilla/proyecto/. Uso: npm run nuevo -- "<nombre del proyecto>"
// El proyecto guarda lo que comparten sus tickets: el .env (URL, usuarios y claves, ambiente y desarrollador).
// El inicio de sesión y las páginas de cada sistema están en sistemas/<sistema>/ y los comparten todos los proyectos.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, PROYECTOS, nombreCarpeta, atajo, rel, salirConError } from './comun.mjs';

const nombre = process.argv.slice(2).join(' ').trim();
if (!nombre) salirConError('Uso: npm run nuevo -- "<nombre del proyecto>"   (ej.: npm run nuevo -- "PR-368 Oficina Virtual")');

const carpeta = nombreCarpeta(nombre);
if (!carpeta) salirConError(`El nombre «${nombre}» no sirve como nombre de carpeta.`);

const destino = path.join(PROYECTOS, carpeta);
if (fs.existsSync(destino)) salirConError(`Ya existe ${rel(destino)}. Elige otro nombre o crea un ticket en ese proyecto.`);

fs.mkdirSync(PROYECTOS, { recursive: true });
fs.cpSync(path.join(RAIZ, 'plantilla', 'proyecto'), destino, { recursive: true });
fs.renameSync(path.join(destino, '.env.example'), path.join(destino, '.env'));

console.log(`
Proyecto creado: ${rel(destino)}

Siguiente paso:
  1. Completa el .env del proyecto (lo comparten todos sus tickets) con el Bloc de notas:
     notepad "${path.join(destino, '.env')}"
     Las contraseñas van solo en ese archivo, nunca en el chat.
  2. Crea el ticket (funcional, sprint o historias de usuario) en el que vas a trabajar, con su sistema:
     npm run ticket -- ${atajo(destino)} "<nombre del ticket>" sistema=<sistema>
`);
