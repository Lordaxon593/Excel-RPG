/* Equipo, maestría y misiones de práctica (plantillas generadas por semilla). Sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./missions.js'));
  else raiz.Practicas = fabrica(raiz.Misiones);
})(typeof self !== 'undefined' ? self : this, function (Misiones) {
  'use strict';

  const { prng, ent, ob, obRango } = Misiones;

  /* ---------- Objetos de equipo ---------- */
  const OBJETOS = [
    { id: 'abaco', nombre: 'Ábaco', icono: '🧮', familia: 'cálculo', stat: 'finanzas', lugar: 'en el Almacén', tarea: 'prácticas de cálculo' },
    { id: 'compas', nombre: 'Compás', icono: '🧭', familia: 'moverse por la hoja', stat: 'productividad', lugar: 'en la Granja', tarea: 'prácticas de referencias y rellenado' },
    { id: 'balanza', nombre: 'Balanza', icono: '⚖', familia: 'lógica', stat: 'logica', lugar: 'en la Oficina del capataz', tarea: 'prácticas de lógica (SI)' },
    { id: 'pincel', nombre: 'Pincel', icono: '🖌', familia: 'gráficos', stat: 'analisis', lugar: 'en el Tablón de la aldea', tarea: 'prácticas de gráficos' }
  ];
  const NIVELES = ['madera', 'piedra', 'cobre', 'bronce', 'plata', 'oro'];
  const UMBRALES = [0, 4, 10, 16, 24, 34];
  const NIVEL_MAX = 3; // bronce: plata y oro están definidos pero son «Próximamente»
  const MAX_REPETICIONES = 3;
  const PUNTOS = { conPistas: 1, sinPistas: 2 };
  const ORO_PRACTICA = 5;

  const objeto = (id) => OBJETOS.find((o) => o.id === id) || null;

  function nivelDePuntos(pts) {
    let n = 0;
    UMBRALES.forEach((u, i) => { if (pts >= u) n = i; });
    return Math.min(n, NIVEL_MAX);
  }

  function infoObjeto(id, puntos) {
    const o = objeto(id);
    const pts = puntos || 0;
    const nivel = nivelDePuntos(pts);
    const tope = nivel >= NIVEL_MAX;
    const base = UMBRALES[nivel];
    const sig = tope ? null : UMBRALES[nivel + 1];
    const llenos = tope ? 10 : Math.floor(((pts - base) / (sig - base)) * 10);
    return {
      id, nombre: o.nombre, icono: o.icono, stat: o.stat, puntos: pts,
      nivel, nombreNivel: NIVELES[nivel], bono: nivel,
      siguiente: sig, siguienteNombre: tope ? null : NIVELES[nivel + 1],
      barra: `[${'#'.repeat(llenos)}${'-'.repeat(10 - llenos)}] ${tope ? pts + ' (nivel máximo por ahora)' : pts + '/' + sig}`,
      proximamente: tope ? 'Próximamente: plata y oro' : '',
      consejo: tope ? `Tu ${o.nombre} ya está en bronce. Plata y oro llegarán con más contenido.` : `Para subir tu ${o.nombre}, completa ${o.tarea} ${o.lugar}.`
    };
  }

  /* ---------- Plantillas de práctica ---------- */
  const NOMBRES_TABLA = (prefijo, n) => Array.from({ length: n }, (_, i) => `${prefijo} ${i + 1}`);

  function tabla(rng, cab, filas, nombres, min, max) {
    const celdas = { A1: cab[0], B1: cab[1] };
    const v = [];
    for (let i = 0; i < filas; i++) {
      v.push(ent(rng, min, max));
      celdas['A' + (i + 2)] = nombres[i];
      celdas['B' + (i + 2)] = String(v[i]);
    }
    return { celdas, v };
  }

  const sum = (a) => a.reduce((s, x) => s + x, 0);

  const A1 = {
    id: 'P-A1', familia: 'abaco', titulo: 'Las hogazas de la semana', desbloqueo: 'M1', negocio: 'almacen',
    texto: ['La panadera anota las hogazas que vende cada día. Necesita saber cuántas vendió en toda la semana.'],
    queHacer: ['B9: el total de hogazas de la semana.'],
    generarDatos(semilla) {
      const t = tabla(prng(semilla, 301), ['Día', 'Hogazas'], 7, Misiones.DIAS, 10, 60);
      t.celdas.A9 = 'Total';
      return { cols: 2, filas: 9, celdas: t.celdas, v: { val: t.v } };
    },
    objetivos: [ob('B9', (d) => sum(d.v.val), { funcion: 'SUMA' }, { entero: true })],
    pistas: ['Quieres juntar todas las ventas en un único total.', 'Usa la función SUMA sobre el rango de las hogazas, de lunes a domingo.', 'Estructura: =SUMA(primera:última) con las celdas de la columna de hogazas.'],
    pista2Contiene: ['SUMA']
  };

  const A2 = {
    id: 'P-A2', familia: 'abaco', titulo: 'La media del herrero', desbloqueo: 'M4', negocio: 'almacen',
    texto: ['El herrero entrega clavos en pedidos de distinto tamaño y los guarda en cajas de capacidad fija. Quiere la media por pedido y cuántas cajas llenaría con esa media.'],
    queHacer: ['B11: la media de clavos por pedido.', 'B12: las cajas completas que se llenarían con esa media (solo cajas enteras).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 302);
      const t = tabla(rng, ['Pedido', 'Clavos'], 6, NOMBRES_TABLA('Pedido', 6), 20, 90);
      const caja = ent(rng, 6, 12);
      Object.assign(t.celdas, { A9: 'Clavos por caja', B9: String(caja), A11: 'Media de clavos por pedido', A12: 'Cajas completas con la media' });
      return { cols: 2, filas: 12, celdas: t.celdas, v: { val: t.v, caja } };
    },
    objetivos: [
      ob('B11', (d) => sum(d.v.val) / d.v.val.length, { funcion: 'PROMEDIO' }),
      ob('B12', (d) => Math.floor(sum(d.v.val) / d.v.val.length / d.v.caja), { funcion: 'ENTERO', usaReferencias: true }, { entero: true })
    ],
    pistas: ['Primero la media de los pedidos; después cuántas veces cabe la caja en esa media, contando solo cajas enteras.', 'Usa PROMEDIO para la media y ENTERO para quedarte con las cajas completas de la división.', 'B11: =PROMEDIO(rango de clavos). B12: =ENTERO(celda de la media / celda de clavos por caja).'],
    pista2Contiene: ['PROMEDIO', 'ENTERO']
  };

  const A3 = {
    id: 'P-A3', familia: 'abaco', titulo: 'El taller de Hilda', desbloqueo: 'M5', negocio: 'capataz',
    texto: ['Hilda cronometra cuántos minutos tarda en hacer cada pieza. Quiere saber la más lenta, la más rápida y cuántas piezas ha medido.'],
    queHacer: ['B9: el tiempo de la pieza más lenta.', 'B10: el tiempo de la pieza más rápida.', 'B11: el número de piezas medidas.'],
    generarDatos(semilla) {
      const t = tabla(prng(semilla, 303), ['Pieza', 'Minutos'], 6, NOMBRES_TABLA('Pieza', 6), 15, 95);
      Object.assign(t.celdas, { A9: 'Más lenta (min)', A10: 'Más rápida (min)', A11: 'Nº de piezas' });
      return { cols: 2, filas: 11, celdas: t.celdas, v: { val: t.v } };
    },
    objetivos: [
      ob('B9', (d) => Math.max(...d.v.val), { funcion: 'MAX' }),
      ob('B10', (d) => Math.min(...d.v.val), { funcion: 'MIN' }),
      ob('B11', (d) => d.v.val.length, { funcion: 'CONTAR' }, { entero: true })
    ],
    pistas: ['Necesitas el valor más alto, el más bajo y un recuento del rango de minutos.', 'Las funciones son MAX, MIN y CONTAR, cada una sobre la columna de minutos.', 'Estructura: =MAX(rango), =MIN(rango) y =CONTAR(rango) con el mismo rango de minutos.'],
    pista2Contiene: ['MAX', 'MIN', 'CONTAR']
  };

  const NOMBRES_ALDEANOS = ['Aldo', 'Brunilda', 'Cosme', 'Dora', 'Elías'];
  const C1 = {
    id: 'P-C1', familia: 'compas', titulo: 'Los tributos', desbloqueo: 'M2', negocio: 'granja',
    texto: ['Cada aldeano entrega una cantidad de sacos a un precio por saco. Aldric quiere el total de cada uno y la recaudación de todos.'],
    queHacer: ['D2:D6: el total de cada aldeano (cantidad por precio). Escribe la primera y rellena hacia abajo.', 'D8: la recaudación total.'],
    generarDatos(semilla) {
      const rng = prng(semilla, 304);
      const celdas = { A1: 'Aldeano', B1: 'Cantidad', C1: 'Precio', D1: 'Total', A8: 'Recaudación' };
      const cant = [], precio = [];
      NOMBRES_ALDEANOS.forEach((n, i) => {
        cant.push(ent(rng, 2, 9));
        precio.push(ent(rng, 3, 12));
        celdas['A' + (i + 2)] = n;
        celdas['B' + (i + 2)] = String(cant[i]);
        celdas['C' + (i + 2)] = String(precio[i]);
      });
      return { cols: 4, filas: 8, celdas, v: { cant, precio } };
    },
    objetivos: [].concat(
      obRango('D', 2, 6, (d, k) => d.v.cant[k] * d.v.precio[k], { usaReferencias: true }, { entero: true }),
      [ob('D8', (d) => sum(d.v.cant.map((c, k) => c * d.v.precio[k])), { funcion: 'SUMA', usaReferencias: true }, { entero: true })]
    ),
    pistas: ['Cada total es una multiplicación; la recaudación junta todos los totales.', 'Usa el operador * en la primera fila y rellena hacia abajo; para la recaudación, la función SUMA.', 'D2: celda de cantidad * celda de precio, y rellenar D2:D6. D8: =SUMA(rango de totales).'],
    pista2Contiene: ['*', 'SUMA']
  };

  const NOMBRES_PROD = ['Pan', 'Queso', 'Vino', 'Aceite', 'Sal', 'Miel'];
  const VARIANTES_RECARGO = [{ b: [10, 20, 5, 30, 15, 25], g: 3 }, { b: [40, 7, 12, 33, 18, 22], g: 8 }];
  function datosRecargo(b, g) {
    const celdas = { A1: 'Producto', B1: 'Precio base', C1: 'Precio final', F1: 'Recargo', G1: String(g) };
    b.forEach((x, i) => { celdas['A' + (i + 2)] = NOMBRES_PROD[i]; celdas['B' + (i + 2)] = String(x); });
    return { cols: 7, filas: 7, celdas, v: { b: b.slice(), g } };
  }
  const C2 = {
    id: 'P-C2', familia: 'compas', titulo: 'El recargo del mercader', desbloqueo: 'M6', negocio: 'granja',
    texto: ['El mercader suma el mismo recargo, anotado en una celda, al precio de cada producto.'],
    queHacer: ['C2:C7: el precio final de cada producto (precio base más el recargo de G1).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 305);
      const b = [];
      for (let i = 0; i < 6; i++) b.push(ent(rng, 5, 40));
      return datosRecargo(b, ent(rng, 2, 9));
    },
    variantes: () => VARIANTES_RECARGO.map((x) => datosRecargo(x.b, x.g)),
    objetivos: obRango('C', 2, 7, (d, k) => d.v.b[k] + d.v.g, { usaReferencias: true, apuntaA: 'G1' }, { entero: true, ayuda: 'Piensa qué pasa con la referencia al recargo cuando rellenas hacia abajo (mira la pista 2).' }),
    pistas: ['El recargo es una única celda que todos los productos comparten.', 'Suma el recargo al precio base y fija la referencia del recargo con el símbolo $ para que no se mueva al rellenar.', 'Primera fila: celda del precio base + celda del recargo con $ en la columna y en la fila; después rellena hacia abajo.'],
    pista2Contiene: ['$']
  };

  const NOMBRES_ALUMNOS = ['Ana', 'Luis', 'Eva', 'Pío', 'Rut', 'Tomás'];
  const B1 = {
    id: 'P-B1', familia: 'balanza', titulo: 'Aprobados y suspensos', desbloqueo: 'M7', negocio: 'capataz',
    texto: ['El maestro de la aldea anota las notas de sus alumnos. Con 5 o más aprueban.'],
    queHacer: ['C2:C7: «APROBADO» si la nota es 5 o más y «SUSPENDIDO» si es menor.'],
    generarDatos(semilla) {
      const t = tabla(prng(semilla, 306), ['Alumno', 'Nota'], 6, NOMBRES_ALUMNOS, 0, 10);
      t.celdas.C1 = 'Resultado';
      return { cols: 3, filas: 7, celdas: t.celdas, v: { val: t.v } };
    },
    objetivos: obRango('C', 2, 7, (d, k) => (d.v.val[k] >= 5 ? 'APROBADO' : 'SUSPENDIDO'), { funcion: 'SI', usaReferencias: true }, { textoFlexible: true }),
    pistas: ['Cada alumno tiene una decisión: o aprueba o suspende.', 'Usa la función SI con una comparación sobre la nota; los textos van entre comillas dobles.', 'Estructura: =SI(celda de la nota >= 5; "APROBADO"; "SUSPENDIDO") y rellena hacia abajo.'],
    pista2Contiene: ['SI']
  };

  const VARIANTES_LIMITE = [{ b: [20, 21, 22, 19, 25, 40], g: 21 }, { b: [38, 39, 40, 41, 30, 59], g: 39 }];
  function datosLimite(b, g) {
    const celdas = { A1: 'Pedido', B1: 'Sacos', C1: 'Tamaño', F1: 'Límite (sacos)', G1: String(g) };
    b.forEach((x, i) => { celdas['A' + (i + 2)] = 'Pedido ' + (i + 1); celdas['B' + (i + 2)] = String(x); });
    return { cols: 7, filas: 7, celdas, v: { b: b.slice(), g } };
  }
  const B2 = {
    id: 'P-B2', familia: 'balanza', titulo: 'Pedidos grandes', desbloqueo: 'M7', negocio: 'capataz',
    texto: ['El capataz clasifica los pedidos: son grandes si superan un límite que está anotado en una celda.'],
    queHacer: ['C2:C7: «GRANDE» si los sacos superan el límite de G1 y «PEQUEÑO» si no (un pedido igual al límite es pequeño).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 307);
      const b = [];
      for (let i = 0; i < 6; i++) b.push(ent(rng, 5, 60));
      return datosLimite(b, ent(rng, 20, 40));
    },
    variantes: () => VARIANTES_LIMITE.map((x) => datosLimite(x.b, x.g)),
    objetivos: obRango('C', 2, 7, (d, k) => (d.v.b[k] > d.v.g ? 'GRANDE' : 'PEQUEÑO'), { funcion: 'SI', usaReferencias: true }, { textoFlexible: true, ayuda: 'Piensa qué pasa con la referencia al límite cuando rellenas hacia abajo (mira la pista 2).' }),
    pistas: ['Cada pedido se compara con un mismo límite compartido.', 'Usa la función SI comparando los sacos con el límite, que debe quedar fijo con $ al rellenar hacia abajo.', 'Estructura: =SI(celda de sacos > celda del límite con $; "GRANDE"; "PEQUEÑO") y rellena hacia abajo.'],
    pista2Contiene: ['SI', '$']
  };

  function datosGrafico(rng, cab, etiquetas, min, max, distintos) {
    const celdas = { A1: cab[0], B1: cab[1] };
    const usados = new Set();
    const valores = [];
    etiquetas.forEach((e, i) => {
      let v;
      do { v = ent(rng, min, max); } while (distintos && usados.has(v));
      usados.add(v);
      valores.push(v);
      celdas['A' + (i + 2)] = e;
      celdas['B' + (i + 2)] = String(v);
    });
    return { cols: 2, filas: etiquetas.length + 1, celdas, v: { valores } };
  }
  const P1 = {
    id: 'P-P1', familia: 'pincel', titulo: 'El mercado', desbloqueo: 'M8', negocio: 'tablon',
    texto: ['Cada puesto del mercado anota sus ventas de la semana. Aldric quiere un gráfico para comparar los puestos.'],
    queHacer: ['Crea un gráfico que compare las ventas de los cinco puestos: rango de datos, tipo adecuado y un título de al menos 5 caracteres.'],
    grafico: { rango: 'A1:B6', tipo: 'columnas', msgTipo: { 'líneas': 'Las líneas sirven para ver la evolución en el tiempo; aquí comparas puestos, y para eso van mejor las columnas.' } },
    generarDatos(semilla) { return datosGrafico(prng(semilla, 308), ['Puesto', 'Ventas'], ['Pan', 'Queso', 'Vino', 'Paño', 'Cera'], 20, 300, true); },
    objetivos: [],
    pistas: ['Piensa qué datos entran en el gráfico, encabezados incluidos.', 'Elige el rango de los encabezados y todos los datos, y el tipo columnas para comparar categorías.', 'Rango CELDA:CELDA de la esquina superior izquierda a la inferior derecha, tipo columnas y un título descriptivo.'],
    pista2Contiene: ['columnas']
  };
  const P2 = {
    id: 'P-P2', familia: 'pincel', titulo: 'La cosecha mes a mes', desbloqueo: 'M8', negocio: 'tablon',
    texto: ['Aldric apunta lo cosechado cada mes. Quiere ver cómo evoluciona a lo largo del tiempo.'],
    queHacer: ['Crea un gráfico que muestre cómo evoluciona la cosecha mes a mes: rango de datos, tipo adecuado y un título de al menos 5 caracteres.'],
    grafico: { rango: 'A1:B7', tipo: 'líneas', msgTipo: { columnas: 'Las columnas comparan categorías; para ver cómo cambia algo mes a mes van mejor las líneas.' } },
    generarDatos(semilla) { return datosGrafico(prng(semilla, 309), ['Mes', 'Cosecha (kg)'], ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], 40, 400, false); },
    objetivos: [],
    pistas: ['Quieres ver una evolución en el tiempo, no comparar categorías.', 'Elige el rango de encabezados y datos y el tipo líneas, que une los puntos mes a mes.', 'Rango CELDA:CELDA de la esquina superior izquierda a la inferior derecha, tipo líneas y un título descriptivo.'],
    pista2Contiene: ['líneas']
  };

  const PLANTILLAS = [A1, A2, A3, C1, C2, B1, B2, P1, P2];
  PLANTILLAS.forEach((p) => Object.assign(p, {
    tipo: 'secundaria', entorno: 'aldea', requisitos: [], maxRepeticiones: MAX_REPETICIONES,
    dificultad: 'Práctica', xp: 0, oro: ORO_PRACTICA, stats: {}, etiquetas: [],
    consecuencia: { texto: () => '' }, aplicarAldea() {}
  }));

  const plantilla = (id) => PLANTILLAS.find((p) => p.id === id) || null;
  const indice = (id) => PLANTILLAS.findIndex((p) => p.id === id);
  /* Cada repetición usa una semilla distinta, y por tanto datos distintos. */
  const semillaPractica = (semillaPartida, id, rep) => semillaPartida + 997 * (indice(id) + 1) + 131 * rep;

  return {
    OBJETOS, NIVELES, UMBRALES, NIVEL_MAX, MAX_REPETICIONES, PUNTOS, ORO_PRACTICA, PLANTILLAS,
    objeto, nivelDePuntos, infoObjeto, plantilla, semillaPractica
  };
});
