import fs from 'node:fs';
import { carpetaSesiones } from './sesiones';

/** Inicio y fin de cada corrida: borra las sesiones guardadas para que no queden tokens en disco ni sesiones caducadas. */
export default function limpiarSesiones(): void {
  fs.rmSync(carpetaSesiones(), { recursive: true, force: true });
}
