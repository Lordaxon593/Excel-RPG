'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');
const M = require('../src/missions.js');
const { SOLUCIONES, EXTRA } = require('./soluciones.js');

const SEMILLA = 12345;
const clonar = (o) => JSON.parse(JSON.stringify(o));
const fmt = (v) => (typeof v === 'number' ? String(v).replace('.', ',') : `"${v}"`);

const EQUIVOCADAS = {
  M1: { B9: '=SUMA(B2:B7)' },
  M2: { E2: '=SUMA(B2:C2)' },
  M3: { B6: '=B3+B4' },
  M4: { B13: '=PROMEDIO(B2:B7)' },
  M5: { B9: '=MIN(D2:D7)' },
  M6: { C2: '=B2+$G$1' },
  M7: { C2: '=SI(B2>$G$1;"RACIONAR";"NORMAL")' }
};

test('hay 8 misiones con recompensas y pistas correctas', () => {
  assert.strictEqual(M.MISIONES.length, 8);
  assert.strictEqual(M.MISIONES.reduce((s, m) => s + m.xp, 0), 350);
  assert.strictEqual(M.MISIONES.reduce((s, m) => s + m.oro, 0), 150);
  for (const m of M.MISIONES) {
    assert.strictEqual(m.pistas.length, 3, m.id);
    assert.ok(m.queHacer.length > 0, m.id);
    assert.ok(m.consecuencia.texto(m.generarDatos(1)).length > 0, m.id);
  }
  const etiquetas = M.MISIONES.flatMap((m) => m.etiquetas).sort();
  assert.deepStrictEqual(etiquetas, M.CODICE.map((c) => c.id).sort());
});

for (const m of M.MISIONES) {
  test(`${m.id}: la solución de referencia pasa`, () => {
    const r = M.validar(m, SOLUCIONES[m.id], SEMILLA, EXTRA[m.id]);
    assert.strictEqual(r.ok, true, JSON.stringify(r));
    for (const o of m.objetivos) assert.strictEqual(r.porCelda[o.celda], 'ok');
  });

  test(`${m.id}: celda vacía falla`, () => {
    if (m.grafico) return;
    for (const o of m.objetivos) {
      const s = clonar(SOLUCIONES[m.id]);
      delete s[o.celda];
      const r = M.validar(m, s, SEMILLA);
      assert.strictEqual(r.ok, false, o.celda);
      assert.strictEqual(r.porCelda[o.celda], 'noFormula', o.celda);
    }
    assert.strictEqual(M.validar(m, {}, SEMILLA).ok, false);
  });

  test(`${m.id}: un número escrito (sin =) falla`, () => {
    if (m.grafico) return;
    const o = m.objetivos[0];
    const s = clonar(SOLUCIONES[m.id]);
    s[o.celda] = fmt(o.esperado(m.generarDatos(SEMILLA)));
    const r = M.validar(m, s, SEMILLA);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.porCelda[o.celda], 'noFormula');
  });

  test(`${m.id}: número escrito a mano dentro de una fórmula falla con «no se adapta»`, () => {
    if (m.grafico) return;
    const datos = m.generarDatos(SEMILLA);
    for (const o of m.objetivos) {
      const esperado = o.esperado(datos);
      if (typeof esperado !== 'number') continue;
      // si el valor es el mismo con cualquier dato (p. ej. contar 6 trabajadores) no hay nada que adaptar
      if ([1, 2].every((k) => o.esperado(m.generarDatos(SEMILLA + k)) === esperado)) continue;
      const s = clonar(SOLUCIONES[m.id]);
      s[o.celda] = '=' + fmt(esperado);
      const r = M.validar(m, s, SEMILLA);
      assert.strictEqual(r.ok, false, o.celda);
      assert.strictEqual(r.porCelda[o.celda], 'hardcode', o.celda);
      assert.ok(r.mensajes.some((t) => t.includes('no se adapta')), o.celda);
    }
  });

  test(`${m.id}: una fórmula equivocada falla`, () => {
    if (m.grafico) return;
    const s = Object.assign(clonar(SOLUCIONES[m.id]), EQUIVOCADAS[m.id]);
    const r = M.validar(m, s, SEMILLA);
    assert.strictEqual(r.ok, false);
    assert.ok(Object.values(r.porCelda).includes('valor') || Object.values(r.porCelda).includes('hardcode'));
  });

  test(`${m.id}: los mensajes nunca revelan el valor esperado ni la fórmula`, () => {
    if (m.grafico) return;
    const datos = m.generarDatos(SEMILLA);
    const s = Object.assign(clonar(SOLUCIONES[m.id]), EQUIVOCADAS[m.id]);
    const texto = M.validar(m, s, SEMILLA).mensajes.join(' ');
    for (const o of m.objetivos) {
      assert.ok(!texto.includes(SOLUCIONES[m.id][o.celda]), o.celda);
      const e = o.esperado(datos);
      if (typeof e === 'number' && e > 99) assert.ok(!texto.includes(String(e)), o.celda);
    }
  });
}

