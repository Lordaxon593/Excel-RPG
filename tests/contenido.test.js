'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');
const M = require('../src/missions.js');
const Esc = require('../src/escuela.js');
const L = require('../src/libro.js');
const P = require('../src/practicas.js');
const G = require('../src/game.js');
const { SOLUCIONES, EXTRA, PRACTICAS, EXTRA_PRACTICAS, ESCUELA } = require('./soluciones.js');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const palabras = (t) => t.split(/\s+/).filter(Boolean).length;
const nueva = (semilla) => { const e = G.nuevaPartida('Daniel', semilla || 321); G.saltarEscuela(e); return e; };

/* ---------- Escuela ---------- */
test('Escuela: 4 lecciones breves con 1 a 3 ejercicios y sin XP', () => {
  assert.strictEqual(Esc.LECCIONES.length, 4);
  for (const l of Esc.LECCIONES) {
    assert.ok(palabras(l.texto) <= 80, `${l.id}: ${palabras(l.texto)} palabras`);
    assert.ok(l.ejercicios.length >= 1 && l.ejercicios.length <= 3, l.id);
    assert.strictEqual(l.xp, undefined);
  }
  assert.deepStrictEqual(Esc.ejercicios.map((e) => e.id), Object.keys(ESCUELA));
});

test('Escuela: las soluciones pasan y las hojas de ejercicio son coherentes', () => {
  for (const ej of Esc.ejercicios) {
    const r = Esc.evaluarEjercicio(ej, ESCUELA[ej.id]);
    assert.strictEqual(r.ok, true, ej.id + ' ' + r.mensaje);
    const h = Esc.hojaEjercicio(ej);
    assert.ok(h.cols > 0 && h.filas > 0 && Array.isArray(h.editables), ej.id);
  }
});

test('Escuela: respuestas incorrectas se rechazan con mensaje', () => {
  const ev = (id, ctx) => Esc.evaluarEjercicio(Esc.ejercicio(id), ctx);
  assert.strictEqual(ev('E1-1', { sel: { c1: 1, c2: 1, r1: 4, r2: 4 } }).ok, false);
  assert.match(ev('E1-1', { sel: { c1: 1, c2: 1, r1: 4, r2: 4 } }).mensaje, /B4/);
  assert.strictEqual(ev('E1-1', {}).ok, false);
  assert.strictEqual(ev('E2-1', { sel: { c1: 0, c2: 1, r1: 1, r2: 4 } }).ok, false);
  assert.strictEqual(ev('E2-1', { sel: { c1: 1, c2: 1, r1: 1, r2: 1 } }).ok, false);
  assert.strictEqual(ev('E2-2', { sel: { c1: 2, c2: 2, r1: 2, r2: 5 } }).ok, false);
  assert.strictEqual(ev('E3-1', { celdas: {} }).ok, false);
  assert.strictEqual(ev('E3-1', { celdas: { B2: 'dos y medio' } }).ok, false);
  assert.strictEqual(ev('E3-1', { celdas: { B2: '2,6' } }).ok, false);
  assert.strictEqual(ev('E3-1', { celdas: { B2: '2.5' } }).ok, true);
  const d = Esc.ejercicio('E3-2').mini.generarDatos(Esc.SEMILLA);
  assert.strictEqual(ev('E3-2', { celdas: { C1: '=' + (d.v.a + d.v.b) } }).ok, false);
  assert.match(ev('E3-2', { celdas: { C1: '=' + (d.v.a + d.v.b) } }).mensaje, /no se adapta/);
  assert.strictEqual(ev('E3-2', { celdas: { C1: '=A1*B1' } }).ok, false);
  assert.strictEqual(ev('E3-2', { celdas: { C1: '=A1+B1' } }).ok, true);
  assert.strictEqual(ev('E4-1', { celdas: { A5: '=A1+A2+A3+A4' } }).ok, false);
  assert.match(ev('E4-1', { celdas: { A5: '=A1+A2+A3+A4' } }).mensaje, /SUMA/);
  assert.strictEqual(ev('E4-1', { celdas: { A5: '=SUMA(A1:A3)' } }).ok, false);
  assert.strictEqual(ev('E4-1', { celdas: { A5: '=SUMA(A1,A4)' } }).ok, false);
});

