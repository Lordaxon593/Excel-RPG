/* Libro de funciones: una ficha por competencia, que se desbloquea al enseñarla. Sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Libro = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* desbloqueaCon: 'E1'..'E4' = lección de la Escuela completada; 'M1'..'M8' = lección de esa misión vista. */
  function f(id, nombre, paraQue, forma, ejemplo, errores, desbloqueaCon, icono) {
    return { id, nombre, paraQue, forma, ejemplo, errores, desbloqueaCon, icono: icono || '📖' };
  }

  const FICHAS = [
    f('formulas.entrada', 'Entrada de fórmulas', 'Hacer que una celda calcule en vez de guardar un texto.', 'Empieza siempre por =, por ejemplo =A1+B1', '=2+3 muestra 5; =A1+B1 suma lo que haya en esas celdas.', 'Olvidar el =: Excel guarda el texto tal cual. Escribir la fórmula con comas en lugar de punto y coma.', ['E3', 'M1'], '✍'),
    f('rangos', 'Rangos', 'Hablar de varias celdas seguidas a la vez.', 'PRIMERA:ÚLTIMA, por ejemplo B2:B8', 'B2:B8 es la columna B desde la fila 2 hasta la 8; A1:B3 es un bloque de seis celdas.', 'Dejar fuera la primera o la última celda del rango.', ['E2', 'M1'], '▦'),
    f('funcion.suma', 'SUMA', 'Sumar muchos números a la vez.', '=SUMA(rango)', '=SUMA(B2:B4) suma las celdas B2, B3 y B4.', 'Olvidar el =, dejar el paréntesis sin cerrar o incluir la celda del encabezado.', ['E4', 'M1'], '🌾'),
    f('ref.relativa', 'Referencias relativas', 'Copiar una fórmula a otras filas y que se adapte sola.', 'Escribe la referencia normal: B2', 'Una fórmula con B2 copiada una fila abajo pasa a usar B3.', 'Esperar que una celda fija cambie, o que una móvil se quede quieta.', ['M2'], '↕'),
    f('rellenar', 'Rellenar hacia abajo', 'Copiar una fórmula a toda una columna de golpe.', 'Selecciona de arriba abajo y pulsa Ctrl+D (o arrastra el cuadradito de la esquina)', 'Escribes =SUMA(B2:C2) en D2, seleccionas D2:D6 y pulsas Ctrl+D.', 'Seleccionar solo la celda de la fórmula: no hay nada que rellenar.', ['M2'], '⬇'),
    f('operadores', 'Operadores', 'Calcular con +, -, *, / y ^ sin necesidad de funciones.', '=B2*B3 (multiplicar), =B2-B3 (restar), =B2/B3 (dividir)', '=B2*B3 multiplica el contenido de dos celdas.', 'Escribir los números a mano en lugar de apuntar a sus celdas.', ['E3', 'M3'], '➕'),
    f('ref.celda', 'Referencias de celda', 'Usar el contenido de otra celda dentro de una fórmula.', 'Columna + fila: B3', '=B3*2 usa lo que haya en B3 y se actualiza si cambia.', 'Apuntar a la fila o columna equivocada.', ['E3', 'M3'], '🎯'),
    f('decimales', 'Decimales', 'Escribir números con parte decimal.', 'En español, con coma: 2,5', '=B2*1,5 multiplica por uno y medio.', 'Usar punto de millares o separar los argumentos con comas.', ['E3', 'M3'], ','),
    f('funcion.promedio', 'PROMEDIO', 'Calcular la media de un rango.', '=PROMEDIO(rango)', '=PROMEDIO(B2:B5) da la media de cuatro días.', 'Incluir el encabezado o la propia celda del resultado en el rango.', ['M4'], '⚖'),
    f('funcion.entero', 'ENTERO', 'Quedarse solo con la parte entera, hacia abajo.', '=ENTERO(número)', '=ENTERO(40/7) da 5, aunque 40/7 sea 5,71.', 'Dejar decimales cuando se piden unidades completas.', ['M4'], '🔢'),
    f('error.div0', 'Error #DIV/0!', 'Entender qué pasa si divides entre cero o entre una celda vacía.', 'Aparece solo, como resultado de una división por 0', '=B1/0 da #DIV/0!. Si el consumo fuera 0, =B10/B11 daría ese error.', 'Dividir entre una celda vacía o con valor 0.', ['M4'], '⚠'),
    f('funcion.max', 'MAX', 'Encontrar el mayor valor de un rango.', '=MAX(rango)', '=MAX(D2:D7) es el mejor rendimiento.', 'Incluir celdas con texto esperando que cuenten.', ['M5'], '▲'),
    f('funcion.min', 'MIN', 'Encontrar el menor valor de un rango.', '=MIN(rango)', '=MIN(D2:D7) es el peor rendimiento.', 'Incluir celdas vacías que no son datos reales.', ['M5'], '▼'),
    f('funcion.contar', 'CONTAR', 'Contar cuántas celdas del rango tienen números.', '=CONTAR(rango)', '=CONTAR(B2:B7) cuenta seis trabajadores si hay seis horas anotadas.', 'Contar una columna de texto: CONTAR solo cuenta números.', ['M5'], '#'),
    f('ratios', 'Ratios entre columnas', 'Comparar cosas distintas con una división fila a fila (kg por hora, precio por unidad…).', '=C2/B2 y rellenar hacia abajo', '=C2/B2 divide la producción entre las horas de cada trabajador.', 'Dividir al revés: producción entre horas, no horas entre producción.', ['M5'], '÷'),
    f('ref.absoluta', 'Referencias absolutas', 'Fijar una celda para que no se mueva al rellenar.', '$G$1: el $ delante de la columna y de la fila', '=B2-$G$1 rellenada hacia abajo sigue restando G1.', 'Olvidar el $ y que G1 pase a G2, G3…', ['M6'], '📌'),
    f('funcion.si', 'SI', 'Decidir entre dos resultados según una condición.', '=SI(condición; si_verdadero; si_falso)', '=SI(B2<$G$1;"RACIONAR";"NORMAL")', 'Usar comas en lugar de punto y coma o invertir los dos resultados.', ['M7'], '⚖'),
    f('comparaciones', 'Comparaciones y texto', 'Preguntar si algo es menor, mayor o igual, y escribir texto en una fórmula.', '< > = <= >= <> y el texto entre "comillas dobles"', '="a"="A" es VERDADERO; =SI(B2>30;"PESADO";"LIGERO")', 'Olvidar las comillas del texto: Excel da #¿NOMBRE?.', ['M7'], '❓'),
    f('grafico.rango', 'Gráficos: el rango', 'Elegir qué datos dibuja el gráfico.', 'Del primer encabezado al último dato: A1:B6', 'Con 5 productos y su encabezado, el rango es A1:B6.', 'Dejar fuera el encabezado o el último dato.', ['M8'], '▦'),
    f('grafico.tipo', 'Gráficos: el tipo', 'Elegir la forma de dibujar los datos.', 'Columnas para comparar categorías; líneas para la evolución en el tiempo', 'Producción de cada producto: columnas. Producción mes a mes: líneas.', 'Usar líneas para categorías que no tienen orden temporal.', ['M8'], '📊'),
    f('grafico.titulo', 'Gráficos: el título', 'Decir al lector qué está mirando.', 'Un título breve y descriptivo (mínimo 5 caracteres)', '«Producción semanal de la aldea»', 'Dejar el gráfico sin título.', ['M8'], '🏷')
  ];

  const ficha = (id) => FICHAS.find((x) => x.id === id) || null;

  /* ¿Está desbloqueada esta ficha? leccionesVistas: {M1: true}; escuelaLecciones: {E1: true} */
  function desbloqueada(fi, leccionesVistas, escuelaLecciones) {
    return fi.desbloqueaCon.some((c) => (c[0] === 'E' ? !!(escuelaLecciones && escuelaLecciones[c]) : !!(leccionesVistas && leccionesVistas[c])));
  }

  /* Búsqueda sencilla (sin distinguir mayúsculas ni acentos) para el selector del libro. */
  const sinAcentos = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function buscar(texto, fichas) {
    const q = sinAcentos(texto).trim();
    if (!q) return fichas.slice();
    return fichas.filter((x) => sinAcentos([x.nombre, x.paraQue, x.forma, x.id].join(' ')).includes(q));
  }

  return { FICHAS, ficha, desbloqueada, buscar };
});
