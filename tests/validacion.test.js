'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');
const M = require('../src/missions.js');
const G = require('../src/game.js');
const { SOLUCIONES } = require('./soluciones.js');

const SEMILLA = 2024;
const clonar = (o) => JSON.parse(JSON.stringify(o));
const [M1, M2, M3, M4, M5, M6, M7] = M.MISIONES;
const val = (m, entrega, semilla) => M.validar(m, entrega, semilla === undefined ? SEMILLA : semilla);
const texto = (r) => r.mensajes.join(' | ');

test('E6a: decimales cuando se pide un entero (caso M4 B14)', () => {
  const r = val(M4, Object.assign(clonar(SOLUCIONES.M4), { B14: '=B10/B11' }));
  assert.strictEqual(r.ok, false);
  assert.match(texto(r), /B14: el resultado tiene decimales/);
  assert.ok(M4.pistas[1].includes('ENTERO'));
});

test('E6b: texto en vez de número y número en vez de texto', () => {
  let r = val(M1, { B9: '="hola"' });
  assert.match(texto(r), /B9: hay texto en la celda y aquí se espera un número/);
  r = val(M1, { B9: '=A2' });
  assert.match(texto(r), /B9: hay texto/);
  const s = clonar(SOLUCIONES.M7);
  s.C2 = '=B2';
  r = val(M7, s);
  assert.match(texto(r), /C2: hay un número en la celda y aquí se espera texto/);
  s.C2 = '=B2>1';
  assert.match(texto(val(M7, s)), /C2: hay un valor lógico/);
});