test('Escuela: los datos del ejercicio de SUMA son distintos a los de M1', () => {
  const e = Esc.ejercicio('E4-1').mini.generarDatos(Esc.SEMILLA);
  const m1 = M.MISIONES[0].generarDatos(123);
  assert.notDeepStrictEqual(e.celdas, m1.celdas);
  assert.strictEqual(e.v.valores.length, 4);
});

test('Escuela: progresión, desbloqueo de la Aldea y saltarla', () => {
  const e = G.nuevaPartida('Ana', 5);
  assert.strictEqual(G.aldeaDesbloqueada(e), false);
  const bloqueada = G.entregar(e, SOLUCIONES.M1);
  assert.strictEqual(bloqueada.ok, false);
  assert.match(bloqueada.mensajes[0], /Escuela/);
  assert.strictEqual(e.xp, 0);
  let n = 0;
  for (const ej of Esc.ejercicios) {
    assert.strictEqual(G.siguienteEjercicio(e).id, ej.id);
    assert.strictEqual(G.completarEjercicio(e, ej.id, { sel: { c1: 5, c2: 5, r1: 9, r2: 9 }, celdas: {} }).ok, false);
    const r = G.completarEjercicio(e, ej.id, ESCUELA[ej.id]);
    assert.strictEqual(r.ok, true);
    n++;
    assert.strictEqual(r.escuelaCompleta, n === Esc.ejercicios.length);
  }
  assert.strictEqual(G.siguienteEjercicio(e), null);
  assert.strictEqual(G.escuelaProgreso(e).every((l) => l.completa), true);
  assert.strictEqual(G.aldeaDesbloqueada(e), true);
  assert.strictEqual(G.entregar(e, SOLUCIONES.M1).ok, true);
  assert.strictEqual(e.xp, 25, 'las lecciones de la Escuela no dan XP');
  const f = G.nuevaPartida('Bea', 6);
  G.completarEjercicio(f, 'E1-1', ESCUELA['E1-1']);
  assert.strictEqual(G.leccionEscuelaCompleta(f, 'E1'), false);
  assert.strictEqual(G.aldeaDesbloqueada(f), false);
  G.saltarEscuela(f);
  assert.strictEqual(G.aldeaDesbloqueada(f), true);
  assert.strictEqual(G.entregar(f, SOLUCIONES.M1).ok, true);
});

/* ---------- Lecciones por misión y Libro ---------- */
test('lecciones de misión: una por misión, con ejemplo resuelto y texto breve', () => {
  const paginas = { M4: 2, M7: 2 };
  for (const m of M.MISIONES) {
    const lec = m.leccion;
    assert.strictEqual(lec.paginas.length, paginas[m.id] || 1, m.id);
    for (const p of lec.paginas) {
      assert.ok(palabras(p.texto) <= 80, `${m.id}: ${palabras(p.texto)} palabras`);
      assert.ok(L.ficha(p.ficha), `${m.id}: ficha ${p.ficha}`);
      const h = E.Hoja.desde(p.ejemplo.celdas, p.ejemplo.cols, p.ejemplo.filas);
      for (const ref of Object.keys(p.ejemplo.celdas)) assert.ok(!E.esError(h.valor(ref)), `${m.id} ${ref}`);
    }
    for (const r of lec.repasos) assert.ok(L.ficha(r.ficha), `${m.id} repaso`);
  }
  for (const id of ['M3', 'M5', 'M7']) assert.ok(M.MISIONES.find((m) => m.id === id).leccion.repasos.length >= 1, id);
  const ej1 = M.MISIONES[0].leccion.paginas[0].ejemplo.celdas;
  assert.notDeepStrictEqual(ej1, M.MISIONES[0].generarDatos(1).celdas);
});

