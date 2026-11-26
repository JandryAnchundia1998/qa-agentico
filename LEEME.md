# QA-Proyectos

Espacio de trabajo para que Claude haga el proceso QA completo de un ticket:
análisis de los documentos, diseño de casos, ejecución automatizada con
evidencias y registro en Arpsis. Claude sigue `CLAUDE.md` y se detiene en 4
puntos de control para que revises y apruebes.

## Cómo está pensado
- **Un ticket prueba un sistema.** Un ticket es un funcional, un sprint o un
  grupo de historias de usuario, dentro de un proyecto.
- **Lo que se aprende de un sistema se guarda una vez** en
  `sistemas/<sistema>/` (cómo se entra, menús, pantallas, particularidades) y
  lo reutilizan todos los tickets de todos los proyectos que prueban ese
  sistema. El primer ticket de un sistema nuevo hace el reconocimiento; los
  siguientes ya no.
- **Cada caso se ejecuta una sola vez, como prueba automatizada.** Esa corrida
  da el resultado, la evidencia oficial (la que va a Arpsis) y la prueba de
  regresión. La ejecución manual con playwright-cli queda para reconocer
  pantallas nuevas, confirmar fallos, los casos no automatizables y las
  pruebas exploratorias.

## Requisitos (una vez por computador)
1. **Node.js 22.13 o superior** y **Google Chrome**.
2. **Claude desktop**, pestaña **Code**.
3. **MCP de Arpsis** instalado con tu usuario (guía `GUIA-QA.md` del
   repositorio `arpsis-mcp`). Compruébalo preguntándole a Claude «¿Quién soy en
   ARPSIS?».
4. **Git** y una copia de este repositorio (ver «Compartir con el equipo»).
5. En esta carpeta, desde una terminal:
   ```powershell
   npm install
   ```
   ```powershell
   npm run verificar
   ```
   Debe terminar en «todo listo».

## Uso
1. En Claude desktop → **Code**, selecciona **esta carpeta** (`QA-Proyectos`),
   no una subcarpeta: desde otra carpeta Claude no carga las instrucciones ni
   los permisos.
2. Escribe, por ejemplo: «Nuevo proyecto: PR-368 Oficina Virtual», «Nuevo
   ticket en PR-368: FN0002-3 Registro de pagos, sistema EasyCore» o «Retoma
   PR-368/FN0002-3».
3. Tú:
   - Completas una vez `proyectos/<proyecto>/.env` (URL, usuarios y claves por
     rol, ambiente y desarrollador), que comparten todos sus tickets. **Las
     contraseñas van solo ahí, nunca en el chat.**
   - Colocas el Funcional o las Historias de Usuario del ticket en
     `proyectos/<proyecto>/<ticket>/documentos/`.
   - En `proyectos/<proyecto>/<ticket>/.env` va el `SISTEMA` que prueba (lo
     llena `npm run ticket … sistema=<sistema>`) y lo propio del ticket:
     `OTROS_SISTEMAS` (integraciones), `FUNCIONAL_ARPSIS`, desarrollador o
     ambiente si cambian.
   - Escribes «listo».
4. Claude avanza por fases y se detiene en cada punto de control:

   | Punto de control | Qué revisas | Cómo respondes |
   |---|---|---|
   | 1 · Análisis | Secciones, reglas extraídas y dudas | Respondes las dudas y escribes «continúa» |
   | 2 · Diseño | Casos, trazabilidad y supuestos (`qa/*.md`) | «apruebo diseño» o los cambios que quieras |
   | 3 · Ejecución | Resultados, bugs, evidencias y reporte de la suite | «autorizo el registro» o los cambios |
   | 4 · Arpsis | Cantidades a crear, ambiente, tester y desarrollador | «OK» |

5. Durante la ejecución, Claude inicia sesión con los usuarios del `.env` sin
   ver las contraseñas. Solo si el sistema no lo permite (o pide 2FA o
   captcha) te pedirá que inicies sesión en la ventana de Chrome y respondas
   «listo».

Si la conversación se corta, abre otra en esta carpeta y escribe «Retoma
<proyecto>/<ticket>»: Claude lee el `qa/estado.md` del ticket y continúa
donde quedó.

