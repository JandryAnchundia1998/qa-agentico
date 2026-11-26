# Mapa del sistema · EasyCore (Oficina Virtual)

Lo que se sabe de este sistema, para todos los proyectos y tickets que lo prueban. Léelo antes de explorar
con playwright-cli y actualízalo cuando aprendas algo nuevo (avisando al usuario: afecta a otros tickets).

**Carpeta:** `sistemas/easycore` · **Creado:** 2026-11-26 · **Actualizado:** 2026-11-26 · **Origen:** PR-368 › Módulo Inspecciones (ambiente Calidad)

## Acceso
- **Variables del .env:** como sistema principal (SISTEMA=easycore): `URL`, `USUARIO_<ROL>`, `CLAVE_<ROL>`. Como otro sistema: `URL_EASYCORE`, `USUARIO_EASYCORE_<ROL>`, `CLAVE_EASYCORE_<ROL>`.
- **Página de inicio de sesión por tipo de usuario:** brokers en `URL`; Superadmin en `URL_SUPERADMIN`. `sesion.ts` usa `URL_<ROL>` si existe.
- **Inicio de sesión:** campos «Correo» y «Contraseña», botón «Ingresar». Mientras no entra, la URL contiene `/auth/`.
- **Roles usados (PR-368):** `BROKER_CIFRASEG`, `BROKER_MULTIAPOYO`, `SUPERADMIN`.
- **Sesión guardada** (`test.use({ rol })` y `npm run sesion`): funciona (comprobado el 2026-11-26). Tras iniciar sesión, EasyCore abre `/profile/edit` (Perfil).
- **Navegador oculto:** funciona.

## Menús y rutas
| Pantalla | Cómo se llega | Ruta | Función en `paginas.ts` |
|---|---|---|---|
| Consulta de inspecciones | Menú «Broker» › «Consulta de inspecciones» | `/inspections/list` | `consulta.abrir`, `consulta.abrirPorMenu` |

## Pantallas
- **Consulta de inspecciones:** encabezado «Solicitudes de inspección», subtítulo «Te mostramos un resumen de tu información». Migas: Broker / Consulta de inspecciones.
  - Grilla de 10 filas por página; contador «Resultados x - y de N».
  - Columnas: (acciones), N° caso, Orden emisión, Ramo, Identificación, Asegurado, Solicitante, Estado, Placa/Ramv, Fecha solicitud, Sucursal.
  - «Buscar» (textbox) filtra al escribir. Sin resultados: «¡Ups! No se encontraron resultados.».
  - Botón «Filtrar» abre el panel «Filtrar por:» con grupos Sucursales, Estado, Ramo y Fecha de solicitud.
  - Por fila: ícono «Ver detalle» y botón «Ver seguimiento».
  - Mientras carga: «Un momento / Estamos recogiendo tu información».
- **Modal «Detalle de inspección»** (`consulta.abrirDetalle`): secciones Datos del solicitante, Datos del asegurado, Detalles de emisión, Seguimientos, Garantía, Documentos y Preexistencias. Ramo Vehículos: sin Seguimientos, con «Detalles del objeto a asegurar». Se cierra con «Close».
- **Modal «Seguimiento de inspección»** (`consulta.abrirSeguimiento`): tabla con columnas Fecha, Acción, Descripción, Usuario. Se cierra con «Close».

## Particularidades
- El ícono «Ver detalle» no tiene nombre accesible (solo tooltip): localizador `#detail-icon-action`, solo en `paginas.ts`.
- La grilla se ordena por fecha de solicitud; con fechas iguales el orden no es estable (no comparar posiciones).
- El buscador distingue «ñ» y tildes («Camañero» ≠ «CAMANERO»).
- Formatos frente a SIAERP: nombres y sucursal en formato título; fecha sin hora en la grilla; historial en aaaa-mm-dd hh:mm; estados con tilde («Gestión Externa»).
- Servicio de la grilla (Calidad): `http://172.16.1.66:9000/ms-virtual-office/inspection` (`/<caso>` para un caso); usa el encabezado `authorization` de la sesión.
- Superadmin tiene en la cabecera otro campo «Buscar módulo o menú»: el buscador de la grilla se ubica con nombre exacto «Buscar».
- Con varias pruebas a la vez el ambiente responde más lento: la página de inicio de sesión y la primera carga de la consulta pueden pasar de 10 s. En Calidad, 3 a la vez tardó más que en serie (27 frente a 22 min) y dio intermitencias: dejar `PARALELO` en 1.
- A veces la red corta la búsqueda (`net::ERR_CONNECTION_RESET`) y la pantalla queda 20–30 s en «Un momento» antes de responder.

## Datos de referencia por ambiente
- **Calidad:** el Broker CIFRASEG es el broker 1016 de SIAERP; el Broker MULTIAPOYO, el 1270.
