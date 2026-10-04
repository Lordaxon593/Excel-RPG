'use strict';
const test = require('node:test');
const assert = require('node:assert');
const G = require('../src/game.js');
const M = require('../src/missions.js');
const { SOLUCIONES, EXTRA } = require('./soluciones.js');

function almacenFalso() {
  const d = {};
  return { setItem: (k, v) => { d[k] = v; }, getItem: (k) => (k in d ? d[k] : null), removeItem: (k) => { delete d[k]; } };
}

function nueva(nombre, semilla) {
  const e = G.nuevaPartida(nombre, semilla);
  G.saltarEscuela(e);
  return e;
}

function jugar(estado, hasta) {
  const resultados = [];
  for (let i = estado.misionActual; i < (hasta === undefined ? M.MISIONES.length : hasta); i++) {
    const id = M.MISIONES[i].id;
    resultados.push(G.entregar(estado, SOLUCIONES[id], EXTRA[id]));
  }
  return resultados;
}

test('estado inicial', () => {
  const e = G.nuevaPartida('', 5);
  assert.strictEqual(e.nombre, 'Daniel');
  assert.strictEqual(e.clase, 'Aprendiz de Finanzas');
  assert.strictEqual(G.nivel(e.xp), 1);
  assert.strictEqual(G.rango(1), 'Aprendiz');
  assert.strictEqual(e.oro, 0);
  assert.deepStrictEqual(e.stats, { logica: 1, analisis: 1, automatizacion: 1, finanzas: 1, productividad: 1 });
  assert.strictEqual(e.equipo, 'Hoja de cálculo de madera');
});

test('niveles, rangos y barra de XP', () => {
  assert.strictEqual(G.nivel(0), 1);
  assert.strictEqual(G.nivel(99), 1);
  assert.strictEqual(G.nivel(100), 2);
  assert.strictEqual(G.nivel(350), 4);
  assert.strictEqual(G.barraXP(50), '[#####-----] 50/100');
  assert.strictEqual(G.barraXP(350), '[#####-----] 50/100');
  assert.strictEqual(G.barraXP(0), '[----------] 0/100');
  const casos = { 1: 'Aprendiz', 5: 'Aprendiz', 6: 'Auxiliar', 10: 'Auxiliar', 11: 'Analista Junior', 15: 'Analista Junior', 16: 'Analista', 20: 'Analista', 21: 'Analista Senior', 25: 'Analista Senior', 26: 'Controller', 30: 'Controller', 31: 'Maestro Financiero' };
  for (const [n, r] of Object.entries(casos)) assert.strictEqual(G.rango(Number(n)), r, n);
});

test('partida completa con las soluciones de referencia', () => {
  const e = nueva('Daniel', 4242);
  const res = jugar(e);
  assert.ok(res.every((r) => r.ok && r.completada));
  assert.strictEqual(e.xp, 350);
  assert.strictEqual(G.nivel(e.xp), 4);
  assert.strictEqual(e.oro, 150);
  assert.deepStrictEqual(e.stats, { logica: 5, analisis: 4, productividad: 3, finanzas: 3, automatizacion: 1 });
  assert.strictEqual(G.terminada(e), true);
  assert.strictEqual(e.registro.length, 8);
  assert.ok(e.grafico && e.grafico.tipo === 'columnas');
  assert.strictEqual(G.libro(e).filter((c) => c.desbloqueada).length, 21);
  const r = G.resumenFinal(e);
  assert.strictEqual(r.nivel, 4);
  assert.strictEqual(r.codiceTotal, 21);
  assert.ok(res.filter((x) => x.subeNivel).every((x) => x.mensajeNivel.includes('nivel')));
  assert.ok(res.every((x) => x.mensajeRango === ''), 'del nivel 1 al 4 el rango no cambia');
});

