'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');

function hoja(celdas, cols, filas) {
  return E.Hoja.desde(celdas, cols || 10, filas || 20);
}
const val = (celdas, ref) => hoja(celdas).valor(ref);
const f = (formula, celdas) => val(Object.assign({ Z1: formula }, celdas || {}), 'Z1');
const H = (formula, celdas) => {
  const h = hoja(Object.assign({ A1: formula }, celdas || {}));
  return h.valor('A1');
};

test('operadores aritméticos y precedencia', () => {
  assert.strictEqual(H('=1+2*3'), 7);
  assert.strictEqual(H('=(1+2)*3'), 9);
  assert.strictEqual(H('=10-4-3'), 3);
  assert.strictEqual(H('=8/4/2'), 1);
  assert.strictEqual(H('=2^3^2'), 64);
  assert.strictEqual(H('=-2^2'), 4);
  assert.strictEqual(H('=2*-3'), -6);
  assert.strictEqual(H('=--5'), 5);
  assert.strictEqual(H('=1,5*2'), 3);
  assert.strictEqual(H('=2+3*4^2'), 50);
});

test('decimales: coma en fórmulas y coma o punto en celdas', () => {
  assert.strictEqual(H('=1,5+1,5'), 3);
  const h = hoja({ A1: '1,5', A2: '2.5', A3: '=A1+A2' });
  assert.strictEqual(h.valor('A1'), 1.5);
  assert.strictEqual(h.valor('A2'), 2.5);
  assert.strictEqual(h.valor('A3'), 4);
});

test('comparaciones y texto', () => {
  assert.strictEqual(H('=1<2'), true);
  assert.strictEqual(H('=2<=1'), false);
  assert.strictEqual(H('=3<>3'), false);
  assert.strictEqual(H('=3>=3'), true);
  assert.strictEqual(H('=1=1'), true);
  assert.strictEqual(H('="a"="A"'), true);
  assert.strictEqual(H('="a"<"b"'), true);
  assert.strictEqual(H('="di ""hola"""'), 'di "hola"');
  assert.strictEqual(H('=A2=""', {}), true);
  assert.strictEqual(H('=A2=0', {}), true);
  assert.strictEqual(H('="x"<1'), false);
});

test('SUMA, PROMEDIO, MAX, MIN, CONTAR', () => {
  const d = { B1: '4', B2: '6', B3: 'texto', B4: '', B5: '10' };
  assert.strictEqual(H('=SUMA(B1:B5)', d), 20);
  assert.strictEqual(H('=SUMA(B1;B2;100)', d), 110);
  assert.strictEqual(H('=suma(b1:b2)', d), 10);
  assert.strictEqual(H('=PROMEDIO(B1:B5)', d), 20 / 3);
  assert.strictEqual(H('=MAX(B1:B5)', d), 10);
  assert.strictEqual(H('=MIN(B1:B5)', d), 4);
  assert.strictEqual(H('=CONTAR(B1:B5)', d), 3);
  assert.strictEqual(H('=MAX(B3:B4)', d), 0);
  assert.strictEqual(H('=SUMA(B1:B2;B5)', d), 20);
  assert.strictEqual(H('=SUMA(B1:B2)*2', d), 20);
});

test('SI, ENTERO, REDONDEAR', () => {
  assert.strictEqual(H('=SI(1<2;"a";"b")'), 'a');
  assert.strictEqual(H('=SI(1>2;"a";"b")'), 'b');
  assert.strictEqual(H('=SI(1>2;"a")'), false);
  assert.strictEqual(H('=SI(1<2;5;1/0)'), 5);
  assert.strictEqual(H('=ENTERO(7,9)'), 7);
  assert.strictEqual(H('=ENTERO(-7,1)'), -8);
  assert.strictEqual(H('=REDONDEAR(2,345;2)'), 2.35);
  assert.strictEqual(H('=REDONDEAR(2,5;0)'), 3);
  assert.strictEqual(H('=REDONDEAR(1234;-2)'), 1200);
  assert.strictEqual(H('=SI(B1>2;"RACIONAR";"NORMAL")', { B1: '5' }), 'RACIONAR');
});