## Estructura
```
QA-Proyectos/
├─ CLAUDE.md            instrucciones del proceso (las lee Claude)
├─ LEEME.md             esta guía
├─ .claude/settings.json permisos: comandos de prueba sin preguntar, escrituras en Arpsis con confirmación
├─ plantilla/           base de cada sistema, proyecto y ticket nuevo
├─ scripts/ · soporte/  comandos y motor de las pruebas automatizadas
├─ sistemas/<sistema>/  lo que se sabe de cada sistema, para todos los proyectos
│  ├─ mapa.md           acceso, menús y rutas, pantallas, particularidades
│  ├─ sesion.ts         inicio de sesión por rol
│  └─ paginas.ts        navegación y localizadores reutilizables
└─ proyectos/<proyecto>/
   ├─ .env              URL, usuarios y claves, ambiente, desarrollador (compartido por los tickets)
   └─ <ticket>/         un funcional, un sprint o un grupo de historias de usuario
      ├─ documentos/    Funcional o Historias de Usuario (.texto/ lo genera npm run documentos)
      ├─ .env           SISTEMA, OTROS_SISTEMAS, FUNCIONAL_ARPSIS y lo que cambie
      └─ qa/            análisis, diseño, resultados, bugs, evidencias, pruebas y reportes
```

### Variables del `.env`
| Variable | Dónde | Para qué |
|---|---|---|
| `URL`, `USUARIO_<ROL>`, `CLAVE_<ROL>` | Proyecto | Sistema principal de los tickets. |
| `URL_<SISTEMA>`, `USUARIO_<SISTEMA>_<ROL>`, `CLAVE_<SISTEMA>_<ROL>` | Proyecto | Otros sistemas que intervienen (ej.: `URL_SIAERP`). |
| `AMBIENTE`, `DESARROLLADOR` | Proyecto o ticket | Datos para Arpsis. |
| `PARALELO` | Proyecto o ticket | Pruebas a la vez en la suite (1 por defecto = en serie; súbelo solo si el ambiente lo soporta). |
| `SISTEMA`, `OTROS_SISTEMAS`, `FUNCIONAL_ARPSIS` | Ticket | Sistema que prueba, integraciones y funcional en Arpsis. |

## Comandos
`<proyecto>` y `<ticket>` aceptan el inicio del nombre, sin `#`, tildes ni
mayúsculas: `PR-368` encuentra `#PR-368-MIGRACIÓN-OFICINA-VIRTUAL-APS`. Usa
esa forma corta: en PowerShell, un `#` sin comillas es un comentario.

| Comando | Para qué |
|---|---|
| `npm run verificar` | Revisa la instalación y lista proyectos, tickets (con su fase) y sistemas. |
| `npm run verificar -- <proyecto>/<ticket>` | Revisa documentos, sistema y `.env` combinado del ticket (sin claves) y si la URL responde. |
| `npm run nuevo -- "<nombre>"` | Crea un proyecto. |
| `npm run ticket -- <proyecto> "<nombre>" sistema=<sistema>` | Crea un ticket con su sistema. Ej.: `npm run ticket -- PR-368 "Sprint 05" sistema=easycore`. |
| `npm run sistema -- "<nombre>"` | Registra un sistema nuevo (una vez para todos los proyectos). |
| `npm run documentos -- <proyecto>/<ticket>` | Pasa los PDF a texto e indica qué páginas mirar como imagen. |
| `npm run sesion -- <proyecto>/<ticket> <ROL>` | Abre playwright-cli con la sesión del rol iniciada. |
| `npm run captura -- <proyecto>/<ticket> <ref> <nombre> [rojo]` | Captura manual resaltada (bugs, exploratorias, no automatizables). |
| `npm run ejecutar -- <proyecto>/<ticket> <ID>` | Ejecuta un caso con ventana y guarda su evidencia oficial. |
| `npm run pruebas -- <proyecto>/<ticket>` | Suite completa (cierre de la ejecución). |
| `npm run pruebas -- <proyecto>/<ticket> regresion` | Suite sin las pruebas que crean datos, con 1 reintento. |
| `npm run pruebas -- <proyecto>/<ticket> fallidas` | Repite solo las que fallaron. |
| `npm run pruebas -- <proyecto>/<ticket> <ID o texto> [visible]` | Solo los casos que coinciden; `visible` muestra el navegador. |
| `npx playwright show-report "proyectos/<proyecto>/<ticket>/qa/reporte"` | Abre el reporte de la suite (`reporte-parcial` para las corridas filtradas). |

### Cómo corre la suite
1. **Fase 1:** las pruebas sin etiqueta, en serie por defecto. Con `PARALELO`
   mayor que 1 corren varias a la vez; en el ambiente de Calidad de PR-368 eso
   fue más lento (27 min frente a 20) y causó intermitencias.