test('Libro: una ficha por competencia con todos sus campos, y desbloqueo al enseñarlas', () => {
  assert.deepStrictEqual(L.FICHAS.map((f) => f.id).sort(), M.CODICE.map((c) => c.id).sort());
  for (const f of L.FICHAS) {
    for (const k of ['nombre', 'paraQue', 'forma', 'ejemplo', 'errores']) assert.ok(f[k] && f[k].length >= 2, `${f.id}.${k}`);
    assert.ok(f.desbloqueaCon.length > 0);
  }
  const e = G.nuevaPartida('Ana', 1);
  assert.strictEqual(G.libro(e).filter((f) => f.desbloqueada).length, 0);
  G.saltarEscuela(e);
  G.verLeccion(e, 'M1');
  const ids = G.libro(e).filter((f) => f.desbloqueada).map((f) => f.id).sort();
  assert.deepStrictEqual(ids, ['formulas.entrada', 'funcion.suma', 'rangos']);
  G.verLeccion(e, 'M4');
  assert.ok(G.libro(e).find((f) => f.id === 'funcion.entero').desbloqueada);
  const f = G.nuevaPartida('Bea', 2);
  for (const ej of Esc.ejercicios.filter((x) => x.leccion === 'E4' || x.leccion === 'E3' || x.leccion === 'E2' || x.leccion === 'E1')) G.completarEjercicio(f, ej.id, ESCUELA[ej.id]);
  assert.ok(G.libro(f).find((x) => x.id === 'funcion.suma').desbloqueada, 'SUMA se enseña en la Escuela');
  assert.ok(G.libro(f).find((x) => x.id === 'operadores').desbloqueada);
  assert.ok(!G.libro(f).find((x) => x.id === 'funcion.si').desbloqueada);
});

test('Libro: buscador', () => {
  assert.deepStrictEqual(L.buscar('suma', L.FICHAS).map((f) => f.id).includes('funcion.suma'), true);
  assert.ok(L.buscar('absolut', L.FICHAS).some((f) => f.id === 'ref.absoluta'));
  assert.ok(L.buscar('GRAFICO', L.FICHAS).length >= 3);
  assert.strictEqual(L.buscar('', L.FICHAS).length, L.FICHAS.length);
  assert.strictEqual(L.buscar('zzzz', L.FICHAS).length, 0);
});

/* ---------- Equipo y maestría ---------- */
test('equipo: 4 objetos, niveles y umbrales', () => {
  assert.deepStrictEqual(P.OBJETOS.map((o) => [o.id, o.stat]), [['abaco', 'finanzas'], ['compas', 'productividad'], ['balanza', 'logica'], ['pincel', 'analisis']]);
  assert.deepStrictEqual(P.NIVELES, ['madera', 'piedra', 'cobre', 'bronce', 'plata', 'oro']);
  assert.deepStrictEqual(P.UMBRALES.slice(0, 4), [0, 4, 10, 16]);
  const caso = { 0: 0, 3: 0, 4: 1, 9: 1, 10: 2, 15: 2, 16: 3, 24: 3, 100: 3 };
  for (const [pts, niv] of Object.entries(caso)) assert.strictEqual(P.nivelDePuntos(Number(pts)), niv, pts);
  const i0 = P.infoObjeto('abaco', 0);
  assert.strictEqual(i0.nombreNivel, 'madera');
  assert.strictEqual(i0.barra, '[----------] 0/4');
  assert.match(i0.consejo, /Para subir tu Ábaco, completa prácticas de cálculo en el Almacén/);
  assert.strictEqual(P.infoObjeto('abaco', 2).barra, '[#####-----] 2/4');
  const top = P.infoObjeto('balanza', 20);
  assert.strictEqual(top.nombreNivel, 'bronce');
  assert.match(top.proximamente, /Próximamente/);
});

test('equipo: el bono de objeto suma +1 por nivel a su estadística y no toca la base', () => {
  const e = nueva();
  const base = clonar(e.stats);
  e.maestria.abaco = 4;
  e.maestria.balanza = 10;
  e.maestria.pincel = 16;
  const s = G.statsEfectivos(e);
  assert.deepStrictEqual(e.stats, base, 'la base no cambia');
  assert.deepStrictEqual(s.finanzas, { base: 1, bono: 1, total: 2 });
  assert.deepStrictEqual(s.logica, { base: 1, bono: 2, total: 3 });
  assert.deepStrictEqual(s.analisis, { base: 1, bono: 3, total: 4 });
  assert.deepStrictEqual(s.productividad, { base: 1, bono: 0, total: 1 });
  assert.strictEqual(G.equipo(e).find((o) => o.id === 'balanza').nombreNivel, 'cobre');
});

