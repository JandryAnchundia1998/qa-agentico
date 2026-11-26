import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

/**
 * Salida corta de la suite: una línea por caso y un resumen por sección.
 * Los errores se resumen en una línea; el detalle completo queda en el reporte HTML.
 * Opciones: { lineas: false } solo muestra los casos para revisar y el resumen (se usa al unir las fases);
 * { resumen: false } solo muestra las líneas (se usa en cada fase).
 *
 * Casos Fallidos (test.fail): la aserción que demuestra el bug va en `test.step('BUG-NN', …)`.
 * - Falla dentro de ese paso → FALLA ESPERADA (el bug sigue ahí).
 * - Falla antes, por otra causa (localizador, espera, ambiente) → FALLA AJENA AL BUG, y la corrida no pasa.
 * - Sin paso BUG-NN (pruebas anteriores) → FALLA ESPERADA con la causa a la vista para revisarla.
 */
type Estado = 'OK' | 'FALLA ESPERADA' | 'FALLA AJENA AL BUG' | 'FALLA' | 'PASÓ (se esperaba falla)' | 'INTERMITENTE' | 'OMITIDA';

const sinColor = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, '');
const idDe = (t: TestCase) => t.title.trim().split(/\s+/)[0];
const seccionDe = (t: TestCase) => path.basename(path.dirname(t.location.file));
const segundos = (ms: number) => `${Math.round(ms / 1000)} s`;
const ES_BUG = /^BUG-\d+/;

/** Pasos test.step('BUG-NN …') que se ejecutaron, a cualquier profundidad. */
const pasosBug = (pasos: TestStep[]): TestStep[] =>
  pasos.flatMap((p) => [...(ES_BUG.test(p.title) ? [p] : []), ...pasosBug(p.steps)]);