2. **Fase 2, de a una:** las etiquetadas `@escritura` (crean o modifican
   datos), `@serie` (no pueden correr junto a otras) y `@visible` (el sistema
   bloquea el navegador oculto; corren con ventana).
3. Las dos fases se unen en un solo reporte y un resumen por sección:

   | Estado | Significa |
   |---|---|
   | `OK` | Coincide con el resultado esperado. |
   | `FALLA ESPERADA` | Caso Fallido: sigue fallando por su bug (comprobado en su paso `BUG-NN`). Si dice «causa sin verificar», es una prueba anterior sin ese paso: revisar el error que muestra. |
   | `FALLA AJENA AL BUG` | Caso Fallido que falló antes de llegar a su bug (localizador, espera, ambiente): hay que corregir la prueba. |
   | `FALLA` | No coincide con el resultado esperado: revisar si es la prueba o un bug nuevo. |
   | `PASÓ (se esperaba falla)` | El caso tenía un bug y ahora pasa: ¿se corrigió? |
   | `INTERMITENTE` | Falló y pasó en el reintento (solo con `regresion`). |
   | `OMITIDA` | No se ejecutó. |

Cada prueba empieza con la sesión de su rol ya iniciada: se inicia sesión una
vez por rol en cada corrida y la sesión se borra al terminar.

## Dónde queda cada cosa del ticket (`qa/`)
| Qué | Ruta | Va a Arpsis |
|---|---|---|
| Evidencia oficial de cada caso | `evidencias/<ID>_<n>.png` (la genera `ejecutar`) | Sí |
| Evidencia de bugs | `evidencias/BUG-NN_<n>.png` (la genera `captura … rojo`) | Sí |
| Capturas de la regresión | `evidencias/automatizadas/` (se reemplazan en cada corrida) | No |
| Reporte de la suite completa | `reporte/index.html` | No |
| Reporte de corridas filtradas o de un caso | `reporte-parcial/index.html` | No |
| Captura y traza de las pruebas que fallan | `resultados/` | No |
| Pruebas automatizadas | `pruebas/<sección>/<ID>.spec.ts` y `pruebas/datos.ts` | No |

## Compartir con el equipo (Git)
Esta carpeta es un repositorio Git. Comparte **la herramienta**: `CLAUDE.md`,
`LEEME.md`, `scripts/`, `soporte/`, `plantilla/` y `sistemas/` (mapas,
inicios de sesión y páginas de cada sistema). **`proyectos/` no se sube:** cada
QA tiene sus proyectos y tickets en su computador, porque llevan documentos del
cliente, `.env` con contraseñas y evidencias.

**Publicarlo (una vez, quien administre el repositorio):** crea un repositorio
privado vacío en el servidor del equipo y conéctalo:
```powershell
git remote add origin <URL del repositorio>
```
```powershell
git push -u origin main
```

**Cada QA, la primera vez:**
```powershell
git clone <URL del repositorio> QA-Proyectos
```
Luego, dentro de la carpeta: `npm install` y `npm run verificar`.

**Día a día:**
- Antes de empezar: `git pull` (trae mapas de sistemas y mejoras nuevas).
- Si cambiaste algo en `sistemas/` (por ejemplo, el mapa de un sistema nuevo):
  avisa al equipo y súbelo con `git add sistemas`, `git commit -m "<qué cambió>"`
  y `git push`. Lo usan todos los tickets de ese sistema.
- Los cambios a `scripts/`, `soporte/`, `plantilla/` y `CLAUDE.md` los acuerda
  el equipo antes de subirlos.

## Problemas frecuentes
| Problema | Solución |
|---|---|
| Claude pide permiso para cada comando | Los permisos de `.claude/settings.json` solo cargan si abriste esta carpeta. Si aun así pregunta, elige «Permitir siempre». |
| «Google Chrome no disponible» | Instala Chrome o ejecuta `npx playwright install chrome`. |
| «La URL no responde» | Conéctate a la VPN o confirma que el ambiente esté arriba. |
| `npm run sesion` avisa que el sistema no conservó la sesión | Inicia sesión a mano en la ventana; Claude lo anota en el `mapa.md` del sistema. |
| Muchas pruebas fallan a la vez por tiempo de espera | El ambiente no soporta la carga: deja `PARALELO` vacío o en 1 en el `.env`. |
| Arpsis responde `login_required` | En la carpeta del MCP de Arpsis ejecuta `/instalar-arpsis` (o `npm run login`). |
| Claude no encuentra el MCP de Arpsis | Revisa su instalación (requisito 3) y reinicia Claude desktop. |
