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

  /* Datos compartidos por M6 y M7: stock final de cada día y umbral de racionamiento. */
  function datosUmbral(stock, umbral, cabC) {
    const celdas = { A1: 'Día', B1: 'Stock final (kg)', C1: cabC, F1: 'Umbral (kg)', G1: String(umbral) };
    stock.forEach((v, i) => { celdas['A' + (i + 2)] = String(i + 1); celdas['B' + (i + 2)] = String(v); });
    return { cols: 7, filas: 10, celdas, v: { stock: stock.slice(), umbral } };
  }
  function generarUmbral(semilla, n, cabC) {
    const rng = prng(semilla, n);
    const stock = [];
    for (let i = 0; i < 7; i++) stock.push(ent(rng, 20, 140));
    return datosUmbral(stock, ent(rng, 40, 60), cabC);
  }
  /* Conjuntos fijos que cruzan el umbral en ambos sentidos: delatan umbrales escritos a mano. */
  const VARIANTES_UMBRAL = [
    { stock: [38, 40, 41, 42, 45, 39, 60], umbral: 41 },
    { stock: [56, 58, 59, 60, 57, 61, 30], umbral: 59 }
  ];
  const AYUDA_UMBRAL = 'Piensa qué pasa con la referencia al umbral cuando rellenas hacia abajo (mira la pista 2).';

  const M6 = {
    id: 'M6', titulo: 'El umbral', dificultad: 'Normal', xp: 50, oro: 25,
    stats: { logica: 1, finanzas: 1 },
    etiquetas: ['ref.absoluta'],
    texto: [
      'Llega el invierno y Maese Aldric habla bajo. «Anoté cuánto trigo queda cada día. Hay un umbral de racionamiento, y todos los días deben compararse con ese mismo número. Dime cuánto margen nos queda sobre él.»',
      'El umbral está en una sola celda (G1) y no debe moverse al rellenar hacia abajo.'
    ],
    queHacer: ['C2:C8: el margen de cada día sobre el umbral en kg (stock final menos umbral; sale negativo si queda por debajo).'],
    generarDatos(semilla) {
      const d = generarUmbral(semilla, 6, 'Margen sobre umbral');
      d.celdas.A10 = 'Margen = stock final - umbral (negativo si el stock queda por debajo).';
      return d;
    },
    variantes: () => VARIANTES_UMBRAL.map((v) => datosUmbral(v.stock, v.umbral, 'Margen sobre umbral')),
    objetivos: obRango('C', 2, 8, (d, k) => d.v.stock[k] - d.v.umbral, { usaReferencias: true, apuntaA: 'G1' }, { entero: true, ayuda: AYUDA_UMBRAL }),
    pistas: [
      'Quieres saber cuántos kg quedan por encima o por debajo del umbral cada día. El umbral está en una única celda que comparten todos los días.',
      'Resta el umbral al stock final de cada día. Al rellenar hacia abajo, la referencia al umbral debe quedarse quieta: fíjala con el símbolo $ delante de la letra y del número (referencia absoluta).',
      'Primera fila: celda del stock final menos la celda del umbral escrita con $ delante de la columna y de la fila. Después selecciona la columna entera y rellena hacia abajo.'
    ],
    consecuencia: {
      texto: () => 'Maese Aldric apunta el umbral en la pizarra de la aldea: desde hoy todos saben a partir de cuántos kg se raciona.'
    },
    aplicarAldea() {}
  };

  const M7 = {
    id: 'M7', titulo: 'Racionamiento', dificultad: 'Normal', xp: 50, oro: 25,
    stats: { logica: 1 },
    etiquetas: ['funcion.si', 'comparaciones'],
    texto: [
      'Aldric sacude la cabeza. «Ya sé cuánto margen tenemos, pero no quiero leer números cada mañana. Quiero que la hoja me diga sola, día a día, si hay que racionar o no.»',
      'El umbral sigue en G1. Escribe los textos exactamente entre comillas dobles.'
    ],
    queHacer: ['C2:C8: el estado de cada día: «RACIONAR» si el stock final queda por debajo del umbral y «NORMAL» si no.'],
    generarDatos(semilla) { return generarUmbral(semilla, 7, 'Estado'); },
    variantes: () => VARIANTES_UMBRAL.map((v) => datosUmbral(v.stock, v.umbral, 'Estado')),
    objetivos: obRango('C', 2, 8, (d, k) => (d.v.stock[k] < d.v.umbral ? 'RACIONAR' : 'NORMAL'),
      { funcion: 'SI', usaReferencias: true }, { textoFlexible: true, ayuda: AYUDA_UMBRAL }),
    pistas: [
      'El estado de cada día depende de una pregunta: ¿el stock final está por debajo del umbral? Según la respuesta, el texto es uno u otro.',
      'Usa la función SI: =SI(condición; valor_si_verdadero; valor_si_falso). La condición compara el stock final con el umbral (que debe quedar fijo con $) y los textos van entre comillas dobles.',
      'Estructura: =SI(celda del stock final < celda del umbral con $; "texto si se raciona"; "texto si no"). Escríbela en la primera fila y rellena hacia abajo.'
    ],
    consecuencia: {
      texto: () => 'Se instaura la política de racionamiento: cuando el stock cae bajo el umbral, se reparte menos. La aldea sobrevive al invierno.'
    },
    aplicarAldea() {}
  };

  const PRODUCTOS = ['Trigo', 'Huevos', 'Leña', 'Piedra', 'Lana'];
  const M8 = {
    id: 'M8', titulo: 'El tablón de la aldea', dificultad: 'Normal', xp: 50, oro: 20,
    stats: { analisis: 1 },
    etiquetas: ['grafico.rango', 'grafico.tipo', 'grafico.titulo'],
    grafico: { rango: 'A1:B6', tipo: 'columnas', msgTipo: { 'líneas': 'Las líneas sirven para ver la evolución en el tiempo; aquí comparas categorías, y para eso van mejor las columnas.' } },
    texto: [
      'Maese Aldric clava un tablón en la plaza. «El pueblo entiende mejor un dibujo que una lista de números. Quiero un gráfico que compare lo que producimos de cada cosa.»'
    ],
    queHacer: ['Crea un gráfico con el panel de gráfico: elige el rango de datos, el tipo de gráfico adecuado para comparar productos y ponle un título (mínimo 5 caracteres).'],
    generarDatos(semilla) {
      const rng = prng(semilla, 8);
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
      'Indica el rango que incluye encabezados y datos, de la esquina superior izquierda a la inferior derecha. Para comparar categorías elige el tipo columnas: una barra por producto.',
      'El rango tiene la forma CELDA:CELDA (del primer encabezado al último dato), el tipo es el de barras verticales (columnas) y el título debe describir qué muestra el gráfico.'
    ],
    consecuencia: {
      texto: () => 'El gráfico queda fijado en el tablón de la aldea. Todos ven de un vistazo qué producimos más.'
    },
    aplicarAldea(a) { a.edificios.push('Tablón de la aldea'); }
  };

  const MISIONES = [M1, M2, M3, M4, M5, M6, M7, M8];

  /* Metadatos comunes (§6 de CAMBIOS): preparados para la Ciudad; requisitos vacíos en esta versión. */
  const META = {
    M1: { negocio: 'almacen', familia: 'abaco', claves: ['SUMA'], entero: ['B9'], pista2: 'La función que suma es SUMA: se escribe =SUMA(rango), con los dos puntos entre la primera y la última celda de la columna del trigo.' },
    M2: { negocio: 'granja', familia: 'compas', claves: ['SUMA'], entero: ['E2', 'E3', 'E4', 'E5', 'E6', 'E7'], pista2: 'Para cada fila usa la función SUMA sobre las tres celdas de esa fila. Luego selecciona de arriba abajo las celdas del total diario y pulsa «Rellenar hacia abajo» (Ctrl+D).' },
    M3: { negocio: 'almacen', familia: 'abaco', claves: ['*', '-'], entero: [], pista2: 'No hace falta ninguna función: bastan los operadores * (multiplicar) y - (restar) con referencias a las celdas de la tabla. No escribas los números, apunta a sus celdas.' },
    M4: { negocio: 'almacen', familia: 'abaco', claves: ['PROMEDIO', 'ENTERO'], entero: ['B14'], pista2: 'Para la producción usa PROMEDIO sobre el rango de la semana. Para los días, divide stock entre consumo y quédate solo con la parte entera con ENTERO. El balance es una resta.' },
    M5: { negocio: 'capataz', familia: 'abaco', claves: ['MAX', 'MIN', 'CONTAR'], entero: ['B11'], pista2: 'El rendimiento es producción dividida entre horas con el operador / (fila a fila, rellena hacia abajo). Para el mejor, el peor y el recuento existen MAX, MIN y CONTAR.' },
    M6: { negocio: 'almacen', familia: 'compas', claves: ['$'], entero: [] },
    M7: { negocio: 'almacen', familia: 'balanza', claves: ['SI'], entero: [] },
    M8: { negocio: 'tablon', familia: 'pincel', claves: ['columnas'], entero: [] }
  };
  MISIONES.forEach((m) => {
    const x = META[m.id];
    Object.assign(m, { tipo: 'principal', entorno: 'aldea', negocio: x.negocio, familia: x.familia, requisitos: [], pista2Contiene: x.claves });
    if (x.pista2) m.pistas[1] = x.pista2;
    m.objetivos.forEach((o) => { if (x.entero.includes(o.celda)) o.entero = true; });
  });

  /* ---------- Lecciones del mayordomo (se muestran antes de cada misión) ---------- */
  const LECCIONES = {
    M1: {
      paginas: [{
        titulo: 'Sumar con SUMA',
        texto: 'Para sumar muchos números a la vez usamos la función SUMA. Se escribe =SUMA(rango): el signo =, el nombre de la función y, entre paréntesis, el rango (primera celda, dos puntos y última celda). Errores comunes: olvidar el = (la celda mostraría el texto tal cual) o dejar el paréntesis sin cerrar. En el ejemplo, B5 suma de B2 a B4.',
        ejemplo: { cols: 2, filas: 5, celdas: { A1: 'Mes', B1: 'Sacos de cebada', A2: 'Enero', B2: '12', A3: 'Febrero', B3: '8', A4: 'Marzo', B4: '15', A5: 'Total', B5: '=SUMA(B2:B4)' } },
        ficha: 'funcion.suma'
      }]
    },
    M2: {
      paginas: [{
        titulo: 'Referencias relativas y rellenar hacia abajo',
        texto: 'En una fórmula, B2 es una referencia relativa: si copias la fórmula una fila más abajo, Excel la convierte en B3 sola. Por eso basta escribir la primera fórmula, seleccionar la columna de arriba abajo y pulsar «Rellenar hacia abajo» (Ctrl+D), o arrastrar el cuadradito de la esquina. Error común: seleccionar solo la celda de la fórmula; sin celdas debajo no hay nada que rellenar.',
        ejemplo: { cols: 4, filas: 4, celdas: { A1: 'Mes', B1: 'Cebada', C1: 'Avena', D1: 'Total', A2: 'Enero', B2: '12', C2: '5', D2: '=SUMA(B2:C2)', A3: 'Febrero', B3: '8', C3: '9', D3: '=SUMA(B3:C3)', A4: 'Marzo', B4: '15', C4: '7', D4: '=SUMA(B4:C4)' } },
        ficha: 'ref.relativa'
      }],
      repasos: []
    },
    M3: {
      paginas: [{
        titulo: 'Operadores con referencias',
        texto: 'Con referencias puedes calcular sin funciones: + suma, - resta, * multiplica, / divide y ^ eleva. Se escribe =B2*B3. Si cambia un dato, el resultado se actualiza. Los decimales llevan coma (2,5). Error común: escribir el número en la fórmula (=12*2,5) en lugar de apuntar a su celda: si el dato cambia, la fórmula no se entera.',
        ejemplo: { cols: 2, filas: 5, celdas: { A1: 'Concepto', B1: 'Valor', A2: 'Cajas', B2: '12', A3: 'Peso por caja (kg)', B3: '2,5', A4: 'Peso total (kg)', B4: '=B2*B3', A5: 'Si se pierde una caja', B5: '=B4-B3' } },
        ficha: 'operadores'
      }],
      repasos: [{ texto: 'Repaso: recuerda que SUMA suma un rango entero, como =SUMA(B2:B8).', ficha: 'funcion.suma' }]
    },
    M4: {
      paginas: [{
        titulo: 'La media con PROMEDIO',
        texto: 'PROMEDIO calcula la media de un rango: suma los números y los divide entre cuántos hay. Forma: =PROMEDIO(rango). Ignora el texto y las celdas vacías. Error común: promediar también la celda del encabezado o la del propio resultado.',
        ejemplo: { cols: 2, filas: 6, celdas: { A1: 'Día', B1: 'Panes', A2: 'Lun', B2: '10', A3: 'Mar', B3: '14', A4: 'Mié', B4: '12', A5: 'Jue', B5: '16', A6: 'Media', B6: '=PROMEDIO(B2:B5)' } },
        ficha: 'funcion.promedio'
      }, {
        titulo: 'Solo la parte entera con ENTERO',
        texto: 'ENTERO descarta los decimales y se queda con la parte entera (hacia abajo): =ENTERO(B1/B2). Sirve para contar unidades completas: 40 sacos entre raciones de 7 dan 5,71, pero solo 5 raciones completas. Si el divisor es 0 verás #DIV/0!: Excel no puede dividir entre cero. Error común: dejar los decimales cuando se piden días completos.',
        ejemplo: { cols: 2, filas: 3, celdas: { A1: 'Sacos', B1: '40', A2: 'Sacos por ración', B2: '7', A3: 'Raciones completas', B3: '=ENTERO(B1/B2)' } },
        ficha: 'funcion.entero'
      }]
    },
    M5: {
      paginas: [{
        titulo: 'Mayor, menor y recuento: MAX, MIN y CONTAR',
        texto: 'MAX devuelve el mayor valor de un rango, MIN el menor y CONTAR cuántas celdas tienen números: =MAX(rango). Un ratio como hogazas por hora es una división fila a fila (=B2/C2) que luego se rellena hacia abajo. Error común: usar CONTAR sobre una columna de texto: CONTAR solo cuenta números.',
        ejemplo: { cols: 4, filas: 8, celdas: { A1: 'Panadero', B1: 'Hogazas', C1: 'Horas', D1: 'Hogazas/hora', A2: 'Rodrigo', B2: '60', C2: '6', D2: '=B2/C2', A3: 'Marta', B3: '45', C3: '5', D3: '=B3/C3', A4: 'Pablo', B4: '70', C4: '10', D4: '=B4/C4', A6: 'Mejor', B6: '=MAX(D2:D4)', A7: 'Peor', B7: '=MIN(D2:D4)', A8: 'Panaderos', B8: '=CONTAR(B2:B4)' } },
        ficha: 'funcion.max'
      }],
      repasos: [{ texto: 'Repaso: para el ratio de cada trabajador, escribe la primera fórmula y usa «Rellenar hacia abajo».', ficha: 'rellenar' }]
    },
    M6: {
      paginas: [{
        titulo: 'Referencias absolutas con $',
        texto: 'Al rellenar hacia abajo, las referencias relativas se desplazan. Si una celda debe quedarse fija (un precio, un umbral), escribe $ delante de la columna y de la fila: $G$1. Así no se mueve nunca. Sin $, al rellenar G1 pasaría a G2, a G3… celdas vacías. En el ejemplo, el envío está en G1 y se suma a cada precio.',
        ejemplo: { cols: 7, filas: 4, celdas: { A1: 'Producto', B1: 'Precio', C1: 'Con envío', F1: 'Envío', G1: '2', A2: 'Harina', B2: '8', C2: '=B2+$G$1', A3: 'Sal', B3: '3', C3: '=B3+$G$1', A4: 'Miel', B4: '12', C4: '=B4+$G$1' } },
        ficha: 'ref.absoluta'
      }],
      repasos: [{ texto: 'Repaso: escribe la fórmula en la primera fila, selecciona la columna y pulsa «Rellenar hacia abajo».', ficha: 'rellenar' }]
    },
    M7: {
      paginas: [{
        titulo: 'Decidir con SI y comparaciones',
        texto: 'SI toma una decisión: =SI(condición; valor_si_verdadero; valor_si_falso). La condición compara con < (menor), > (mayor), = (igual), <= , >= o <> (distinto). Ejemplo: =SI(B2>=5;"APROBADO";"SUSPENDIDO"). Error común: usar comas en vez de punto y coma, o invertir los dos resultados.',
        ejemplo: { cols: 3, filas: 4, celdas: { A1: 'Alumno', B1: 'Nota', C1: 'Resultado', A2: 'Ana', B2: '7', C2: '=SI(B2>=5;"APROBADO";"SUSPENDIDO")', A3: 'Luis', B3: '4', C3: '=SI(B3>=5;"APROBADO";"SUSPENDIDO")', A4: 'Eva', B4: '5', C4: '=SI(B4>=5;"APROBADO";"SUSPENDIDO")' } },
        ficha: 'funcion.si'
      }, {
        titulo: 'El texto va entre comillas',
        texto: 'Cuando una fórmula devuelve texto, ese texto se escribe entre comillas dobles: "PESADO". Sin comillas, Excel cree que es el nombre de algo y da #¿NOMBRE?. Los números y las referencias no llevan comillas. Error común: comillas tipográficas (“ ”) en lugar de las rectas ("). En el ejemplo el límite está escrito en la fórmula; en tu misión estará en una celda, y ya sabes cómo fijarla.',
        ejemplo: { cols: 3, filas: 4, celdas: { A1: 'Saco', B1: 'Peso (kg)', C1: 'Aviso', A2: 'Harina', B2: '35', C2: '=SI(B2>30;"PESADO";"LIGERO")', A3: 'Sal', B3: '12', C3: '=SI(B3>30;"PESADO";"LIGERO")', A4: 'Miel', B4: '30', C4: '=SI(B4>30;"PESADO";"LIGERO")' } },
        ficha: 'comparaciones'
      }],
      repasos: [{ texto: 'Repaso: para fijar una celda al rellenar hacia abajo usa $, como en $G$1.', ficha: 'ref.absoluta' }]
    },
    M8: {
      paginas: [{
        titulo: 'Gráficos: rango, tipo y título',
        texto: 'Un gráfico necesita tres decisiones. El rango de datos: incluye los encabezados y todos los datos (A1:B5), ni más ni menos. El tipo: columnas para comparar categorías, líneas para ver la evolución en el tiempo. El título: dile al lector qué está viendo. Error común: dejar fuera la fila de encabezados o el último dato.',
        ejemplo: { cols: 2, filas: 5, celdas: { A1: 'Fruta', B1: 'Kilos', A2: 'Manzanas', B2: '40', A3: 'Peras', B3: '25', A4: 'Uvas', B4: '60', A5: 'Higos', B5: '15' } },
        ficha: 'grafico.rango'
      }],
      repasos: [{ texto: 'Repaso: un rango se escribe PRIMERA:ÚLTIMA, como B2:B8; en un gráfico incluye también la fila de encabezados.', ficha: 'rangos' }]
    }
  };
  MISIONES.forEach((m) => { m.leccion = Object.assign({ repasos: [] }, LECCIONES[m.id]); });

  const INTRO = {
    bienvenida: [
      'Bienvenido al clan, aprendiz. Hemos fundado una aldea junto al río, pero sin cuentas claras no sobreviviremos al invierno.',
      'Cada problema de la aldea se resuelve con una hoja de cálculo. Escribirás fórmulas reales de Excel en español y el mayordomo las comprobará.'
    ],
    tutorial: TUTORIAL
  };

  /* ---------- Validación ---------- */
  const norm = (t) => String(t).trim().toLowerCase();

  /* Devuelve null si el valor es el esperado; si no, el motivo del fallo (sin revelar la solución). */
  function juzgar(o, esperado, v) {
    if (typeof esperado === 'number') {
      if (typeof v === 'string') return 'hay texto en la celda y aquí se espera un número';
      if (typeof v === 'boolean') return 'hay un valor lógico (VERDADERO/FALSO) y aquí se espera un número';
      if (Math.abs(esperado - v) <= 1e-6) return null;
      if (o.entero && Math.abs(v - Math.round(v)) > 1e-9) return 'el resultado tiene decimales y aquí se pide un número entero';
      return v > esperado ? 'el resultado es mayor del esperado' : 'el resultado es menor del esperado';
    }
    if (typeof v === 'number') return 'hay un número en la celda y aquí se espera texto';
    if (typeof v === 'boolean') return 'hay un valor lógico (VERDADERO/FALSO) y aquí se espera texto';
    const igual = o.textoFlexible ? norm(v) === norm(esperado) : v === esperado;
    return igual ? null : 'el texto de la celda no coincide con el esperado (revisa mayúsculas, ortografía y comillas)';
  }
  const iguales = (esperado, valor) => juzgar({}, esperado, valor) === null;

  function construirHoja(m, datos, entrega) {
    const celdas = Object.assign({}, datos.celdas);
    for (const o of m.objetivos) {
      const raw = entrega[o.celda];
      if (raw === undefined || raw === null || String(raw).trim() === '') delete celdas[o.celda];
      else celdas[o.celda] = String(raw).trim();
    }
    return Engine.Hoja.desde(celdas, datos.cols, datos.filas);
  }

  function validarGrafico(m, extra) {
    const cfg = m.grafico;
    const porCelda = {};
    const mensajes = [];
    const g = extra || {};
    const rango = String(g.rango || '').replace(/\$/g, '').replace(/\s/g, '').toUpperCase();
    porCelda.rango = rango === cfg.rango ? 'ok' : 'valor';
    if (porCelda.rango !== 'ok') mensajes.push('El rango de datos no es el adecuado: debe cubrir los encabezados y todos los datos de la tabla, ni más ni menos.');
    const tipo = g.tipo === 'lineas' ? 'líneas' : g.tipo;
    if (tipo === cfg.tipo) porCelda.tipo = 'ok';
    else {
      porCelda.tipo = 'valor';
      mensajes.push((cfg.msgTipo && cfg.msgTipo[tipo]) || 'Elige un tipo de gráfico para el panel: columnas o líneas.');
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
    if (m.grafico) return validarGrafico(m, extra);
    entrega = entrega || {};
    const datos = m.generarDatos(semilla);
    const alternos = [m.generarDatos(semilla + 1), m.generarDatos(semilla + 2)].concat(m.variantes ? m.variantes(semilla) : []);
    const porCelda = {};
    const fallos = new Map();
    const registrar = (o, estado, razon) => {
      porCelda[o.celda] = estado;
      const clave = o.grupo + '|' + estado + '|' + razon;
      if (!fallos.has(clave)) fallos.set(clave, { grupo: o.grupo, razon, celdas: [] });
      fallos.get(clave).celdas.push(o.celda);
    };

    for (const o of m.objetivos) {
      const raw = entrega[o.celda];
      const vacia = raw === undefined || raw === null || String(raw).trim() === '';
      if (vacia) {
        registrar(o, 'noFormula', 'está vacía. Escribe una fórmula que empiece por =.');
        continue;
      }
      if (!String(raw).trim().startsWith('=')) {
        registrar(o, 'noFormula', 'no contiene una fórmula (debe empezar por =). Un valor escrito a mano no se recalcula.');
        continue;
      }
      const v = construirHoja(m, datos, entrega).valor(o.celda);
      if (Engine.esError(v)) {
        registrar(o, 'valor', `la fórmula da el error ${v.codigo}. ${v.explicacion}`);
        continue;
      }
      const motivo = juzgar(o, o.esperado(datos), v);
      if (motivo) {
        registrar(o, 'valor', `${motivo}.${o.ayuda ? ' ' + o.ayuda : ''}`);
        continue;
      }
      const adapta = alternos.every((alt) => {
        const va = construirHoja(m, alt, entrega).valor(o.celda);
        return !Engine.esError(va) && juzgar(o, o.esperado(alt), va) === null;
      });
      if (!adapta) {
        registrar(o, 'hardcode', `Tu resultado es correcto ahora, pero no se adapta si cambian los datos. ¿Has escrito algún número a mano o apuntado a una celda equivocada?${o.ayuda ? ' ' + o.ayuda : ''}`);
        continue;
      }
      const info = Engine.analizar(String(raw).trim());
      const req = o.requisitos;
      if (req.funcion && !info.funciones.includes(req.funcion)) {
        registrar(o, 'requisito', `en esta celda tienes que usar la función ${req.funcion}.`);
        continue;
      }
      if (req.usaReferencias && info.referencias === 0) {
        registrar(o, 'requisito', 'tienes que usar referencias a celdas (como B2) en lugar de números escritos a mano.');
        continue;
      }
      if (req.apuntaA) {
        const t = Engine.parsearRef(req.apuntaA);
        if (!info.refs.some((r) => r.c === t.c && r.r === t.r)) {
          registrar(o, 'requisito', `la fórmula debe apuntar a la celda ${req.apuntaA}. Si rellenas hacia abajo, esa referencia tiene que seguir apuntando a ella.`);
          continue;
        }
      }
      porCelda[o.celda] = 'ok';
    }
    const mensajes = Array.from(fallos.values()).map((f) => {
      const etiqueta = f.celdas.length > 3 ? f.grupo : f.celdas.join(', ');
      return `${etiqueta}: ${f.razon}`;
    });
    return { ok: m.objetivos.every((o) => porCelda[o.celda] === 'ok'), porCelda, mensajes };
  }

  function celdasEditables(m) { return m.objetivos.map((o) => o.celda); }

  return {
    MISIONES, CODICE, INTRO, TUTORIAL, mulberry32, prng, ent, ob, obRango, DIAS, validar, celdasEditables, iguales
  };
});
