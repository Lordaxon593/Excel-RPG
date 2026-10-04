'use strict';
/* Prueba de humo de ui.js con un DOM simulado mínimo (no sustituye a probarlo en un navegador). */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const { construir } = require('../build.js');
const G = require('../src/game.js');
const { SOLUCIONES, EXTRA, ESCUELA } = require('./soluciones.js');

const { script } = construir();

function entorno(estadoInicial) {
  const oy = { raiz: {}, doc: {} };
  const guardado = { valor: estadoInicial ? G.serializar(estadoInicial) : null };
  const input = { value: '', selectionStart: 0, setSelectionRange() {}, focus() {}, classList: { contains: () => false } };
  const app = {
    innerHTML: '',
    addEventListener(t, f) { oy.raiz[t] = f; },
    querySelector(sel) {
      if (sel === '#nombre') return { value: 'Ana' };
      return null;
    },
    contains: () => true
  };
  const sb = {
    document: { getElementById: () => app, addEventListener(t, f) { oy.doc[t] = f; }, createElement: () => ({}), body: {} },
    localStorage: { getItem: () => guardado.valor, setItem: (k, v) => { guardado.valor = v; }, removeItem() { guardado.valor = null; } },
    confirm: () => true, Blob: function () {}, URL: {}, FileReader: function () {}, setTimeout
  };
  sb.window = sb;
  sb.self = sb;
  vm.createContext(sb);
  vm.runInContext(script, sb);

  const cuerpo = { tagName: 'BODY', classList: { contains: () => false }, matches: () => false };
  const e = {
    app, guardado, input,
    html: () => app.innerHTML,
    estado: () => JSON.parse(guardado.valor),
    clic(act, extra) {
      const t = Object.assign({ attrs: Object.assign({ 'data-act': act }, extra || {}) }, {
        classList: { contains: () => false },
        getAttribute(k) { return this.attrs[k]; },
        closest(s) { return (s === '[data-act]' || (s === '[data-act="continuar"]' && act === 'continuar')) ? this : null; }
      });
      oy.raiz.click({ target: t });
    },
    panel(p) {
      const t = { attrs: { 'data-panel': p }, classList: { contains: () => false }, getAttribute(k) { return this.attrs[k]; }, closest(s) { return s === '[data-panel]' ? this : null; } };
      oy.raiz.click({ target: t });
    },
    celda(ref, shift) {
      const t = { attrs: { 'data-ref': ref }, classList: { contains: () => false }, getAttribute(k) { return this.attrs[k]; }, closest(s) { return s === 'td[data-ref]' ? this : null; } };
      oy.raiz.mousedown({ button: 0, target: t, shiftKey: !!shift, preventDefault() {} });
      oy.doc.mouseup({});
      return t;
    },
    pasar(ref) {
      const t = { attrs: { 'data-ref': ref }, classList: { contains: () => false }, getAttribute(k) { return this.attrs[k]; }, closest(s) { return s === 'td[data-ref]' ? this : null; } };
      oy.raiz.mouseover({ target: t });
    },
    asa() {
      const t = { attrs: { 'data-asa': '1' }, classList: { contains: () => false }, getAttribute(k) { return this.attrs[k]; }, closest() { return null; } };
      oy.raiz.mousedown({ button: 0, target: t, shiftKey: false, preventDefault() {} });
    },
    tecla(key, opts) {
      let evitado = false;
      oy.doc.keydown(Object.assign({ key, target: cuerpo, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault() { evitado = true; } }, opts || {}));
      return evitado;
    },
    teclaEnInput(key, opts) {
      const t = { tagName: 'INPUT', classList: { contains: (c) => c === 'celda-input' }, matches: () => true, selectionStart: 0 };
      oy.doc.keydown(Object.assign({ key, target: t, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault() {} }, opts || {}));
    },
    escribir(texto) {
      const t = { classList: { contains: (c) => c === 'celda-input' }, value: texto, selectionStart: texto.length, getAttribute: () => null, id: '' };
      oy.raiz.input({ target: t });
    },
    soltar() { oy.doc.mouseup({}); },
    presionar(ref) {
      const t = { attrs: { 'data-ref': ref }, classList: { contains: () => false }, getAttribute(k) { return this.attrs[k]; }, closest(s) { return s === 'td[data-ref]' ? this : null; } };
      oy.raiz.mousedown({ button: 0, target: t, shiftKey: false, preventDefault() {} });
    },
    campo(nombre, valor) {
      const t = { classList: { contains: () => false }, value: valor, id: '', getAttribute: (k) => (k === 'data-campo' ? nombre : null) };
      oy.raiz.change({ target: t });
    },
    buscar(texto) {
      const t = { classList: { contains: () => false }, value: texto, id: 'libro-q', getAttribute: () => null };
      oy.raiz.input({ target: t });
    }
  };
  return e;
}