test('referencias, rangos y mayúsculas', () => {
  const d = { B1: '3', C1: '4', B2: '5', C2: '6' };
  assert.strictEqual(H('=b1+C1', d), 7);
  assert.strictEqual(H('=SUMA(B1:C2)', d), 18);
  assert.strictEqual(H('=SUMA(C2:B1)', d), 18);
  assert.strictEqual(H('=SUMA($B$1:$C$2)', d), 18);
  assert.strictEqual(H('=$B1+C$1', d), 7);
});

test('celda vacía vale 0 y texto en operación da #VALOR!', () => {
  assert.strictEqual(H('=B1+1'), 1);
  assert.strictEqual(H('=B1', {}), 0);
  const e = H('=B1+1', { B1: 'hola' });
  assert.ok(E.esError(e));
  assert.strictEqual(e.codigo, '#VALOR!');
  assert.ok(e.explicacion.length > 10);
});

test('los cinco errores con explicación', () => {
  const casos = [
    ['=FOO(1)', '#¿NOMBRE?'],
    ['=hola', '#¿NOMBRE?'],
    ['=1/0', '#DIV/0!'],
    ['=B1/B2', '#DIV/0!'],
    ['="a"+1', '#VALOR!'],
    ['=Z99', '#REF!'],
    ['=K1', '#REF!'],
    ['=SUMA(A5:Z5)', '#REF!'],
    ['=PROMEDIO(B1:B2)', '#DIV/0!']
  ];
  for (const [formula, codigo] of casos) {
    const v = H(formula);
    assert.ok(E.esError(v), formula);
    assert.strictEqual(v.codigo, codigo, formula);
    assert.ok(v.explicacion.length > 10, formula);
  }
  assert.strictEqual(E.formatear(H('=1/0')), '#DIV/0!');
});

test('errores se propagan', () => {
  assert.strictEqual(H('=1/0+1').codigo, '#DIV/0!');
  assert.strictEqual(H('=SUMA(B1:B2)', { B1: '=1/0', B2: '2' }).codigo, '#DIV/0!');
});

test('coma mal usada da mensaje didáctico', () => {
  for (const formula of ['=SUMA(B1,B2)', '=SUMA(1,2,3)', '=SI(1<2,"a","b")', '=SUMA(B1:B2,3)']) {
    const v = H(formula, { B1: '1', B2: '2' });
    if (formula === '=SUMA(1,2,3)') continue; // 1,2 es un decimal válido; luego la coma sobra
    assert.ok(E.esError(v), formula);
    assert.ok(v.explicacion.includes('se separan con ; (punto y coma)'), formula);
  }
  assert.ok(E.esError(H('=SUMA(1,2,3)')));
});

test('fórmulas mal escritas no se cuelgan', () => {
  for (const formula of ['=', '=(1+2', '=1+', '=SUMA(1;)', '=SUMA(1 2)', '="abc', '=1+*2', '=SUMA(', '=2A', '=A1:']) {
    const v = H(formula);
    assert.ok(E.esError(v), formula);
  }
});

test('referencias circulares', () => {
  const h = hoja({ A1: '=B1', B1: '=A1', C1: '=C1', D1: '=SUMA(A1:B1)', E1: '=1+1' });
  assert.strictEqual(h.valor('A1').codigo, '#CIRCULAR');
  assert.strictEqual(h.valor('B1').codigo, '#CIRCULAR');
  assert.strictEqual(h.valor('C1').codigo, '#CIRCULAR');
  assert.strictEqual(h.valor('D1').codigo, '#CIRCULAR');
  assert.strictEqual(h.valor('E1'), 2);
  const largo = {};
  for (let i = 1; i < 20; i++) largo['A' + i] = '=A' + (i + 1);
  largo.A20 = '=A1';
  assert.strictEqual(hoja(largo).valor('A1').codigo, '#CIRCULAR');
});

test('recalcula al cambiar una celda', () => {
  const h = hoja({ A1: '2', B1: '=A1*2' });
  assert.strictEqual(h.valor('B1'), 4);
  h.poner('A1', '5');
  assert.strictEqual(h.valor('B1'), 10);
  h.poner('A1', '');
  assert.strictEqual(h.valor('B1'), 0);
});