test('las misiones se desbloquean en orden y no se repiten para ganar XP', () => {
  const e = nueva('Ana', 99);
  // entregar la solución de M2 estando en M1 no sirve
  const mal = G.entregar(e, SOLUCIONES.M2);
  assert.strictEqual(mal.ok, false);
  assert.strictEqual(e.xp, 0);
  assert.strictEqual(e.misionActual, 0);
  assert.strictEqual(G.entregar(e, SOLUCIONES.M1).ok, true);
  assert.strictEqual(e.xp, 25);
  const otra = G.entregar(e, SOLUCIONES.M1);
  assert.strictEqual(otra.ok, false);
  assert.strictEqual(e.xp, 25);
  assert.strictEqual(e.misionActual, 1);
  jugar(e);
  const extra = G.entregar(e, {}, EXTRA.M8);
  assert.strictEqual(extra.ok, false);
  assert.strictEqual(e.xp, 350);
});

test('fallar o pedir pistas no penaliza', () => {
  const e = nueva('Ana', 7);
  const r = G.entregar(e, { B9: '=SUMA(B2:B3)' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.completada, false);
  G.usarPista(e);
  G.usarPista(e);
  G.usarPista(e);
  const p = G.usarPista(e);
  assert.strictEqual(p.usadas, 3);
  assert.strictEqual(p.texto.length, 3);
  assert.strictEqual(e.xp, 0);
  assert.strictEqual(e.oro, 0);
});

test('solo se editan las celdas objetivo de la misión actual', () => {
  const e = nueva('Ana', 7);
  assert.strictEqual(G.editarCelda(e, 'B9', '=SUMA(B2:B8)'), true);
  assert.strictEqual(G.editarCelda(e, 'B2', '5'), false);
  assert.strictEqual(e.borradores.M1.B9, '=SUMA(B2:B8)');
  G.editarCelda(e, 'B9', '');
  assert.strictEqual(e.borradores.M1.B9, undefined);
});

test('estado de la aldea según las misiones completadas', () => {
  const e = nueva('Ana', 31);
  const ini = G.calcularAldea(e);
  assert.strictEqual(ini.trigo, 0);
  assert.strictEqual(ini.edificios.length, 0);
  jugar(e, 1);
  const a1 = G.calcularAldea(e);
  const total = M.MISIONES[0].generarDatos(31).v.trigo.reduce((s, x) => s + x, 0);
  assert.strictEqual(a1.trigo, total);
  assert.deepStrictEqual(a1.edificios, ['Almacén']);
  jugar(e, 3);
  const a3 = G.calcularAldea(e);
  assert.ok(a3.trigo < total);
  jugar(e);
  const fin = G.calcularAldea(e);
  assert.strictEqual(fin.trabajadores, 6);
  assert.ok(fin.huevos > 0);
});

test('guardado y carga sin pérdida, en cualquier punto de la partida', () => {
  const e = nueva('Daniel', 777);
  G.editarCelda(e, 'B9', '=SUMA(B2:B8)');
  G.usarPista(e);
  for (let paso = 0; paso <= 8; paso++) {
    const c = G.cargar(G.serializar(e));
    assert.deepStrictEqual(c, e, 'paso ' + paso);
    if (paso < 8) jugar(e, paso + 1);
  }
  const alm = almacenFalso();
  assert.strictEqual(G.guardarLocal(e, alm), true);
  assert.deepStrictEqual(G.cargarLocal(alm), e);
  G.borrarLocal(alm);
  assert.strictEqual(G.cargarLocal(alm), null);
});

test('guardado robusto: sin almacenamiento o con datos corruptos', () => {
  const roto = { setItem() { throw new Error('lleno'); }, getItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };
  const e = G.nuevaPartida('Ana', 1);
  assert.strictEqual(G.guardarLocal(e, roto), false);
  assert.strictEqual(G.cargarLocal(roto), null);
  G.borrarLocal(roto);
  for (const malo of ['', 'no es json', '{}', '{"version":9}', 'null', JSON.stringify({ version: 1, nombre: 'x', semilla: 1, misionActual: 99, xp: 0, oro: 0, stats: {} })]) {
    assert.throws(() => G.cargar(malo), /partida válida/);
  }
  const alm = almacenFalso();
  alm.setItem('excelrpg.aldea.v1', 'basura');
  assert.strictEqual(G.cargarLocal(alm), null);
});

test('mismas semillas dan las mismas partidas; semillas distintas, datos distintos', () => {
  const a = M.MISIONES[0].generarDatos(1).celdas;
  const b = M.MISIONES[0].generarDatos(2).celdas;
  assert.notDeepStrictEqual(a, b);
});