const aldea = (semilla) => { const g = G.nuevaPartida('Ana', semilla || 777); g.iniciada = true; g.tutorialVisto = true; G.saltarEscuela(g); return g; };
const barra = (html) => {
  const i = html.indexOf('id="barra-texto" class="barra-texto">');
  const resto = html.slice(i + 'id="barra-texto" class="barra-texto">'.length);
  return resto.slice(0, resto.indexOf('</div>')).replace(/<[^>]+>/g, '').replace(/<\/span>$/, '');
};
const limpio = (html) => assert.ok(!/undefined|NaN|\[object|null</.test(html), 'HTML sospechoso: ' + (html.match(/.{30}(undefined|NaN|\[object|null<).{30}/) || [''])[0]);

test('ui: bienvenida, Escuela completa y entrada en la Aldea', () => {
  const e = entorno(null);
  assert.match(e.html(), /El nacimiento de la aldea/);
  assert.match(e.html(), /Cuatro lecciones|cuatro lecciones/);
  limpio(e.html());
  e.clic('empezar');
  assert.match(e.html(), /La Escuela/);
  assert.match(e.html(), /Lección 1: La hoja/);
  assert.match(e.html(), /Haz clic en la celda B3/);
  limpio(e.html());
  e.clic('esc-comprobar');
  assert.match(e.html(), /Todavía no|Ahora tienes seleccionado/);
  e.celda('B3');
  e.clic('esc-comprobar');
  assert.match(e.html(), /Continuar/);
  e.clic('esc-continuar');
  assert.match(e.html(), /selecciona la celda D5/);
  e.celda('D5');
  e.clic('esc-comprobar');
  e.clic('esc-continuar');
  assert.match(e.html(), /A1:B5/);
  e.celda('A1');
  e.celda('B5', true);
  e.clic('esc-comprobar');
  assert.match(e.html(), /Continuar/);
  assert.ok(e.estado().escuela.ejercicios['E2-1']);
  e.clic('esc-continuar');
  e.celda('C2');
  e.tecla('ArrowDown', { shiftKey: true });
  e.tecla('ArrowDown', { shiftKey: true });
  e.tecla('ArrowDown', { shiftKey: true });
  e.tecla('ArrowDown', { shiftKey: true });
  e.clic('esc-comprobar');
  assert.ok(e.estado().escuela.ejercicios['E2-2'], 'Mayús+flechas selecciona C2:C6');
  e.clic('esc-continuar');
  assert.match(e.html(), /Lección 3/);
  e.celda('B2');
  e.tecla('2');
  e.escribir('2,5');
  e.teclaEnInput('Enter');
  e.clic('esc-comprobar');
  assert.ok(e.estado().escuela.ejercicios['E3-1']);
  e.clic('esc-continuar');
  e.celda('C1');
  e.tecla('=');
  e.celda('A1'); // modo señalar: inserta A1
  e.celda('B1'); // un segundo clic antes de teclear reemplaza la referencia
  e.escribir('=B1+');
  e.celda('A1'); // tras el + toca insertar de nuevo
  e.teclaEnInput('Enter');
  e.clic('esc-comprobar');
  assert.match(e.html(), /Continuar/);
  assert.ok(e.estado().escuela.ejercicios['E3-2'], 'el modo señalar produjo =B1+A1');
  limpio(e.html());
});

test('ui: modo señalar con arrastre y clic fuera de lugar', () => {
  const g = aldea(39);
  G.verLeccion(g, 'M1');
  const e = entorno(g);
  e.celda('B9');
  e.tecla('=');
  e.escribir('=SUMA(');
  e.presionar('B2');
  e.pasar('B4');
  e.pasar('B8');
  e.soltar();
  e.teclaEnInput('Enter');
  assert.strictEqual(e.estado().borradores.M1.B9, '=SUMA(B2:B8', 'el arrastre inserta el rango B2:B8');
  e.celda('B9');
  e.tecla('=');
  e.escribir('=B2');
  e.celda('B3'); // el cursor está tras una referencia: el clic termina la edición, no inserta
  assert.strictEqual(e.estado().borradores.M1.B9, '=B2');
});

test('ui: saltar la Escuela, lección de la misión y primera misión completa', () => {
  const e = entorno(null);
  e.clic('empezar');
  e.clic('esc-saltar');
  assert.match(e.html(), /Lección de Maese Aldric: Sumar con SUMA/);
  assert.match(e.html(), /Ejemplo resuelto/);
  assert.match(e.html(), /=SUMA\(B2:B4\)/);
  assert.ok(!/Qué tienes que hacer/.test(e.html()), 'la hoja de la misión no se ve antes de la lección');
  limpio(e.html());
  e.clic('empezar-mision');
  assert.match(e.html(), /Qué tienes que hacer/);
  assert.match(e.html(), /Misión 1: Lo que hay en el campo/);
  assert.match(e.html(), /Entregar al mayordomo/);
  assert.match(e.html(), /Pista \(0\/3\)/);
  assert.match(e.html(), /Preguntar a Aldric/);
  assert.match(e.html(), /Rellenar hacia abajo/);
  limpio(e.html());
  assert.ok(e.estado().leccionesVistas.M1);

  e.celda('B9');
  e.tecla('=');
  e.escribir('=SUMA(');
  e.celda('B2');
  e.pasar('B8');
  oyMouseUp(e);
  e.escribir('=SUMA(B2:B8)');
  e.teclaEnInput('Enter');
  assert.strictEqual(e.estado().borradores.M1.B9, '=SUMA(B2:B8)');
  e.clic('entregar');
  assert.match(e.html(), /Misión completada/);
  assert.match(e.html(), /\+25 XP/);
  assert.ok(!/Nuevo rango/.test(e.html()), 'sin aviso de rango falso');
  limpio(e.html());
  e.tecla('Enter');
  assert.match(e.html(), /Lección de Maese Aldric: Referencias relativas/);
  assert.strictEqual(e.estado().xp, 25);
});

function oyMouseUp() { /* el mouseup ya lo dispara e.celda; aquí solo se documenta el arrastre */ }

test('ui: un fallo de entrega no abre ventana y muestra el motivo junto al botón', () => {
  const g = aldea(31);
  G.verLeccion(g, 'M1');
  const e = entorno(g);
  e.celda('B9');
  e.tecla('=');
  e.escribir('=SUMA(B2:B3)');
  e.teclaEnInput('Enter');
  e.clic('entregar');
  assert.ok(!/Misión completada/.test(e.html()));
  assert.match(e.html(), /B9: el resultado es menor del esperado/);
  assert.match(e.html(), /class="mensajes error"/);
  limpio(e.html());
});

test('ui: la celda con error conserva su texto en la barra y al editar', () => {
  const g = aldea(32);
  G.verLeccion(g, 'M1');
  G.editarCelda(g, 'B9', '=SUMA(B2,B8)');
  const e = entorno(g);
  e.celda('B9');
  assert.strictEqual(barra(e.html()), '=SUMA(B2,B8)');
  assert.match(e.html(), /class="rc0">B2</, 'las referencias de la barra van en color');
  assert.match(e.html(), /#ERROR!/);
  assert.match(e.html(), /punto y coma/);
  e.tecla('F2');
  assert.match(e.html(), /class="celda-input" value="=SUMA\(B2,B8\)"/);
  e.teclaEnInput('Escape');
  e.tecla('x');
  assert.match(e.html(), /class="celda-input" value="x"/, 'teclear reemplaza el contenido');
  e.teclaEnInput('Escape');
  e.celda('B8');
  e.celda('B9');
  assert.ok(!/celda-input/.test(e.html()), 'un solo clic no edita');
  e.celda('B9');
  assert.match(e.html(), /class="celda-input" value="=SUMA\(B2,B8\)"/, 'doble clic conserva el texto');
});

test('ui: la selección muestra el rango y las referencias de la fórmula se resaltan', () => {
  const g = aldea(33);
  G.verLeccion(g, 'M2');
  g.misionActual = 1;
  G.verLeccion(g, 'M1');
  const e = entorno(g);
  e.celda('E2');
  e.celda('E6', true);
  assert.match(e.html(), /id="nombre-celda">E2:E6</);
  assert.match(e.html(), /b-t/);
  assert.match(e.html(), /data-asa="1"/);
  e.celda('E2');
  e.tecla('=');
  e.escribir('=SUMA(B2:D2)');
  assert.match(e.html(), /sel-r/);
});

test('ui: relleno con el cuadradito de la esquina y con Ctrl+D', () => {
  const g = aldea(34);
  g.misionActual = 1;
  G.verLeccion(g, 'M2');
  G.editarCelda(g, 'E2', '=SUMA(B2:D2)');
  const e = entorno(g);
  e.celda('E2');
  e.asa();
  e.pasar('E3');
  e.pasar('E5');
  assert.match(e.html(), /rel-prev/, 'se previsualiza el relleno al arrastrar');
  e.soltar();
  const b = e.estado().borradores.M2;
  assert.deepStrictEqual([b.E2, b.E3, b.E4, b.E5], ['=SUMA(B2:D2)', '=SUMA(B3:D3)', '=SUMA(B4:D4)', '=SUMA(B5:D5)']);
  assert.strictEqual(b.E6, undefined);
  e.celda('E2');
  e.celda('E6', true);
  e.tecla('d', { ctrlKey: true });
  assert.strictEqual(e.estado().borradores.M2.E6, '=SUMA(B6:D6)');
  assert.match(e.html(), /Fórmula copiada/);
  limpio(e.html());
});

test('ui: paneles laterales, Libro y buscador', () => {
  const g = aldea(35);
  G.verLeccion(g, 'M1');
  const e = entorno(g);
  e.panel('personaje');
  assert.match(e.html(), /panel-lateral/);
  assert.match(e.html(), /Aprendiz de Finanzas/);
  assert.match(e.html(), /Exportar partida/);
  limpio(e.html());
  e.panel('personaje');
  assert.ok(!/panel-lateral/.test(e.html()), 'el mismo botón cierra el panel');
  e.panel('equipo');
  assert.match(e.html(), /Ábaco/);
  assert.match(e.html(), /Compás/);
  assert.match(e.html(), /Balanza/);
  assert.match(e.html(), /Pincel/);
  assert.match(e.html(), /Para subir tu Ábaco, completa prácticas de cálculo en el Almacén/);
  assert.match(e.html(), /data-act="practicar" data-id="P-A1"/);
  limpio(e.html());
  e.tecla('Escape');
  assert.ok(!/panel-lateral/.test(e.html()), 'Esc cierra el panel');
  e.panel('aldea');
  assert.match(e.html(), /Trigo/);
  e.panel('libro');
  assert.match(e.html(), /Libro de funciones/);
  assert.match(e.html(), /SUMA/);
  assert.match(e.html(), /🔒 PROMEDIO/);
  e.buscar('zzzz');
  assert.match(e.html(), /Libro de funciones/);
  e.clic('ficha', { 'data-id': 'funcion.suma' });
  assert.match(e.html(), /Para qué sirve/);
  assert.match(e.html(), /=SUMA\(rango\)/);
  e.clic('cerrar-panel');
  assert.ok(!/panel-lateral/.test(e.html()));
  e.clic('aldric');
  assert.match(e.html(), /id="libro-q"/);
});

test('ui: práctica completa y ventana de práctica', () => {
  const g = aldea(36);
  G.verLeccion(g, 'M1');
  const e = entorno(g);
  e.panel('equipo');
  e.clic('practicar', { 'data-id': 'P-A1' });
  assert.match(e.html(), /Práctica: Las hogazas de la semana/);
  assert.match(e.html(), /Abandonar práctica/);
  assert.match(e.html(), /sin XP/);
  limpio(e.html());
  e.celda('B9');
  e.tecla('=');
  e.escribir('=SUMA(B2:B8)');
  e.teclaEnInput('Enter');
  e.clic('pista');
  e.clic('entregar');
  assert.match(e.html(), /Práctica completada/);
  assert.match(e.html(), /\+1 punto de maestría en tu Ábaco/);
  assert.match(e.html(), /\+5 de oro/);
  limpio(e.html());
  e.tecla('Enter');
  assert.match(e.html(), /Equipo/);
  assert.match(e.html(), /\[#------\.*|\[##-----|\[#+-+\] 1\/4/);
  assert.strictEqual(e.estado().maestria.abaco, 1);
});

function escribirFormula(e, ref, formula) {
  e.celda(ref);
  e.tecla('=');
  e.escribir(formula);
  e.teclaEnInput('Enter');
}

test('ui: recorre las 8 misiones editando celda a celda hasta la pantalla final', () => {
  const M = require('../src/missions.js');
  const e = entorno(aldea(37));
  let rangoAvisado = false;
  for (let i = 0; i < 8; i++) {
    const m = M.MISIONES[i];
    assert.match(e.html(), /Lección de Maese Aldric/, m.id);
    for (let p = 0; p < m.leccion.paginas.length - 1; p++) e.clic('pag-sig');
    e.clic('empezar-mision');
    assert.match(e.html(), new RegExp('Misión ' + (i + 1) + ':'), m.id);
    limpio(e.html());
    if (m.grafico) {
      const g = EXTRA[m.id];
      e.campo('rango', g.rango);
      e.campo('tipo', g.tipo);
      e.campo('titulo', g.titulo);
    } else {
      for (const c of Object.keys(SOLUCIONES[m.id])) escribirFormula(e, c, SOLUCIONES[m.id][c]);
    }
    e.clic('entregar');
    assert.match(e.html(), /Misión completada/, m.id + '\n' + e.html().slice(-1500));
    limpio(e.html());
    rangoAvisado = rangoAvisado || /Nuevo rango/.test(e.html());
    e.tecla('Enter');
  }
  assert.strictEqual(rangoAvisado, false, 'del nivel 1 al 4 no hay aviso de rango');
  assert.match(e.html(), /La aldea ha nacido/);
  assert.match(e.html(), /Próximamente: más misiones \(Bosque de las Fórmulas\)/);
  assert.match(e.html(), /Nivel: <b>4<\/b>/);
  assert.match(e.html(), /21\/21/);
  assert.strictEqual(e.estado().xp, 350);
  assert.strictEqual(e.estado().oro, 150);
  limpio(e.html());
});

test('ui: cargar una partida guardada y exportar/importar no rompen la pantalla', () => {
  const g = aldea(38);
  G.verLeccion(g, 'M1');
  g.oro = 20;
  const e = entorno(g);
  assert.match(e.html(), /🪙 <b>20<\/b>/);
  e.panel('personaje');
  e.clic('exportar');
  assert.match(e.html(), /panel-lateral/);
  e.clic('nueva');
  assert.match(e.html(), /¿Cómo te llamas\?/);
  e.clic('empezar');
  assert.match(e.html(), /Lección 1: La hoja/, 'una partida nueva empieza en la Escuela');
  assert.match(e.html(), /🪙 <b>0<\/b>/);
});