test('formato de números en español', () => {
  assert.strictEqual(E.formatear(1.5), '1,5');
  assert.strictEqual(E.formatear(2 / 3), '0,67');
  assert.strictEqual(E.formatear(3), '3');
  assert.strictEqual(E.formatear(true), 'VERDADERO');
  assert.strictEqual(E.formatear('x'), 'x');
  assert.strictEqual(E.formatear(null), '');
});

test('rellenar hacia abajo ajusta relativas y respeta absolutas', () => {
  assert.deepStrictEqual(E.rellenarAbajo('=SUMA(B2:D2)', 3), ['=SUMA(B3:D3)', '=SUMA(B4:D4)', '=SUMA(B5:D5)']);
  assert.deepStrictEqual(E.rellenarAbajo('=C2/B2', 2), ['=C3/B3', '=C4/B4']);
  assert.deepStrictEqual(E.rellenarAbajo('=SI(D2<$G$1;"RACIONAR";"NORMAL")', 2), [
    '=SI(D3<$G$1;"RACIONAR";"NORMAL")',
    '=SI(D4<$G$1;"RACIONAR";"NORMAL")'
  ]);
  assert.deepStrictEqual(E.rellenarAbajo('=A$1+$B2', 1), ['=A$1+$B3']);
  assert.deepStrictEqual(E.rellenarAbajo('5', 2), ['5', '5']);
  assert.deepStrictEqual(E.rellenarAbajo('=B2&"A1"', 0), []);
  assert.deepStrictEqual(E.rellenarAbajo('=SI(A2="A2";1;2)', 1), ['=SI(A3="A2";1;2)']);
});

test('rellenar produce resultados correctos en la hoja', () => {
  const h = hoja({ B2: '1', B3: '2', B4: '3', C2: '10', C3: '20', C4: '30', D2: '=B2+C2' });
  E.rellenarAbajo(h.crudo('D2'), 2).forEach((raw, i) => h.poner('D' + (3 + i), raw));
  assert.strictEqual(h.valor('D3'), 22);
  assert.strictEqual(h.valor('D4'), 33);
});

test('analizar: funciones y referencias usadas', () => {
  const a = E.analizar('=SUMA(B2:B8)+max(A1;3)');
  assert.deepStrictEqual(a.funciones, ['SUMA', 'MAX']);
  assert.strictEqual(a.referencias, 2);
  assert.strictEqual(E.analizar('=5+5').referencias, 0);
  assert.strictEqual(E.analizar('texto').esFormula, false);
  assert.strictEqual(E.analizar('=SUMA(A1,A2)').error, true);
});

test('utilidades de columnas', () => {
  assert.strictEqual(E.colALetra(0), 'A');
  assert.strictEqual(E.colALetra(9), 'J');
  assert.strictEqual(E.colALetra(26), 'AA');
  assert.strictEqual(E.letraACol('C'), 2);
  assert.deepStrictEqual(E.parsearRef('$B$7'), { c: 1, r: 7, absC: true, absR: true });
  assert.strictEqual(E.parsearRef('hola'), null);
});

test('modo señalar: cuándo toca insertar una referencia', () => {
  const si = ['=', '=(', '=SUMA(', '=SUMA(A1;', '=A1+', '=A1-', '=A1*', '=A1/', '=A1^', '=A1<', '=A1>', '=A1=', '=A1<>', '=SI(A1>', '=SUMA( ', '=2*(A1+'];
  for (const t of si) assert.strictEqual(E.puedeInsertarReferencia(t, t.length), true, t);
  const no = ['', 'A1', '=A1', '=SUMA(A1', '=SUMA(A1)', '=SUMA', '="a=', '=SI(A1;"x', '=1,5'];
  for (const t of no) assert.strictEqual(E.puedeInsertarReferencia(t, t.length), false, t);
  assert.strictEqual(E.puedeInsertarReferencia('=SUMA()', 6), true);
  assert.strictEqual(E.puedeInsertarReferencia('=SUMA()', 7), false);
  assert.strictEqual(E.puedeInsertarReferencia('=A1+B1', 4), true);
  assert.strictEqual(E.puedeInsertarReferencia('=A1+B1', 0), false);
});