/* ---------- Prácticas ---------- */
test('prácticas: 2 o 3 plantillas por familia y misma forma que las misiones', () => {
  const por = {};
  for (const p of P.PLANTILLAS) {
    por[p.familia] = (por[p.familia] || 0) + 1;
    assert.strictEqual(p.tipo, 'secundaria');
    assert.deepStrictEqual(p.requisitos, []);
    assert.strictEqual(p.pistas.length, 3);
    assert.strictEqual(p.maxRepeticiones, 3);
    assert.ok(M.MISIONES.find((m) => m.id === p.desbloqueo), p.id);
    for (const clave of p.pista2Contiene) assert.ok(p.pistas[1].includes(clave), `${p.id} pista 2 «${clave}»`);
  }
  for (const f of ['abaco', 'compas', 'balanza', 'pincel']) assert.ok(por[f] >= 2 && por[f] <= 3, f);
  assert.deepStrictEqual(Object.keys(PRACTICAS), P.PLANTILLAS.map((p) => p.id));
});

test('prácticas: la solución de referencia pasa con 20 semillas y repeticiones', () => {
  for (let semilla = 1; semilla <= 20; semilla++) {
    for (const p of P.PLANTILLAS) {
      for (let rep = 0; rep < 3; rep++) {
        const s = P.semillaPractica(semilla * 53, p.id, rep);
        const r = M.validar(p, PRACTICAS[p.id], s, EXTRA_PRACTICAS[p.id]);
        assert.strictEqual(r.ok, true, `${p.id} semilla ${s}: ${JSON.stringify(r)}`);
      }
    }
  }
});

test('prácticas: celda vacía, fórmula equivocada y números a mano fallan', () => {
  for (const p of P.PLANTILLAS) {
    if (p.grafico) {
      assert.strictEqual(M.validar(p, {}, 100, {}).ok, false, p.id);
      const malTipo = Object.assign({}, EXTRA_PRACTICAS[p.id], { tipo: p.grafico.tipo === 'columnas' ? 'líneas' : 'columnas' });
      const r = M.validar(p, {}, 100, malTipo);
      assert.strictEqual(r.ok, false);
      assert.match(r.mensajes.join(' '), /líneas|columnas/);
      continue;
    }
    const seed = P.semillaPractica(777, p.id, 0);
    const datos = p.generarDatos(seed);
    for (const o of p.objetivos) {
      const s = clonar(PRACTICAS[p.id]);
      delete s[o.celda];
      assert.strictEqual(M.validar(p, s, seed).porCelda[o.celda], 'noFormula', `${p.id} ${o.celda}`);
      const esperado = o.esperado(datos);
      const alts = [p.generarDatos(seed + 1), p.generarDatos(seed + 2)].concat(p.variantes ? p.variantes(seed) : []);
      if (typeof esperado === 'number' && !alts.every((a) => o.esperado(a) === esperado)) {
        const h = clonar(PRACTICAS[p.id]);
        h[o.celda] = '=' + String(esperado).replace('.', ',');
        const r = M.validar(p, h, seed);
        assert.strictEqual(r.ok, false, `${p.id} ${o.celda} a mano`);
        assert.strictEqual(r.porCelda[o.celda], 'hardcode');
      }
      const mal = clonar(PRACTICAS[p.id]);
      mal[o.celda] = typeof esperado === 'number' ? '=' + (esperado + 1000) + '-1000+1' : '="x"';
      assert.strictEqual(M.validar(p, mal, seed).ok, false, `${p.id} ${o.celda} mal`);
    }
  }
});

test('prácticas: C2 y B2 rechazan el umbral a mano o sin $', () => {
  for (const id of ['P-C2', 'P-B2']) {
    const p = P.plantilla(id);
    for (let sem = 1; sem <= 10; sem++) {
      const seed = P.semillaPractica(sem * 11, id, 0);
      const g = p.generarDatos(seed).v.g;
      const mano = id === 'P-C2' ? E.rellenarAbajo(`=B2+${g}`, 5) : E.rellenarAbajo(`=SI(B2>${g};"GRANDE";"PEQUEÑO")`, 5);
      const s = {};
      s.C2 = id === 'P-C2' ? `=B2+${g}` : `=SI(B2>${g};"GRANDE";"PEQUEÑO")`;
      mano.forEach((raw, i) => { s['C' + (3 + i)] = raw; });
      assert.strictEqual(M.validar(p, s, seed).ok, false, `${id} a mano ${sem}`);
      const rel = {};
      rel.C2 = id === 'P-C2' ? '=B2+G1' : '=SI(B2>G1;"GRANDE";"PEQUEÑO")';
      E.rellenarAbajo(rel.C2, 5).forEach((raw, i) => { rel['C' + (3 + i)] = raw; });
      assert.strictEqual(M.validar(p, rel, seed).ok, false, `${id} relativa ${sem}`);
    }
  }
});

