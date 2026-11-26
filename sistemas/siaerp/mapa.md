# Mapa del sistema · SIAERP

Lo que se sabe de este sistema, para todos los proyectos y tickets que lo prueban. Léelo antes de explorar
con playwright-cli y actualízalo cuando aprendas algo nuevo (avisando al usuario: afecta a otros tickets).

**Carpeta:** `sistemas/siaerp` · **Creado:** 2026-11-26 · **Actualizado:** 2026-11-26 · **Origen:** PR-368 › Módulo Inspecciones (SIAERP testing)

## Acceso
- **Variables del .env:** como otro sistema (OTROS_SISTEMAS=siaerp): `URL_SIAERP`. Como sistema principal (SISTEMA=siaerp): `URL`.
- **Inicio de sesión:** no hay. La URL de testing ya identifica al usuario (`Menu.aspx?IdUser=<id>`); el rol no se usa. La cabecera muestra el usuario «(<id>) - <nombre>» y la agencia «Matriz»; las gestiones (comentarios) quedan a nombre de ese usuario.
- **Sesión guardada:** no aplica (no hay inicio de sesión).
- **Navegador oculto:** bloqueado: responde «Página Web Bloqueada». Toda prueba que abre SIAERP lleva la etiqueta `@visible`.

## Menús y rutas
| Pantalla | Cómo se llega | Ruta | Función en `paginas.ts` |
|---|---|---|---|
| Solicitudes de Inspección | Menú «Inspecciones» › «Solicitudes de Inspección» | dentro de un iframe | `solicitudes.abrir` |
| Solicitud de un caso | Directo por URL | `insurance/inspeccion/Solicitud.aspx?id=<caso>` | `solicitud.abrirCaso` |

## Pantallas
- **Solicitudes de Inspección** (iframe): encabezado «Solicitudes de Inspección».
  - Filtro de texto «Buscar» con Enter; acepta `broker:(<id>)` o un # Caso.
  - 20 filas por página, ordenadas por «# Caso» descendente; total «(1 - 20 de N)».
  - Columnas: # Caso, Orden Emisión, Ramo, Broker, Identificación, Asegurado, Solicitante, Placa/Camv, Fecha Solicitud, Sucursal, BackOffice, Estado. La primera celda puede ser la casilla de selección.
  - «+ Nueva Solicitud»: formulario con Broker *, Correo Electrónico del APS *, # Órden de Emisión, Ramo *, Línea de Negocio *, Giro de Negocio, tipo (Inspección), Identificación * (con botón de búsqueda que completa datos del asegurado), Genero *, Detalles de Emisión *, Bien; botón «Solicitar Inspección».
- **Solicitud de un caso:** «SEGUIMIENTO / HISTORIAL» con el campo «Ingrese nuevo comentario, observación» y el botón «Agregar» (la gestión queda con acción COMENTARIO). Acciones de una solicitud «Registrado»: «Coordinar Inspección», «Cancelar Solicitud», «Duplicar», «SEGUIMIENTO / HISTORIAL».

## Particularidades
- La lista de solicitudes está dentro de un iframe: usar `page.frameLocator('iframe')` (lo devuelve `solicitudes.abrir`).
- La sesión caduca con un formulario abierto y al enviar responde «Acceso denegado».
- No se pueden editar los Detalles de emisión de una solicitud «Registrado».
- Las secciones Seguimientos y Garantías solo aparecen después de inspeccionar y calificar la solicitud.
- Al buscar la cédula, el formulario no siempre completa «Genero»: fijarlo en la prueba.
- Formatos: nombres y sucursal en mayúsculas; estados sin tilde («Gestion Externa»); fechas dd/mm/aaaa hh:mm.
- El combo Ramo del formulario no tiene «Casco Aereo» (la solicitud 28311 muestra «Accidentes Personales» en el formulario).
- Crear solicitudes, coordinar inspecciones o agregar comentarios escribe datos reales en testing: requiere autorización del usuario y la etiqueta `@escritura`.

## Datos de referencia por ambiente
- **Testing:** broker 1016 = CIFRASEG S.A.; broker 1270 = MULTIAPOYO.
