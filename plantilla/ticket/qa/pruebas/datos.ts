/**
 * Datos de prueba del ticket: los valores de «Datos de entrada» del diseño que usan varias pruebas
 * (números de caso, identificaciones, textos de búsqueda…). Si cambian en el ambiente, se corrigen aquí.
 * Nunca usuarios ni claves: esos van en el .env y se leen con iniciarSesion / test.use({ rol }).
 *
 * Uso en una prueba (qa/pruebas/<sección>/<ID>.spec.ts):
 *   import { datos } from '../datos';
 *   await consulta.buscarCaso(page, datos.casoConSeguimiento);
 */
export const datos = {
  // casoConSeguimiento: '23748',
} as const;