test('prácticas: cada repetición trae datos distintos', () => {
  for (const p of P.PLANTILLAS) {
    const celdas = [0, 1, 2].map((rep) => JSON.stringify(p.generarDatos(P.semillaPractica(555, p.id, rep)).celdas));
    assert.strictEqual(new Set(celdas).size, 3, p.id);
  }
});

test('prácticas: desbloqueo por lección, límite de 3 repeticiones, puntos y oro', () => {
  const e = nueva(909);
  const info = (id) => G.practicasInfo(e).find((p) => p.id === id);
  assert.strictEqual(info('P-A1').desbloqueada, false);
  assert.strictEqual(G.iniciarPractica(e, 'P-A1').ok, false);
  G.verLeccion(e, 'M1');
  assert.strictEqual(info('P-A1').desbloqueada, true);
  assert.strictEqual(info('P-A2').desbloqueada, false, 'M4 aún no vista');
  const oro0 = e.oro, xp0 = e.xp;

  const sol = (id) => PRACTICAS[id];
  for (let rep = 1; rep <= 3; rep++) {
    assert.strictEqual(G.iniciarPractica(e, 'P-A1').ok, true);
    assert.strictEqual(e.practicaActiva.rep, rep - 1);
    const antes = e.maestria.abaco;
    if (rep === 1) { G.usarPista(e); assert.strictEqual(G.pistasUsadas(e), 1); }
    for (const c of Object.keys(sol('P-A1'))) G.editarCelda(e, c, sol('P-A1')[c]);
    const r = G.entregar(e, e.practicaActiva.borrador);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.practica, true);
    assert.strictEqual(r.puntos, rep === 1 ? 1 : 2, 'repetición ' + rep);
    assert.strictEqual(e.maestria.abaco - antes, r.puntos);
    assert.strictEqual(info('P-A1').hechas, rep);
    assert.strictEqual(info('P-A1').restantes, 3 - rep);
    assert.strictEqual(e.practicaActiva, null);
  }
  assert.strictEqual(e.maestria.abaco, 5);
  assert.strictEqual(G.equipo(e).find((o) => o.id === 'abaco').nombreNivel, 'piedra');
  assert.strictEqual(e.oro - oro0, 15);
  assert.strictEqual(e.xp, xp0, 'las prácticas no dan XP');
  assert.strictEqual(G.iniciarPractica(e, 'P-A1').ok, false);
  assert.match(G.iniciarPractica(e, 'P-A1').mensaje, /3 veces/);
  assert.strictEqual(e.practicaActiva, null);
  const final = G.statsEfectivos(e);
  assert.strictEqual(final.finanzas.bono, 1);
  assert.strictEqual(final.finanzas.base, 1);
});

test('prácticas: fallar no puntúa, y se puede abandonar sin perder repeticiones', () => {
  const e = nueva(910);
  G.verLeccion(e, 'M1');
  G.iniciarPractica(e, 'P-A1');
  G.editarCelda(e, 'B9', '=SUMA(B2:B3)');
  const r = G.entregar(e, e.practicaActiva.borrador);
  assert.strictEqual(r.ok, false);
  assert.ok(r.mensajes.length > 0);
  assert.strictEqual(e.maestria.abaco, 0);
  assert.strictEqual(G.editarCelda(e, 'B2', '5'), false, 'solo se editan las celdas objetivo');
  G.abandonarPractica(e);
  assert.strictEqual(e.practicaActiva, null);
  assert.strictEqual(G.practicasInfo(e).find((p) => p.id === 'P-A1').hechas, 0);
  assert.strictEqual(e.misionActual, 0, 'la misión principal sigue intacta');
  assert.strictEqual(G.entregar(e, SOLUCIONES.M1).ok, true);
});

test('prácticas de gráficos: pasan con el tipo y rango correctos', () => {
  const e = nueva(911);
  G.verLeccion(e, 'M8');
  G.iniciarPractica(e, 'P-P2');
  assert.strictEqual(G.entregar(e, {}, { rango: 'A1:B7', tipo: 'columnas', titulo: 'Cosecha' }).ok, false);
  const r = G.entregar(e, {}, EXTRA_PRACTICAS['P-P2']);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.objeto, 'Pincel');
  assert.strictEqual(e.grafico, null, 'el tablón solo se fija con la misión principal');
});

