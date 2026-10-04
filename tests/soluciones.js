'use strict';
/* Soluciones de referencia (solo para pruebas). */

const M2 = {};
for (let r = 2; r <= 6; r++) M2['E' + r] = `=SUMA(B${r}:D${r})`;
M2.E7 = '=SUMA(E2:E6)';

const M5 = {};
for (let r = 2; r <= 7; r++) M5['D' + r] = `=C${r}/B${r}`;
Object.assign(M5, { B9: '=MAX(D2:D7)', B10: '=MIN(D2:D7)', B11: '=CONTAR(B2:B7)' });

const M6 = {};
const M7 = {};
for (let r = 2; r <= 8; r++) {
  M6['C' + r] = `=B${r}-$G$1`;
  M7['C' + r] = `=SI(B${r}<$G$1;"RACIONAR";"NORMAL")`;
}

const fila = (letra, desde, hasta, f) => {
  const o = {};
  for (let r = desde; r <= hasta; r++) o[letra + r] = f(r);
  return o;
};

const PRACTICAS = {
  'P-A1': { B9: '=SUMA(B2:B8)' },
  'P-A2': { B11: '=PROMEDIO(B2:B7)', B12: '=ENTERO(B11/B9)' },
  'P-A3': { B9: '=MAX(B2:B7)', B10: '=MIN(B2:B7)', B11: '=CONTAR(B2:B7)' },
  'P-C1': Object.assign(fila('D', 2, 6, (r) => `=B${r}*C${r}`), { D8: '=SUMA(D2:D6)' }),
  'P-C2': fila('C', 2, 7, (r) => `=B${r}+$G$1`),
  'P-B1': fila('C', 2, 7, (r) => `=SI(B${r}>=5;"APROBADO";"SUSPENDIDO")`),
  'P-B2': fila('C', 2, 7, (r) => `=SI(B${r}>$G$1;"GRANDE";"PEQUEÑO")`),
  'P-P1': {},
  'P-P2': {}
};
const EXTRA_PRACTICAS = {
  'P-P1': { rango: 'A1:B6', tipo: 'columnas', titulo: 'Ventas del mercado' },
  'P-P2': { rango: 'A1:B7', tipo: 'líneas', titulo: 'Cosecha mes a mes' }
};

/* Contexto de ejercicio de la Escuela con la solución. */
const ESCUELA = {
  'E1-1': { sel: { c1: 1, c2: 1, r1: 3, r2: 3 } },
  'E1-2': { sel: { c1: 3, c2: 3, r1: 5, r2: 5 } },
  'E2-1': { sel: { c1: 0, c2: 1, r1: 1, r2: 5 } },
  'E2-2': { sel: { c1: 2, c2: 2, r1: 2, r2: 6 } },
  'E3-1': { celdas: { B2: '2,5' } },
  'E3-2': { celdas: { C1: '=A1+B1' } },
  'E4-1': { celdas: { A5: '=SUMA(A1:A4)' } }
};

const SOLUCIONES = {
  M1: { B9: '=SUMA(B2:B8)' },
  M2,
  M3: { B6: '=B3*B4', B7: '=B2-B6' },
  M4: { B13: '=PROMEDIO(B2:B8)', B14: '=ENTERO(B10/B11)', B15: '=B13-B11' },
  M5,
  M6,
  M7,
  M8: {}
};

const EXTRA = { M8: { rango: 'A1:B6', tipo: 'columnas', titulo: 'Producción de la aldea' } };

module.exports = { SOLUCIONES, EXTRA, PRACTICAS, EXTRA_PRACTICAS, ESCUELA };
