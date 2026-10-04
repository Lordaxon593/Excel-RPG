'use strict';
/* Soluciones de referencia (solo para pruebas). */

const M2 = {};
for (let r = 2; r <= 6; r++) M2['E' + r] = `=SUMA(B${r}:D${r})`;
M2.E7 = '=SUMA(E2:E6)';

const M5 = {};
for (let r = 2; r <= 7; r++) M5['D' + r] = `=C${r}/B${r}`;
Object.assign(M5, { B9: '=MAX(D2:D7)', B10: '=MIN(D2:D7)', B11: '=CONTAR(B2:B7)' });

const M6 = {};
for (let r = 2; r <= 8; r++) {
  M6['D' + r] = `=B${r}-C${r}`;
  M6['E' + r] = `=SI(D${r}<$G$1;"RACIONAR";"NORMAL")`;
}

const SOLUCIONES = {
  M1: { B9: '=SUMA(B2:B8)' },
  M2,
  M3: { B6: '=B3*B4', B7: '=B2-B6' },
  M4: { B13: '=PROMEDIO(B2:B8)', B14: '=ENTERO(B10/B11)', B15: '=B13-B11' },
  M5,
  M6,
  M7: {}
};

const EXTRA = { M7: { rango: 'A1:B6', tipo: 'columnas', titulo: 'Producción de la aldea' } };

module.exports = { SOLUCIONES, EXTRA };
