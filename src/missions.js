/* Datos y validadores de las 7 misiones. Sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./engine.js'));
  else raiz.Misiones = fabrica(raiz.Engine);
})(typeof self !== 'undefined' ? self : this, function (Engine) {
  'use strict';

  /* ---------- PRNG determinista ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const prng = (semilla, n) => mulberry32((semilla + n * 7919) >>> 0);
  const ent = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  /* ---------- Códice (competencias de Excel) ---------- */
  const CODICE = [
    ['formulas.entrada', 'Entrada de fórmulas (empezar por =)'],
    ['rangos', 'Rangos de celdas (A1:B5)'],
    ['funcion.suma', 'Función SUMA'],
    ['ref.relativa', 'Referencias relativas'],
    ['rellenar', 'Rellenar hacia abajo'],
    ['operadores', 'Operadores + − × ÷'],
    ['ref.celda', 'Referencias de celda'],
    ['decimales', 'Números decimales'],
    ['funcion.promedio', 'Función PROMEDIO'],
    ['funcion.entero', 'Función ENTERO'],
    ['error.div0', 'Error #DIV/0!'],
    ['funcion.max', 'Función MAX'],
    ['funcion.min', 'Función MIN'],
    ['funcion.contar', 'Función CONTAR'],
    ['ratios', 'Ratios entre columnas'],
    ['ref.absoluta', 'Referencias absolutas ($)'],
    ['funcion.si', 'Función SI'],
    ['comparaciones', 'Comparaciones y texto'],
    ['grafico.rango', 'Gráficos: elegir el rango'],
    ['grafico.tipo', 'Gráficos: elegir el tipo'],
    ['grafico.titulo', 'Gráficos: poner título']
  ].map(([id, nombre]) => ({ id, nombre, moduloPlan: '' }));

  const TUTORIAL = [
    { titulo: 'Qué es una celda', texto: 'La hoja es una cuadrícula. Cada casilla es una celda y tiene un nombre formado por su columna (letra) y su fila (número): B9 es la columna B, fila 9. Haz clic en una celda para seleccionarla y escribe para rellenarla.' },
    { titulo: 'Las fórmulas empiezan por =', texto: 'Si escribes un texto o un número, la celda lo guarda tal cual. Si empiezas por =, Excel calcula: =2+3 muestra 5, y =B2+B3 suma lo que haya en esas dos celdas. Así el resultado se actualiza solo cuando cambian los datos.' },
    { titulo: 'El separador es ;', texto: 'Excel en español separa los argumentos de una función con punto y coma (;), y usa la coma para los decimales: 1,5. Por ejemplo, SI(B2>3;"sí";"no"). Un rango se escribe con dos puntos: B2:B8.' },
    { titulo: 'Cómo se entrega', texto: 'Cuando creas que la hoja está lista, pulsa «Entregar al mayordomo». Maese Aldric revisará tu trabajo con los datos de hoy y con otros datos distintos, para comprobar que tus fórmulas sirven siempre. Fallar no cuesta nada: puedes volver a intentarlo y pedir pistas.' }
  ];

  /* ---------- Utilidades de misiones ---------- */
  const col = (c) => Engine.colALetra(c);
  const rangoFilas = (letra, desde, hasta) => {
    const r = [];
    for (let i = desde; i <= hasta; i++) r.push(letra + i);
    return r;
  };
  const num = (s) => parseFloat(String(s).replace(',', '.'));

  function ob(celda, esperado, requisitos, extra) {
    return Object.assign({ celda, grupo: celda, esperado, requisitos: requisitos || {} }, extra || {});
  }
  function obRango(letra, desde, hasta, esperadoFila, requisitos, extra) {
    return rangoFilas(letra, desde, hasta).map((celda, k) =>
      ob(celda, (d) => esperadoFila(d, k), requisitos, Object.assign({ grupo: `${letra}${desde}:${letra}${hasta}` }, extra || {})));
  }

  /* ---------- Misiones ---------- */
  const M1 = {
    id: 'M1', titulo: 'Lo que hay en el campo', dificultad: 'Fácil', xp: 25, oro: 10,
    stats: { logica: 1 },
    etiquetas: ['formulas.entrada', 'rangos', 'funcion.suma'],
    texto: [
      'Maese Aldric te recibe junto al campo de trigo. «Aprendiz, el clan necesita un almacén, pero antes debo saber cuánto trigo cosechamos. Tomás ha anotado lo recogido cada día de la semana.»'
    ],
    queHacer: ['B9: el total de trigo recogido en la semana (de lunes a domingo).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 1);
      const celdas = { A1: 'Día', B1: 'Trigo (kg)', A9: 'Total' };
      const trigo = [];
      for (let i = 0; i < 7; i++) {
        const v = ent(rng, 18, 42);
        trigo.push(v);
        celdas['A' + (i + 2)] = DIAS[i];
        celdas['B' + (i + 2)] = String(v);
      }
      return { cols: 2, filas: 9, celdas, v: { trigo } };
    },
    objetivos: [ob('B9', (d) => d.v.trigo.reduce((s, x) => s + x, 0), { funcion: 'SUMA' })],
    pistas: [
      'Aldric quiere el total de la semana. Piensa qué operación junta muchos números en uno solo.',
      'Excel tiene una función para sumar muchos valores a la vez. Se escribe tras el signo = con su nombre en español y, entre paréntesis, lo que quieres sumar.',
      'La estructura es =FUNCIÓN(primera_celda:última_celda): los dos puntos indican el rango de la columna del trigo, del lunes al domingo.'
    ],
    consecuencia: {
      texto: (d) => `Se construye el almacén del clan. El stock de trigo de la aldea pasa a ser ${d.v.trigo.reduce((s, x) => s + x, 0)} kg.`
    },
    aplicarAldea(a, d) {
      a.trigo = d.v.trigo.reduce((s, x) => s + x, 0);
      a.edificios.push('Almacén');
    }
  };

  const M2 = {
    id: 'M2', titulo: 'Las tres gallineras', dificultad: 'Fácil', xp: 25, oro: 10,
    stats: { productividad: 1 },
    etiquetas: ['ref.relativa', 'rellenar'],
    texto: [
      'Tomás te lleva a las gallineras. «Tenemos tres y cada una pone lo suyo. Anoto los huevos cada día, pero sumar cada fila a mano me lleva horas.»',
      'Aquí aprenderás a «Rellenar hacia abajo»: escribe una fórmula, selecciona la columna entera y deja que Excel la copie ajustando las filas (Ctrl+D).'
    ],
    queHacer: ['E2:E6: el total de huevos de cada día (suma de los tres gallineros de esa fila).', 'E7: el total de huevos de la semana.'],
    generarDatos(semilla) {
      const rng = prng(semilla, 2);
      const celdas = { A1: 'Día', B1: 'Gallinero 1', C1: 'Gallinero 2', D1: 'Gallinero 3', E1: 'Total del día', A7: 'Total semana' };
      const filas = [];
      for (let i = 0; i < 5; i++) {
        const f = [ent(rng, 4, 15), ent(rng, 4, 15), ent(rng, 4, 15)];
        filas.push(f);
        celdas['A' + (i + 2)] = DIAS[i];
        ['B', 'C', 'D'].forEach((l, k) => { celdas[l + (i + 2)] = String(f[k]); });
      }
      return { cols: 5, filas: 7, celdas, v: { filas } };
    },
    objetivos: [].concat(
      obRango('E', 2, 6, (d, k) => d.v.filas[k].reduce((s, x) => s + x, 0), { usaReferencias: true, funcion: 'SUMA' }),
      [ob('E7', (d) => d.v.filas.reduce((s, f) => s + f[0] + f[1] + f[2], 0), { usaReferencias: true })]
    ),
    pistas: [
      'Cada día necesitas juntar los huevos de las tres gallineras. Resuélvelo para un solo día y después repítelo para el resto sin escribir cinco fórmulas a mano.',
      'Para cada fila usa la función de sumar sobre las tres celdas de esa fila. Luego selecciona de arriba abajo las celdas del total diario y pulsa «Rellenar hacia abajo» (Ctrl+D).',
      'Estructura: =FUNCIÓN(primera:última) con las tres celdas de la primera fila; al rellenar, Excel desplaza solo la fila. El total de la semana suma la columna de totales diarios.'
    ],
    consecuencia: {
      texto: (d) => `Los huevos entran al almacén: ${d.v.filas.reduce((s, f) => s + f[0] + f[1] + f[2], 0)} esta semana. Has dominado «Rellenar hacia abajo».`
    },
    aplicarAldea(a, d) {
      a.huevos = d.v.filas.reduce((s, f) => s + f[0] + f[1] + f[2], 0);
      a.edificios.push('Gallineros');
    }
  };

  const M3 = {
    id: 'M3', titulo: 'Las bocas del pueblo', dificultad: 'Normal', xp: 50, oro: 20,
    stats: { logica: 1, finanzas: 1 },
    etiquetas: ['operadores', 'ref.celda', 'decimales'],
    texto: [
      'Tomás frunce el ceño ante los sacos. «Todos comen cada día y el trigo no es infinito. Necesito saber cuánto sale del almacén diariamente y cuánto queda después.»'
    ],
    queHacer: ['B6: el consumo diario de trigo de toda la aldea (kg).', 'B7: el stock de trigo que queda tras el consumo de hoy (kg).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 3);
      const stock = ent(rng, 250, 400);
      const personas = ent(rng, 12, 18);
      const celdas = {
        A1: 'Concepto', B1: 'Valor',
        A2: 'Stock de trigo (kg)', B2: String(stock),
        A3: 'Personas', B3: String(personas),
        A4: 'Ración por persona (kg/día)', B4: '1,5',
        A6: 'Consumo diario (kg)', A7: 'Stock tras hoy (kg)'
      };
      return { cols: 2, filas: 7, celdas, v: { stock, personas, racion: 1.5 } };
    },
    objetivos: [
      ob('B6', (d) => d.v.personas * d.v.racion, { usaReferencias: true }),
      ob('B7', (d) => d.v.stock - d.v.personas * d.v.racion, { usaReferencias: true })
    ],
    pistas: [
      'El consumo diario depende de cuántas personas hay y de cuánto come cada una. El stock restante es lo que había menos lo que se gasta hoy.',
      'No hace falta ninguna función: bastan los operadores (* para multiplicar, - para restar) y referencias a las celdas de la tabla. No escribas los números, apunta a sus celdas.',
      'Consumo: celda de personas multiplicada por celda de ración. Stock tras hoy: celda de stock menos la celda de consumo que acabas de calcular.'
    ],
    consecuencia: {
      texto: (d) => `Tomás saca la comida cada día: ${d.v.personas * d.v.racion} kg. El stock de trigo de la aldea baja en esa cantidad.`
    },
    aplicarAldea(a, d) {
      a.trigo = Math.max(0, a.trigo - d.v.personas * d.v.racion);
    }
  };

  const M4 = {
    id: 'M4', titulo: '¿Para cuántos días alcanza?', dificultad: 'Normal', xp: 50, oro: 20,
    stats: { analisis: 1 },
    etiquetas: ['funcion.promedio', 'funcion.entero', 'error.div0'],
    texto: [
      'Maese Aldric despliega el pergamino de cuentas. «Quiero saber si podemos acoger más colonos. Necesito la producción media diaria, los días que aguantamos con las reservas y si cada día ganamos o perdemos trigo.»',
      'Ojo: si el consumo diario fuera 0, dividir entre él daría el error #DIV/0!, porque Excel no puede dividir entre cero.'
    ],
    queHacer: [
      'B13: la producción media diaria de trigo (media de la semana).',
      'B14: los días completos de reserva (parte entera de stock ÷ consumo diario).',
      'B15: el balance diario en kg (producción media menos consumo diario).'
    ],
    generarDatos(semilla) {
      const rng = prng(semilla, 4);
      const celdas = { A1: 'Día', B1: 'Trigo (kg)', A10: 'Stock (kg)', A11: 'Consumo diario (kg)', A13: 'Producción media diaria', A14: 'Días de reserva', A15: 'Balance diario (kg)' };
      const trigo = [];
      for (let i = 0; i < 7; i++) {
        const v = ent(rng, 18, 42);
        trigo.push(v);
        celdas['A' + (i + 2)] = DIAS[i];
        celdas['B' + (i + 2)] = String(v);
      }
      const stock = ent(rng, 200, 350);
      const consumo = ent(rng, 18, 30);
      celdas.B10 = String(stock);
      celdas.B11 = String(consumo);
      return { cols: 2, filas: 15, celdas, v: { trigo, stock, consumo } };
    },
    objetivos: [
      ob('B13', (d) => d.v.trigo.reduce((s, x) => s + x, 0) / d.v.trigo.length, { funcion: 'PROMEDIO' }),
      ob('B14', (d) => Math.floor(d.v.stock / d.v.consumo), { funcion: 'ENTERO' }),
      ob('B15', (d) => d.v.trigo.reduce((s, x) => s + x, 0) / d.v.trigo.length - d.v.consumo, { usaReferencias: true })
    ],
    pistas: [
      'Son tres cálculos: la media de lo que se produce al día, cuántos días completos aguanta el stock y si cada día se gana o se pierde trigo.',
      'Para la producción usa la función que calcula la media. Para los días, divide stock entre consumo y quédate solo con la parte entera con la función adecuada. El balance es una resta.',
      'Media: =FUNCIÓN(rango de la semana). Días: =FUNCIÓN(celda de stock / celda de consumo). Balance: celda de la media menos celda del consumo.'
    ],
    consecuencia: {
      texto: (d) => {
        const c = colonos(d);
        return c > 0
          ? `Maese Aldric conoce ya cuánto aguantará la aldea (${Math.floor(d.v.stock / d.v.consumo)} días) y decide acoger a ${c} colono${c === 1 ? '' : 's'} más.`
          : `Maese Aldric conoce ya cuánto aguantará la aldea (${Math.floor(d.v.stock / d.v.consumo)} días), pero el balance no permite acoger más colonos.`;
      }
    },
    aplicarAldea(a, d) { a.poblacion += colonos(d); }
  };
  function colonos(d) {
    const balance = d.v.trigo.reduce((s, x) => s + x, 0) / d.v.trigo.length - d.v.consumo;
    return Math.max(0, Math.min(5, Math.floor(balance / 1.5)));
  }

  const M5 = {
    id: 'M5', titulo: 'La oficina del capataz', dificultad: 'Normal', xp: 50, oro: 20,
    stats: { productividad: 1, analisis: 1 },
    etiquetas: ['funcion.max', 'funcion.min', 'funcion.contar', 'ratios'],
    texto: [
      'Berta, la capataz, golpea la mesa con un legajo. «Trabajan seis, pero no todos rinden igual. Quiero ver cuántos kilos saca cada uno por hora, quién rinde más y quién menos, y cuántos somos.»'
    ],
    queHacer: [
      'D2:D7: los kg por hora de cada trabajador (producción ÷ horas).',
      'B9: el mejor rendimiento (kg/h).',
      'B10: el peor rendimiento (kg/h).',
      'B11: el número de trabajadores.'
    ],
    generarDatos(semilla) {
      const rng = prng(semilla, 5);
      const nombres = ['Garcés', 'Inés', 'Ramiro', 'Elvira', 'Nuño', 'Urraca'];
      const celdas = { A1: 'Trabajador', B1: 'Horas/semana', C1: 'Producción (kg)', D1: 'kg por hora', A9: 'Más productivo (kg/h)', A10: 'Menos productivo (kg/h)', A11: 'Nº de trabajadores' };
      const horas = [], prod = [];
      nombres.forEach((n, i) => {
        horas.push(ent(rng, 30, 48));
        prod.push(ent(rng, 150, 420));
        celdas['A' + (i + 2)] = n;
        celdas['B' + (i + 2)] = String(horas[i]);
        celdas['C' + (i + 2)] = String(prod[i]);
      });
      return { cols: 4, filas: 11, celdas, v: { horas, prod } };
    },
    objetivos: [].concat(
      obRango('D', 2, 7, (d, k) => d.v.prod[k] / d.v.horas[k], { usaReferencias: true }),
      [
        ob('B9', (d) => Math.max(...d.v.prod.map((p, k) => p / d.v.horas[k])), { funcion: 'MAX' }),
        ob('B10', (d) => Math.min(...d.v.prod.map((p, k) => p / d.v.horas[k])), { funcion: 'MIN' }),
        ob('B11', (d) => d.v.horas.length, { funcion: 'CONTAR' })
      ]
    ),
    pistas: [
      'Para comparar a los trabajadores necesitas su rendimiento por hora. Después busca el mejor, el peor y cuenta cuántos hay.',
      'El rendimiento es producción dividida entre horas, fila a fila (rellena hacia abajo). Para el mejor, el peor y el recuento existen las funciones MAX, MIN y CONTAR.',
      'Rendimiento: celda de producción / celda de horas, y rellenar hacia abajo. MAX y MIN sobre la columna de rendimientos; CONTAR sobre una columna con un dato por trabajador.'
    ],
    consecuencia: {
      texto: () => 'Berta reasigna a los seis trabajadores según su rendimiento: los más rápidos a la cosecha y los demás al apoyo.'
    },
    aplicarAldea(a) {
      a.trabajadores = 6;
      a.edificios.push('Oficina del capataz');
    }
  };

  const M6 = {
    id: 'M6', titulo: 'Tiempos de escasez', dificultad: 'Difícil', xp: 100, oro: 50,
    stats: { logica: 2, finanzas: 1 },
    etiquetas: ['ref.absoluta', 'funcion.si', 'comparaciones'],
    texto: [
      'Llega el invierno y Maese Aldric habla bajo. «Si el trigo cae por debajo del umbral de racionamiento, hay que repartir menos. Quiero ver día a día cuánto queda y cuándo toca racionar.»',
      'El umbral está en una sola celda (G1) y todos los días deben compararse con ella.'
    ],
    queHacer: [
      'D2:D8: el stock final de cada día (stock inicial menos consumo).',
      'E2:E8: el estado de cada día, «RACIONAR» si el stock final queda por debajo del umbral y «NORMAL» si no.'
    ],
    generarDatos(semilla) {
      const rng = prng(semilla, 6);
      const celdas = { A1: 'Día', B1: 'Stock inicial', C1: 'Consumo', D1: 'Stock final', E1: 'Estado', F1: 'Umbral' };
      const b2 = ent(rng, 120, 180);
      const consumo = [];
      for (let i = 0; i < 7; i++) {
        consumo.push(ent(rng, 15, 30));
        celdas['A' + (i + 2)] = String(i + 1);
        celdas['C' + (i + 2)] = String(consumo[i]);
        celdas['B' + (i + 2)] = i === 0 ? String(b2) : '=D' + (i + 1);
      }
      const umbral = ent(rng, 40, 60);
      celdas.G1 = String(umbral);
      return { cols: 7, filas: 8, celdas, v: { b2, consumo, umbral } };
    },
    objetivos: [].concat(
      obRango('D', 2, 8, (d, k) => stockFinal(d, k), { usaReferencias: true }),
      obRango('E', 2, 8, (d, k) => (stockFinal(d, k) < d.v.umbral ? 'RACIONAR' : 'NORMAL'), { funcion: 'SI', usaReferencias: true },
        { ayuda: 'Piensa qué ocurre con la referencia al umbral cuando rellenas hacia abajo (mira la pista 2).' })
    ),
    pistas: [
      'Cada día el stock final es el inicial menos el consumo. Y el estado depende de si ese stock final cae por debajo del umbral de racionamiento.',
      'El estado se decide con la función SI, comparando el stock final con el umbral. Al rellenar hacia abajo, el umbral debe quedarse en su sitio: fija su referencia con el símbolo $ (referencia absoluta).',
      'Stock final: celda de stock inicial menos celda de consumo. Estado: =SI(stock final < celda del umbral fijada con $; "RACIONAR"; "NORMAL"), con el texto entre comillas dobles.'
    ],
    consecuencia: {
      texto: () => 'La aldea sobrevive al invierno. Se instaura la política de racionamiento: cuando el stock cae bajo el umbral, se reparte menos.'
    },
    aplicarAldea() {}
  };
  function stockFinal(d, k) {
    let s = d.v.b2;
    for (let i = 0; i <= k; i++) s -= d.v.consumo[i];
    return s;
  }

  const PRODUCTOS = ['Trigo', 'Huevos', 'Leña', 'Piedra', 'Lana'];
  const M7 = {
    id: 'M7', titulo: 'El tablón de la aldea', dificultad: 'Normal', xp: 50, oro: 20,
    stats: { analisis: 1 },
    etiquetas: ['grafico.rango', 'grafico.tipo', 'grafico.titulo'],
    grafico: true,
    texto: [
      'Maese Aldric clava un tablón en la plaza. «El pueblo entiende mejor un dibujo que una lista de números. Quiero un gráfico que compare lo que producimos de cada cosa.»'
    ],
    queHacer: ['Crea un gráfico con el panel de gráfico: elige el rango de datos, el tipo de gráfico adecuado para comparar productos y ponle un título (mínimo 5 caracteres).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 7);
      const celdas = { A1: 'Producto', B1: 'Producción semanal' };
      const usados = new Set();
      const valores = [];
      PRODUCTOS.forEach((p, i) => {
        let v;
        do { v = ent(rng, 20, 300); } while (usados.has(v));
        usados.add(v);
        valores.push(v);
        celdas['A' + (i + 2)] = p;
        celdas['B' + (i + 2)] = String(v);
      });
      return { cols: 2, filas: 6, celdas, v: { productos: PRODUCTOS.slice(), valores } };
    },
    objetivos: [],
    pistas: [
      'Quieres comparar cuánto se produce de cada producto. Piensa qué datos entran en el gráfico: ¿solo los números o también los nombres y los encabezados?',
      'Indica el rango que incluye encabezados y datos, de la esquina superior izquierda a la inferior derecha. Para comparar categorías, elige el tipo de gráfico que pone una barra por producto.',
      'El rango tiene la forma CELDA:CELDA (del primer encabezado al último dato), el tipo es el de barras verticales y el título debe describir qué muestra el gráfico.'
    ],
    consecuencia: {
      texto: () => 'El gráfico queda fijado en el tablón de la aldea. Todos ven de un vistazo qué producimos más.'
    },
    aplicarAldea(a) { a.edificios.push('Tablón de la aldea'); }
  };

  const MISIONES = [M1, M2, M3, M4, M5, M6, M7];

  const INTRO = {
    bienvenida: [
      'Bienvenido al clan, aprendiz. Hemos fundado una aldea junto al río, pero sin cuentas claras no sobreviviremos al invierno.',
      'Cada problema de la aldea se resuelve con una hoja de cálculo. Escribirás fórmulas reales de Excel en español y el mayordomo las comprobará.'
    ],
    tutorial: TUTORIAL
  };

  /* ---------- Validación ---------- */
  function iguales(esperado, valor) {
    if (typeof esperado === 'number') return typeof valor === 'number' && Math.abs(esperado - valor) <= 1e-6;
    return valor === esperado;
  }

  function construirHoja(m, datos, entrega) {
    const celdas = Object.assign({}, datos.celdas);
    for (const o of m.objetivos) {
      const raw = entrega[o.celda];
      if (raw === undefined || raw === null || String(raw).trim() === '') delete celdas[o.celda];
      else celdas[o.celda] = String(raw).trim();
    }
    return Engine.Hoja.desde(celdas, datos.cols, datos.filas);
  }

  function evaluarCelda(m, datos, entrega, o) {
    return construirHoja(m, datos, entrega).valor(o.celda);
  }

  function validarGrafico(extra) {
    const porCelda = {};
    const mensajes = [];
    const g = extra || {};
    const rango = String(g.rango || '').replace(/\$/g, '').replace(/\s/g, '').toUpperCase();
    porCelda.rango = rango === 'A1:B6' ? 'ok' : 'valor';
    if (porCelda.rango !== 'ok') mensajes.push('El rango de datos no es el adecuado: debe cubrir los encabezados y todos los datos de la tabla, ni más ni menos.');
    if (g.tipo === 'columnas') porCelda.tipo = 'ok';
    else {
      porCelda.tipo = 'valor';
      mensajes.push(g.tipo === 'líneas' || g.tipo === 'lineas'
        ? 'Las líneas sirven para ver la evolución en el tiempo; aquí comparas categorías, y para eso van mejor las columnas.'
        : 'Elige un tipo de gráfico para el panel: columnas o líneas.');
    }
    if (String(g.titulo || '').trim().length >= 5) porCelda.titulo = 'ok';
    else {
      porCelda.titulo = 'valor';
      mensajes.push('El gráfico necesita un título de al menos 5 caracteres.');
    }
    return { ok: Object.values(porCelda).every((x) => x === 'ok'), porCelda, mensajes };
  }

  /* entrega: { celda: texto bruto } con las celdas editables del jugador. */
  function validar(m, entrega, semilla, extra) {
    if (m.grafico) return validarGrafico(extra);
    entrega = entrega || {};
    const datos = m.generarDatos(semilla);
    const alternos = [m.generarDatos(semilla + 1), m.generarDatos(semilla + 2)];
    const porCelda = {};
    const fallos = new Map();
    const registrar = (o, estado, texto) => {
      porCelda[o.celda] = estado;
      const clave = o.grupo + '|' + estado;
      if (!fallos.has(clave)) fallos.set(clave, { texto, celdas: [] });
      fallos.get(clave).celdas.push(o.celda);
    };

    for (const o of m.objetivos) {
      const raw = entrega[o.celda];
      const vacia = raw === undefined || raw === null || String(raw).trim() === '';
      if (vacia) {
        registrar(o, 'noFormula', `${o.grupo}: está vacía. Escribe una fórmula que empiece por =.`);
        continue;
      }
      if (!String(raw).trim().startsWith('=')) {
        registrar(o, 'noFormula', `${o.grupo}: no contiene una fórmula (debe empezar por =). Un valor escrito a mano no se recalcula.`);
        continue;
      }
      const v = evaluarCelda(m, datos, entrega, o);
      if (Engine.esError(v)) {
        registrar(o, 'valor', `${o.grupo}: la fórmula da el error ${v.codigo}. ${v.explicacion}`);
        continue;
      }
      if (!iguales(o.esperado(datos), v)) {
        registrar(o, 'valor', `${o.grupo}: el resultado no es el esperado.${o.ayuda ? ' ' + o.ayuda : ''}`);
        continue;
      }
      const adapta = alternos.every((alt) => {
        const va = evaluarCelda(m, alt, entrega, o);
        return !Engine.esError(va) && iguales(o.esperado(alt), va);
      });
      if (!adapta) {
        registrar(o, 'hardcode', `${o.grupo}: Tu resultado es correcto ahora, pero no se adapta si cambian los datos. ¿Has escrito algún número a mano o apuntado a una celda equivocada?${o.ayuda ? ' ' + o.ayuda : ''}`);
        continue;
      }
      const info = Engine.analizar(String(raw).trim());
      if (o.requisitos.funcion && !info.funciones.includes(o.requisitos.funcion)) {
        registrar(o, 'requisito', `${o.grupo}: en esta celda tienes que usar la función ${o.requisitos.funcion}.`);
        continue;
      }
      if (o.requisitos.usaReferencias && info.referencias === 0) {
        registrar(o, 'requisito', `${o.grupo}: tienes que usar referencias a celdas (como B2) en lugar de números escritos a mano.`);
        continue;
      }
      porCelda[o.celda] = 'ok';
    }
    const mensajes = Array.from(fallos.values()).map((f) => f.texto);
    return { ok: m.objetivos.every((o) => porCelda[o.celda] === 'ok'), porCelda, mensajes };
  }

  function celdasEditables(m) { return m.objetivos.map((o) => o.celda); }

  return {
    MISIONES, CODICE, INTRO, TUTORIAL, mulberry32, prng, validar, celdasEditables, iguales
  };
});