/** true si el archivo de la prueba declara un paso test.step('BUG-NN …'), aunque no se haya llegado a ejecutar. */
const declaraPaso = new Map<string, boolean>();
function declaraPasoBug(t: TestCase): boolean {
  const archivo = t.location.file;
  if (!declaraPaso.has(archivo)) {
    let texto = '';
    try {
      texto = fs.readFileSync(archivo, 'utf8');
    } catch {
      /* archivo no disponible: se trata como prueba anterior */
    }
    declaraPaso.set(archivo, /test\.step\(\s*['"`]BUG-\d+/.test(texto));
  }
  return declaraPaso.get(archivo)!;
}

/** Primera línea del error, sin colores. */
function primeraLinea(r: TestResult): string {
  return (
    sinColor(r.error?.message ?? r.errors[0]?.message ?? 'sin mensaje')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? ''
  );
}

function estadoDe(t: TestCase, r: TestResult): Estado {
  const resultado = t.outcome();
  if (resultado === 'skipped') return 'OMITIDA';
  if (resultado === 'flaky') return 'INTERMITENTE';
  if (resultado === 'expected' && t.expectedStatus === 'failed') {
    if (!declaraPasoBug(t)) return 'FALLA ESPERADA'; // prueba anterior: se muestra la causa para revisarla
    return pasosBug(r.steps).some((p) => p.error) ? 'FALLA ESPERADA' : 'FALLA AJENA AL BUG';
  }
  if (resultado === 'expected') return 'OK';
  return t.expectedStatus === 'failed' && r.status === 'passed' ? 'PASÓ (se esperaba falla)' : 'FALLA';
}

function detalle(t: TestCase, r: TestResult, estado: Estado): string {
  const bug = (t.annotations.find((a) => a.type === 'fail')?.description ?? '').split(' · ')[0] || 'test.fail';
  if (estado === 'FALLA ESPERADA') {
    return declaraPasoBug(t) ? bug : `${bug} · causa sin verificar: ${primeraLinea(r).slice(0, 120)}`;
  }
  if (estado === 'FALLA AJENA AL BUG') return `${bug} · falló antes de su paso: ${primeraLinea(r).slice(0, 120)}`;
  if (estado === 'PASÓ (se esperaba falla)') return `${bug} · ¿se corrigió el bug?`;
  if (estado === 'FALLA') {
    const linea = r.error?.location?.line ? ` (línea ${r.error.location.line})` : '';
    return `${primeraLinea(r).slice(0, 160)}${linea}`;
  }
  if (estado === 'INTERMITENTE') return 'falló y pasó en el reintento';
  return segundos(r.duration);
}

/** Casos que alguien debe mirar: todo lo que no es OK ni una falla esperada ya verificada. */
const paraRevisar = (estado: Estado, texto: string) =>
  estado !== 'OK' && !(estado === 'FALLA ESPERADA' && !texto.includes('sin verificar'));

export default class Resumen implements Reporter {
  private readonly lineas: boolean;
  private readonly resumen: boolean;
  private readonly finales = new Map<string, { t: TestCase; estado: Estado; texto: string }>();

  constructor(opciones: { lineas?: boolean; resumen?: boolean } = {}) {
    this.lineas = opciones.lineas ?? true;
    this.resumen = opciones.resumen ?? true;
  }

  printsToStdio(): boolean {
    return true;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    const total = suite.allTests().length;
    if (this.lineas && total) console.log(`\nCorriendo ${total} prueba(s) · workers: ${config.workers}`);
  }

  onTestEnd(t: TestCase, r: TestResult): void {
    // Con reintentos, solo cuenta el último intento.
    if (t.outcome() === 'unexpected' && r.retry < t.retries) return;
    const estado = estadoDe(t, r);
    const texto = `  ${estado.padEnd(18)} ${idDe(t)} · ${detalle(t, r, estado)}`;
    this.finales.set(t.id, { t, estado, texto });
    if (this.lineas) console.log(texto);
  }

  onEnd(resultado: FullResult): { status: FullResult['status'] } | void {
    const filas = [...this.finales.values()];
    // Una falla ajena al bug no es el resultado esperado: la corrida no pasa.
    const ajenas = filas.some((f) => f.estado === 'FALLA AJENA AL BUG');
    const estadoFinal = ajenas && resultado.status === 'passed' ? 'failed' : resultado.status;
    if (filas.length && this.resumen) this.imprimir(filas, estadoFinal, resultado.duration);
    if (estadoFinal !== resultado.status) return { status: estadoFinal };
  }

  private imprimir(filas: { t: TestCase; estado: Estado; texto: string }[], estado: FullResult['status'], duracion: number): void {
    if (!this.lineas) {
      const revisar = filas.filter((f) => paraRevisar(f.estado, f.texto));
      if (revisar.length) {
        console.log('\nCasos para revisar');
        for (const f of revisar) console.log(f.texto);
      }
    }
    const columnas: Estado[] = ['OK', 'FALLA ESPERADA', 'FALLA AJENA AL BUG', 'FALLA', 'PASÓ (se esperaba falla)', 'INTERMITENTE', 'OMITIDA'];
    const secciones = [...new Set(filas.map((f) => seccionDe(f.t)))].sort();
    const contar = (lista: typeof filas, e: Estado) => lista.filter((f) => f.estado === e).length;
    const usadas = columnas.filter((c) => contar(filas, c) > 0);
    const ancho = Math.max(8, ...secciones.map((s) => s.length));
    const fila = (nombre: string, lista: typeof filas) =>
      `  ${nombre.padEnd(ancho)}  ${String(lista.length).padStart(7)}  ${usadas.map((c) => String(contar(lista, c)).padStart(c.length)).join('  ')}`;
    console.log(`\nResumen (${estado === 'passed' ? 'todo coincide' : 'revisar'} · ${(duracion / 60000).toFixed(1).replace('.', ',')} min)`);
    console.log(`  ${'Sección'.padEnd(ancho)}  ${'Pruebas'.padStart(7)}  ${usadas.join('  ')}`);
    for (const s of secciones) console.log(fila(s, filas.filter((f) => seccionDe(f.t) === s)));
    if (secciones.length > 1) console.log(fila('Total', filas));
  }
}