test('el camino principal nunca queda cerrado: requisitos vacíos y misiones jugables sin prácticas', () => {
  const e = nueva(912);
  for (const m of M.MISIONES) {
    assert.strictEqual(G.requisitosCumplidos(e, m), true);
    assert.strictEqual(G.entregar(e, SOLUCIONES[m.id], EXTRA[m.id]).ok, true);
  }
  assert.strictEqual(e.xp, 350);
  assert.strictEqual(Object.values(e.maestria).reduce((a, b) => a + b, 0), 0);
});

/* ---------- Partida completa ---------- */
test('partida completa: Escuela + 8 misiones + prácticas', () => {
  const e = G.nuevaPartida('Daniel', 4321);
  for (const ej of Esc.ejercicios) assert.strictEqual(G.completarEjercicio(e, ej.id, ESCUELA[ej.id]).ok, true);
  assert.strictEqual(G.aldeaDesbloqueada(e), true);
  const jugarPracticas = () => {
    for (const info of G.practicasInfo(e)) {
      while (G.practicasInfo(e).find((p) => p.id === info.id).desbloqueada && G.practicasInfo(e).find((p) => p.id === info.id).restantes > 0) {
        assert.strictEqual(G.iniciarPractica(e, info.id).ok, true);
        const sol = PRACTICAS[info.id];
        Object.keys(sol).forEach((c) => G.editarCelda(e, c, sol[c]));
        assert.strictEqual(G.entregar(e, e.practicaActiva.borrador, EXTRA_PRACTICAS[info.id]).ok, true, info.id);
      }
    }
  };
  for (const m of M.MISIONES) {
    G.verLeccion(e, m.id);
    assert.strictEqual(G.entregar(e, SOLUCIONES[m.id], EXTRA[m.id]).ok, true, m.id);
    if (m.id === 'M5' || m.id === 'M7') jugarPracticas();
  }
  jugarPracticas();
  assert.strictEqual(e.xp, 350);
  assert.strictEqual(G.nivel(e.xp), 4);
  assert.strictEqual(e.oro, 150 + 5 * 27, 'oro de principales + 5 por cada una de las 27 prácticas');
  assert.deepStrictEqual(e.stats, { logica: 5, analisis: 4, productividad: 3, finanzas: 3, automatizacion: 1 });
  const total = Object.values(e.maestria).reduce((a, b) => a + b, 0);
  assert.ok(total > 0);
  const s = G.statsEfectivos(e);
  for (const k of Object.keys(e.stats)) assert.strictEqual(s[k].base, e.stats[k]);
  assert.strictEqual(G.equipo(e).find((o) => o.id === 'abaco').nombreNivel, 'bronce', 'Ábaco: 3 plantillas × 3 repeticiones');
  assert.strictEqual(G.libro(e).filter((f) => f.desbloqueada).length, 21);
});

/* ---------- Guardado y migración ---------- */
test('guardado: Escuela, maestría y prácticas se guardan y cargan sin pérdida', () => {
  const e = G.nuevaPartida('Ana', 888);
  G.completarEjercicio(e, 'E1-1', ESCUELA['E1-1']);
  G.completarEjercicio(e, 'E1-2', ESCUELA['E1-2']);
  assert.deepStrictEqual(G.cargar(G.serializar(e)), e);
  G.saltarEscuela(e);
  G.verLeccion(e, 'M1');
  G.iniciarPractica(e, 'P-A1');
  G.usarPista(e);
  G.editarCelda(e, 'B9', '=SUMA(B2:B8)');
  e.maestria.compas = 5;
  e.practicas['P-C1'] = { hechas: 2 };
  const c = G.cargar(G.serializar(e));
  assert.deepStrictEqual(c, e);
  assert.strictEqual(c.practicaActiva.borrador.B9, '=SUMA(B2:B8)');
  assert.strictEqual(c.practicaActiva.pistas, 1);
  assert.strictEqual(c.escuela.saltada, true);
});

const v1 = (misionActual, completadas) => ({
  version: 1, nombre: 'Daniel', clase: 'Aprendiz de Finanzas', equipo: 'Hoja de cálculo de madera', semilla: 123,
  iniciada: true, tutorialVisto: true, misionActual, completadas, borradores: { M2: { E2: '=SUMA(B2:D2)' } }, pistas: { M1: 2, M7: 1 },
  xp: 0, oro: 0, stats: { logica: 1, analisis: 1, automatizacion: 1, finanzas: 1, productividad: 1 },
  registro: [{ mision: 'M1', titulo: 'Lo que hay en el campo', texto: 'x' }], grafico: null
});

