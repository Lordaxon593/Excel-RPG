/* La Escuela: lecciones interactivas sin XP, validables sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./engine.js'), require('./missions.js'));
  else raiz.Escuela = fabrica(raiz.Engine, raiz.Misiones);
})(typeof self !== 'undefined' ? self : this, function (Engine, Misiones) {
  'use strict';

  const { prng, ent, ob } = Misiones;
  const SEMILLA = 7;

  /* Mini-misiones con la misma forma que las misiones: se validan con el mismo motor. */
  const MINI_SUMAR_DOS = {
    id: 'E3-suma', familia: 'abaco', requisitos: [],
    generarDatos(semilla) {
      const rng = prng(semilla, 201);
      const a = ent(rng, 3, 9), b = ent(rng, 3, 9);
      return { cols: 3, filas: 3, celdas: { A1: String(a), B1: String(b) }, v: { a, b } };
    },
    objetivos: [ob('C1', (d) => d.v.a + d.v.b, { usaReferencias: true })]
  };
  const MINI_SUMA = {
    id: 'E4-suma', familia: 'abaco', requisitos: [],
    generarDatos(semilla) {
      const rng = prng(semilla, 202);
      const celdas = {};
      const v = [];
      for (let i = 0; i < 4; i++) { v.push(ent(rng, 5, 30)); celdas['A' + (i + 1)] = String(v[i]); }
      return { cols: 2, filas: 5, celdas, v: { valores: v } };
    },
    objetivos: [ob('A5', (d) => d.v.valores.reduce((s, x) => s + x, 0), { funcion: 'SUMA' })]
  };

  const vacia = (cols, filas) => ({ cols, filas, celdas: {}, editables: [] });

  const LECCIONES = [
    {
      id: 'E1', titulo: 'La hoja',
      texto: 'Una hoja de cálculo es una cuadrícula. Las columnas llevan letras (A, B, C…) y las filas números (1, 2, 3…). Cada casilla es una celda y su nombre une columna y fila: la celda de la columna B y la fila 3 es B3. Al hacer clic en una celda la seleccionas, y su nombre aparece en la barra de fórmulas.',
      ejercicios: [
        { id: 'E1-1', tipo: 'seleccion', objetivo: 'B3', enunciado: 'Haz clic en la celda B3 (columna B, fila 3).', hoja: vacia(5, 6) },
        { id: 'E1-2', tipo: 'seleccion', objetivo: 'D5', enunciado: 'Ahora selecciona la celda D5.', hoja: vacia(5, 6) }
      ]
    },
    {
      id: 'E2', titulo: 'Moverse y seleccionar',
      texto: 'Puedes moverte con las flechas del teclado o con el ratón. Para seleccionar varias celdas, arrastra con el ratón, o haz clic en la primera y Mayús+clic en la última, o usa Mayús+flechas. Un rango se nombra con la primera y la última celda separadas por dos puntos: A1:B5 es el bloque de A1 a B5.',
      ejercicios: [
        { id: 'E2-1', tipo: 'seleccion', objetivo: 'A1:B5', enunciado: 'Selecciona el rango A1:B5: clic en A1 y arrastra hasta B5 (o Mayús+clic en B5).', hoja: vacia(4, 6) },
        { id: 'E2-2', tipo: 'seleccion', objetivo: 'C2:C6', enunciado: 'Selecciona el rango C2:C6. Prueba con Mayús+flechas.', hoja: vacia(4, 7) }
      ]
    },
    {
      id: 'E3', titulo: 'Escribir datos y fórmulas',
      texto: 'Selecciona una celda y escribe: Enter confirma y baja, Esc cancela. Un número con decimales lleva coma: 2,5. Si lo escrito empieza por =, es una fórmula y Excel calcula: =A1+B1 suma el contenido de A1 y B1. Mientras escribes una fórmula, un clic en otra celda inserta su nombre (modo señalar), sin teclearlo.',
      ejercicios: [
        { id: 'E3-1', tipo: 'escribir', celda: 'B2', esperado: 2.5, enunciado: 'Escribe el número 2,5 en la celda B2 y pulsa Enter. Los decimales llevan coma.', hoja: { cols: 3, filas: 3, celdas: {}, editables: ['B2'] } },
        { id: 'E3-2', tipo: 'formula', mini: MINI_SUMAR_DOS, enunciado: 'En C1 escribe una fórmula que sume A1 y B1. Empieza por = y prueba el modo señalar: tras el = haz clic en A1, escribe + y haz clic en B1.' }
      ]
    },
    {
      id: 'E4', titulo: 'Funciones',
      texto: 'Una función es una operación que Excel ya sabe hacer. Se escribe con su nombre, un paréntesis y los argumentos, separados por punto y coma (;). Un rango puede ser un argumento. Por ejemplo, SUMA suma todo lo que le des: =SUMA(A1:A4) suma de A1 a A4. Ojo: en Excel en español el separador de argumentos es ;, no la coma.',
      ejercicios: [
        { id: 'E4-1', tipo: 'formula', mini: MINI_SUMA, enunciado: 'En A5 calcula la suma de los cuatro números de A1 a A4 con la función SUMA.' }
      ]
    }
  ];

  const todos = LECCIONES.reduce((a, l) => a.concat(l.ejercicios.map((e) => Object.assign({ leccion: l.id }, e))), []);
  const ejercicio = (id) => todos.find((e) => e.id === id) || null;
  const leccion = (id) => LECCIONES.find((l) => l.id === id) || null;

  /* Hoja a mostrar en un ejercicio: {cols, filas, celdas, editables}. */
  function hojaEjercicio(ej) {
    if (ej.tipo === 'formula') {
      const d = ej.mini.generarDatos(SEMILLA);
      return { cols: d.cols, filas: d.filas, celdas: d.celdas, editables: ej.mini.objetivos.map((o) => o.celda) };
    }
    return ej.hoja;
  }

  /* ctx = { sel: {c1,c2,r1,r2}, celdas: {ref: texto} } → { ok, mensaje } */
  function evaluarEjercicio(ej, ctx) {
    ctx = ctx || {};
    if (ej.tipo === 'seleccion') {
      const sel = ctx.sel ? Engine.rangoTexto(ctx.sel) : '';
      if (sel === ej.objetivo) return { ok: true, mensaje: '¡Bien! Has seleccionado ' + ej.objetivo + '.' };
      return { ok: false, mensaje: sel ? `Ahora tienes seleccionado ${sel}. Fíjate en las letras de las columnas y en los números de las filas.` : 'Todavía no has seleccionado nada.' };
    }
    if (ej.tipo === 'escribir') {
      const raw = (ctx.celdas || {})[ej.celda];
      if (raw === undefined || String(raw).trim() === '') return { ok: false, mensaje: `Escribe el dato en ${ej.celda} y pulsa Enter.` };
      const v = Engine.interpretar(raw);
      if (v === ej.esperado) return { ok: true, mensaje: '¡Correcto!' };
      if (typeof v === 'string') return { ok: false, mensaje: `En ${ej.celda} hay texto, y aquí hace falta un número. ¿Has usado la coma como separador decimal?` };
      return { ok: false, mensaje: `El número escrito en ${ej.celda} no es el que se pide.` };
    }
    if (ej.tipo === 'formula') {
      const r = Misiones.validar(ej.mini, ctx.celdas || {}, SEMILLA);
      return { ok: r.ok, mensaje: r.ok ? '¡Correcto! La fórmula se adapta a otros datos.' : r.mensajes.join(' ') };
    }
    return { ok: false, mensaje: 'Ejercicio desconocido.' };
  }

  const MAX_PALABRAS = 80;
  return { LECCIONES, ejercicios: todos, ejercicio, leccion, hojaEjercicio, evaluarEjercicio, MAX_PALABRAS, SEMILLA };
});