test('E6c: errores de Excel con su explicación', () => {
  const r = val(M4, Object.assign(clonar(SOLUCIONES.M4), { B14: '=B10/0' }));
  assert.match(texto(r), /B14: la fórmula da el error #DIV\/0!/);
  assert.match(texto(r), /dividiendo entre cero/);
  assert.match(texto(val(M1, { B9: '=SUMA(B2:B8' })), /B9: la fórmula da el error #ERROR!/);
});

test('E6d: dirección del error (mayor o menor), sin revelar el valor', () => {
  const d = M1.generarDatos(SEMILLA);
  const total = d.v.trigo.reduce((a, b) => a + b, 0);
  const mayor = val(M1, { B9: '=SUMA(B2:B8)+1' });
  assert.match(texto(mayor), /B9: el resultado es mayor del esperado/);
  const menor = val(M1, { B9: '=SUMA(B2:B8)-1' });
  assert.match(texto(menor), /B9: el resultado es menor del esperado/);
  assert.ok(!texto(mayor).includes(String(total)) && !texto(menor).includes(String(total)));
});

test('E6e y celdas: siempre se indica la celda; las filas iguales se agrupan', () => {
  const s = clonar(SOLUCIONES.M2);
  s.E3 = '=SUMA(B3:C3)';
  s.E5 = '=SUMA(B5:C5)';
  const r = val(M2, s);
  assert.match(texto(r), /E3, E5: el resultado es menor del esperado/);
  const hard = val(M1, { B9: '=' + M1.generarDatos(SEMILLA).v.trigo.reduce((a, b) => a + b, 0) });
  assert.match(texto(hard), /B9: Tu resultado es correcto ahora, pero no se adapta/);
});

test('la pista 2 de toda misión nombra la función o el operador', () => {
  for (const m of M.MISIONES) {
    assert.ok(m.pista2Contiene.length > 0, m.id);
    for (const clave of m.pista2Contiene) assert.ok(m.pistas[1].includes(clave), `${m.id}: «${clave}»`);
  }
});

/* ---------- E8: M6 y M7 ---------- */
const rellenar = (fila2, col, hasta) => {
  const s = {};
  s[col + 2] = fila2;
  E.rellenarAbajo(fila2, hasta - 2).forEach((raw, i) => { s[col + (3 + i)] = raw; });
  return s;
};

test('M6: se aceptan el rellenado y las fórmulas escritas una a una', () => {
  assert.strictEqual(val(M6, rellenar('=B2-$G$1', 'C', 8)).ok, true);
  const una = {};
  for (let r = 2; r <= 8; r++) una['C' + r] = `=B${r}-G1`; // sin $ pero escritas a mano: siguen apuntando a G1
  assert.strictEqual(val(M6, una).ok, true);
  const mixta = {};
  for (let r = 2; r <= 8; r++) mixta['C' + r] = `=B${r}-$G$1`;
  assert.strictEqual(val(M6, mixta).ok, true);
  const otraForma = {};
  for (let r = 2; r <= 8; r++) otraForma['C' + r] = `=-($G$1-B${r})`;
  assert.strictEqual(val(M6, otraForma).ok, true);
});

test('M6: se rechaza umbral a mano, referencia relativa y coma', () => {
  for (let semilla = 1; semilla <= 20; semilla++) {
    const u = M6.generarDatos(semilla).v.umbral;
    const mano = {};
    for (let r = 2; r <= 8; r++) mano['C' + r] = `=B${r}-${u}`;
    const r1 = val(M6, mano, semilla);
    assert.strictEqual(r1.ok, false, 'a mano, semilla ' + semilla);
    assert.match(texto(r1), /no se adapta|apuntar/);
    assert.match(texto(r1), /pista 2/);
    const rel = val(M6, rellenar('=B2-G1', 'C', 8), semilla);
    assert.strictEqual(rel.ok, false, 'relativa, semilla ' + semilla);
  }
  const lit = {};
  for (let r = 2; r <= 8; r++) lit['C' + r] = `=B${r}-40`;
  assert.strictEqual(val(M6, lit).ok, false);
  const coma = val(M6, Object.assign(clonar(SOLUCIONES.M6), { C2: '=SUMA(B2,$G$1)' }));
  assert.strictEqual(coma.ok, false);
  assert.match(texto(coma), /se separan con ; \(punto y coma\)/);
  assert.strictEqual(val(M6, { C2: '=B2-$G$1' }).ok, false);
});

test('M7: variantes equivalentes que se aceptan', () => {
  const variantes = [
    (r) => `=SI(B${r}<$G$1;"RACIONAR";"NORMAL")`,
    (r) => `=SI($G$1>B${r};"RACIONAR";"NORMAL")`,
    (r) => `=SI(B${r}>=$G$1;"NORMAL";"RACIONAR")`,
    (r) => `=SI(B${r}<$G$1;"racionar";"normal")`,
    (r) => `=SI(B${r}<$G$1;" RACIONAR ";"Normal ")`,
    (r) => `=si(b${r}<$g$1;"RACIONAR";"NORMAL")`
  ];
  for (const f of variantes) {
    const s = {};
    for (let r = 2; r <= 8; r++) s['C' + r] = f(r);
    for (const semilla of [SEMILLA, 1, 7, 99]) assert.strictEqual(val(M7, s, semilla).ok, true, f(2) + ' semilla ' + semilla);
  }
  assert.strictEqual(val(M7, rellenar('=SI(B2<$G$1;"RACIONAR";"NORMAL")', 'C', 8)).ok, true);
  const mixto = {};
  for (let r = 2; r <= 8; r++) mixto['C' + r] = r % 2 ? `=SI(B${r}<$G$1;"RACIONAR";"NORMAL")` : `=SI($G$1>B${r};"RACIONAR";"NORMAL")`;
  assert.strictEqual(val(M7, mixto).ok, true);
});

test('M7: se rechazan umbral a mano, sin $, coma y SI mal usado', () => {
  for (let semilla = 1; semilla <= 20; semilla++) {
    const u = M7.generarDatos(semilla).v.umbral;
    const mano = {};
    for (let r = 2; r <= 8; r++) mano['C' + r] = `=SI(B${r}<${u};"RACIONAR";"NORMAL")`;
    const r1 = val(M7, mano, semilla);
    assert.strictEqual(r1.ok, false, 'a mano ' + semilla);
    assert.match(texto(r1), /no se adapta/);
    const rel = val(M7, rellenar('=SI(B2<G1;"RACIONAR";"NORMAL")', 'C', 8), semilla);
    assert.strictEqual(rel.ok, false, 'relativa ' + semilla);
  }
  const lit40 = {};
  for (let r = 2; r <= 8; r++) lit40['C' + r] = `=SI(B${r}<40;"RACIONAR";"NORMAL")`;
  assert.strictEqual(val(M7, lit40).ok, false);
  const coma = val(M7, rellenar('=SI(B2<$G$1,"RACIONAR","NORMAL")', 'C', 8));
  assert.strictEqual(coma.ok, false);
  assert.match(texto(coma), /punto y coma/);
  const invertida = val(M7, rellenar('=SI(B2<$G$1;"NORMAL";"RACIONAR")', 'C', 8));
  assert.strictEqual(invertida.ok, false);
  const sinSI = {};
  for (let r = 2; r <= 8; r++) sinSI['C' + r] = `="RACIONAR"`;
  assert.strictEqual(val(M7, sinSI).ok, false);
});

test('M7: la comparación de texto no distingue mayúsculas ni espacios, pero no acepta otro texto', () => {
  const s = clonar(SOLUCIONES.M7);
  s.C2 = s.C2.replace('"RACIONAR"', '"Racionar!"').replace('"NORMAL"', '"Racionar!"');
  assert.strictEqual(val(M7, s).ok, false);
});

/* ---------- E7: aviso de rango ---------- */
test('E7: el aviso de rango solo aparece si el rango cambia', () => {
  assert.strictEqual(G.avisoRango(0, 100), '');
  assert.strictEqual(G.avisoRango(100, 200), '');
  assert.strictEqual(G.avisoRango(200, 300), '');
  assert.strictEqual(G.avisoRango(0, 350), '');
  assert.match(G.avisoRango(499, 500), /Auxiliar|nivel|rango/i);
  assert.match(G.avisoRango(400, 500), /Auxiliar/);
  assert.match(G.avisoRango(900, 1000), /Analista Junior/);
  assert.strictEqual(G.avisoRango(1000, 1100), '');
  assert.strictEqual(G.avisoRango(500, 599), '');
});

/* ---------- §6: requisitos ---------- */
test('§6: campos de cada misión y requisitos vacíos', () => {
  const e = G.nuevaPartida('Ana', 1);
  for (const m of M.MISIONES) {
    assert.strictEqual(m.tipo, 'principal');
    assert.strictEqual(m.entorno, 'aldea');
    assert.ok(['abaco', 'compas', 'balanza', 'pincel'].includes(m.familia), m.id);
    assert.ok(typeof m.negocio === 'string' && m.negocio, m.id);
    assert.deepStrictEqual(m.requisitos, [], m.id);
    assert.strictEqual(G.requisitosCumplidos(e, m), true);
    assert.deepStrictEqual(G.requisitosFaltantes(e, m), []);
  }
  assert.strictEqual(M6.familia, 'compas');
  assert.strictEqual(M7.familia, 'balanza');
  assert.strictEqual(M.MISIONES[7].familia, 'pincel');
});

test('§6: los requisitos se evalúan si una misión los declara', () => {
  const e = G.nuevaPartida('Ana', 1);
  const falsa = { requisitos: [{ tipo: 'stat', id: 'logica', valor: 3 }, { tipo: 'mision', id: 'M1' }, { tipo: 'objeto', id: 'abaco', valor: 1 }] };
  assert.strictEqual(G.requisitosCumplidos(e, falsa), false);
  assert.strictEqual(G.requisitosFaltantes(e, falsa).length, 3);
  e.stats.logica = 3;
  e.completadas.M1 = { celdas: {} };
  e.maestria = { abaco: 4 };
  assert.strictEqual(G.requisitosCumplidos(e, falsa), true);
});