test('requisitos de función y de referencias', () => {
  const [m1, , , m4] = M.MISIONES;
  const suma = (s) => M.validar(m1, { B9: s }, SEMILLA);
  const total = m1.generarDatos(SEMILLA).v.trigo.reduce((a, b) => a + b, 0);
  assert.strictEqual(suma('=B2+B3+B4+B5+B6+B7+B8').porCelda.B9, 'requisito');
  assert.strictEqual(suma('=SUMA(B2:B8)').porCelda.B9, 'ok');
  assert.strictEqual(suma('=suma(b2:b8)').porCelda.B9, 'ok');
  assert.ok(total > 0);
  const r = M.validar(m4, Object.assign(clonar(SOLUCIONES.M4), { B14: '=B10/B11' }), SEMILLA);
  assert.strictEqual(r.ok, false);
});

test('M8: columnas con A1:B6 pasa; líneas, rango o título malos fallan', () => {
  const m7 = M.MISIONES[7];
  const ok = { rango: 'A1:B6', tipo: 'columnas', titulo: 'Producción semanal' };
  assert.strictEqual(M.validar(m7, {}, SEMILLA, ok).ok, true);
  assert.strictEqual(M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { rango: 'a1:b6' })).ok, true);
  assert.strictEqual(M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { rango: '$A$1:$B$6' })).ok, true);
  const lin = M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { tipo: 'líneas' }));
  assert.strictEqual(lin.ok, false);
  assert.ok(lin.mensajes.join(' ').includes('Las líneas sirven para ver la evolución en el tiempo'));
  assert.strictEqual(M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { rango: 'B2:B6' })).ok, false);
  assert.strictEqual(M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { rango: 'A1:B5' })).ok, false);
  assert.strictEqual(M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { titulo: 'abc' })).ok, false);
  assert.strictEqual(M.validar(m7, {}, SEMILLA, Object.assign({}, ok, { titulo: '' })).ok, false);
  assert.strictEqual(M.validar(m7, {}, SEMILLA, {}).ok, false);
  const d = m7.generarDatos(SEMILLA).v.valores;
  assert.strictEqual(new Set(d).size, 5);
});

test('datos alternativos: la solución de referencia pasa con 20 semillas', () => {
  for (let semilla = 1; semilla <= 20; semilla++) {
    const s = semilla * 7919 + 13;
    for (const m of M.MISIONES) {
      const r = M.validar(m, SOLUCIONES[m.id], s, EXTRA[m.id]);
      assert.strictEqual(r.ok, true, `${m.id} semilla ${s}: ${JSON.stringify(r)}`);
    }
  }
});

test('los datos son deterministas y respetan los rangos', () => {
  for (const m of M.MISIONES) {
    assert.deepStrictEqual(m.generarDatos(7), m.generarDatos(7));
  }
  for (let s = 1; s <= 50; s++) {
    const d1 = M.MISIONES[0].generarDatos(s).v.trigo;
    assert.ok(d1.every((x) => x >= 18 && x <= 42));
    for (const i of [5, 6]) {
      const d6 = M.MISIONES[i].generarDatos(s).v;
      assert.ok(d6.umbral >= 40 && d6.umbral <= 60 && d6.stock.every((x) => x >= 20 && x <= 140));
    }
  }
});