test('migración: una partida de la versión 1 a mitad de camino se carga y se puede seguir', () => {
  const viejo = v1(2, { M1: { celdas: { B9: '=SUMA(B2:B8)' }, extra: null }, M2: { celdas: SOLUCIONES.M2, extra: null } });
  viejo.xp = 50; viejo.oro = 20; viejo.stats.logica = 2; viejo.stats.productividad = 2;
  const e = G.cargar(JSON.stringify(viejo));
  assert.strictEqual(e.version, 2);
  assert.strictEqual(e.misionActual, 2);
  assert.strictEqual(e.xp, 50);
  assert.strictEqual(e.escuela.saltada, true);
  assert.strictEqual(G.aldeaDesbloqueada(e), true);
  assert.deepStrictEqual(Object.keys(e.leccionesVistas).sort(), ['M1', 'M2']);
  assert.deepStrictEqual(e.maestria, { abaco: 0, compas: 0, balanza: 0, pincel: 0 });
  assert.strictEqual(e.practicaActiva, null);
  assert.deepStrictEqual(e.borradores.M2, { E2: '=SUMA(B2:D2)' });
  assert.strictEqual(e.pistas.M7, undefined);
  for (let i = 2; i < 8; i++) assert.strictEqual(G.entregar(e, SOLUCIONES['M' + (i + 1)], EXTRA['M' + (i + 1)]).ok, true, 'M' + (i + 1));
  assert.strictEqual(e.xp, 350);
  assert.strictEqual(e.oro, 150);
});

test('migración: la antigua M6 completada cuenta como M6 + M7 y los gráficos pasan a M8', () => {
  const comp = {};
  for (let i = 1; i <= 5; i++) comp['M' + i] = { celdas: SOLUCIONES['M' + i], extra: null };
  comp.M6 = { celdas: { D2: '=B2-C2' }, extra: null };
  const sinGrafico = G.cargar(JSON.stringify(Object.assign(v1(6, comp), { xp: 250, oro: 100, stats: { logica: 5, analisis: 3, automatizacion: 1, finanzas: 3, productividad: 3 } })));
  assert.strictEqual(sinGrafico.misionActual, 7);
  assert.ok(sinGrafico.completadas.M6 && sinGrafico.completadas.M7 && !sinGrafico.completadas.M8);
  assert.strictEqual(sinGrafico.completadas.M6.migrada, true);
  assert.strictEqual(G.mision(sinGrafico).id, 'M8');
  const r = G.entregar(sinGrafico, {}, EXTRA.M8);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(sinGrafico.xp, 300);
  assert.strictEqual(G.terminada(sinGrafico), true);
  assert.deepStrictEqual(sinGrafico.stats, { logica: 5, analisis: 4, automatizacion: 1, finanzas: 3, productividad: 3 });

  const grafico = { rango: 'A1:B6', tipo: 'columnas', titulo: 'Producción' };
  comp.M7 = { celdas: {}, extra: grafico };
  const todo = G.cargar(JSON.stringify(Object.assign(v1(7, comp), { xp: 350, oro: 150, grafico, registro: [{ mision: 'M7', titulo: 'El tablón de la aldea', texto: 'ok' }] })));
  assert.strictEqual(todo.misionActual, 8);
  assert.strictEqual(G.terminada(todo), true);
  assert.deepStrictEqual(todo.completadas.M8.extra, grafico);
  assert.strictEqual(todo.registro[0].mision, 'M8');
  assert.ok(G.calcularAldea(todo).edificios.includes('Tablón de la aldea'));
  assert.strictEqual(G.resumenFinal(todo).codiceDesbloqueadas, 21);
  assert.deepStrictEqual(G.cargar(G.serializar(todo)), todo);
});

test('migración: los archivos corruptos o de versión desconocida se rechazan', () => {
  assert.throws(() => G.cargar(JSON.stringify(Object.assign(v1(9, {}), {}))), /partida válida/);
  assert.throws(() => G.cargar(JSON.stringify(Object.assign(v1(2, {}), { version: 7 }))), /partida válida/);
  assert.throws(() => G.cargar(JSON.stringify(Object.assign(v1(2, {}), { xp: 'mucho' }))), /partida válida/);
});