test('modo señalar: insertar, reemplazar y arrastrar un rango', () => {
  const a = E.insertarReferencia('=SUMA(', 6, 'B3');
  assert.deepStrictEqual(a, { texto: '=SUMA(B3', cursor: 8, inicio: 6, fin: 8 });
  const b = E.insertarReferencia(a.texto, a.cursor, 'C4', { inicio: a.inicio, fin: a.fin });
  assert.strictEqual(b.texto, '=SUMA(C4');
  const c = E.insertarReferencia(b.texto, b.cursor, 'C4:C8', { inicio: b.inicio, fin: b.fin });
  assert.strictEqual(c.texto, '=SUMA(C4:C8');
  assert.strictEqual(c.cursor, 11);
  assert.strictEqual(E.insertarReferencia('=A1', 3, 'B2'), null);
  const medio = E.insertarReferencia('=A1+)', 4, 'B2');
  assert.strictEqual(medio.texto, '=A1+B2)');
  assert.strictEqual(medio.cursor, 6);
  assert.strictEqual(E.insertarReferencia('=1+', 3, 'B2', { inicio: 1, fin: 2 }).texto, '=B2+');
});

test('modo señalar: referencias de la fórmula con sus colores', () => {
  const r = E.escanearReferencias('=SUMA(B2:B8;$A$1)+B2*"A1"+LOG10(3)+c3');
  assert.deepStrictEqual(r.map((x) => x.texto), ['B2:B8', '$A$1', 'B2', 'c3']);
  assert.deepStrictEqual(r.map((x) => x.color), [0, 1, 2, 3]);
  assert.strictEqual(r[0].inicio, 6);
  assert.strictEqual(r[0].fin, 11);
  const rep = E.escanearReferencias('=A1+A1+$A1');
  assert.deepStrictEqual(rep.map((x) => x.color), [0, 0, 0]);
  assert.deepStrictEqual(E.escanearReferencias('texto A1'), []);
  assert.deepStrictEqual(E.escanearReferencias('=SUMA(A1,'), [{ inicio: 6, fin: 8, texto: 'A1', color: 0 }]);
});

test('relleno por arrastre: patrón de una o varias filas', () => {
  assert.deepStrictEqual(E.rellenarPatron(['=A1*$B$1'], 2), ['=A2*$B$1', '=A3*$B$1']);
  assert.deepStrictEqual(E.rellenarPatron(['=A1', '=A2'], 4), ['=A3', '=A4', '=A5', '=A6']);
  assert.deepStrictEqual(E.rellenarPatron(['7'], 2), ['7', '7']);
  assert.deepStrictEqual(E.rellenarPatron([], 2), []);
  assert.deepStrictEqual(E.rellenarPatron(['=B2'], 0), []);
});

test('selección: clic, Mayús+clic, arrastre y Mayús+flechas', () => {
  let s = E.selUna(1, 2);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'B2');
  s = E.seleccionar(s, 1, 6, true);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'B2:B6');
  assert.deepStrictEqual(s.anchor, { c: 1, r: 2 });
  s = E.seleccionar(s, 0, 1, true);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'A1:B2');
  s = E.seleccionar(s, 3, 3, false);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'D3');
  s = E.moverSeleccion(s, 0, 1, true, 5, 10);
  s = E.moverSeleccion(s, 0, 1, true, 5, 10);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'D3:D5');
  s = E.moverSeleccion(s, -1, 0, true, 5, 10);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'C3:D5');
  s = E.moverSeleccion(s, 0, -1, false, 5, 10);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'C4');
  s = E.moverSeleccion(E.selUna(0, 1), -1, -1, false, 5, 10);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'A1');
  s = E.moverSeleccion(E.selUna(4, 10), 1, 1, true, 5, 10);
  assert.strictEqual(E.rangoTexto(E.rectSel(s)), 'E10');
});
