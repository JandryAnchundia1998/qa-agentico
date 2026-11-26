# Mapa del sistema · {{NOMBRE}}

Lo que se sabe de este sistema, para todos los proyectos y tickets que lo prueban. Léelo antes de explorar
con playwright-cli y actualízalo cuando aprendas algo nuevo (avisando al usuario: afecta a otros tickets).
Breve: una línea por dato. Las marcas «(pendiente)» se quitan al completar cada apartado.

**Carpeta:** `sistemas/{{SISTEMA}}` · **Creado:** {{FECHA}} · **Actualizado:** {{FECHA}}

## Acceso
- **Variables del .env:** como sistema principal (SISTEMA={{SISTEMA}}): `URL`, `USUARIO_<ROL>`, `CLAVE_<ROL>`. Como otro sistema (OTROS_SISTEMAS): `URL_{{VARIABLE}}`, `USUARIO_{{VARIABLE}}_<ROL>`, `CLAVE_{{VARIABLE}}_<ROL>`.
- **Inicio de sesión:** (pendiente) pantalla, campos y botón; ver `sesion.ts`.
- **Roles conocidos:** (pendiente)
- **Sesión guardada** (`test.use({ rol })` y `npm run sesion`): (pendiente) funciona / no funciona.
- **Navegador oculto:** (pendiente) funciona / bloqueado (etiqueta `@visible`).

## Menús y rutas
| Pantalla | Cómo se llega | Ruta | Función en `paginas.ts` |
|---|---|---|---|
| (pendiente) | | | |

## Pantallas
<!-- Por pantalla: elementos clave con su nombre accesible, mensajes literales, paginación, modales. -->
(pendiente)

## Particularidades
<!-- Iframes, esperas, elementos sin nombre accesible (y su localizador), formatos, caducidad de sesión, límites del ambiente. -->
(pendiente)

## Datos de referencia por ambiente
<!-- Datos estables útiles para varios tickets (ej.: códigos de broker). Los propios de un ticket van en su qa/pruebas/datos.ts. -->
(pendiente)
