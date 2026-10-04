# Decisiones ante ambigüedades

## Ronda 1
- Los errores de sintaxis de fórmula (paréntesis sin cerrar, comas como separador…) se muestran como `#ERROR!`, un código extra aparte de los cinco que pide SPEC §4, con explicación didáctica.
- En fórmulas se acepta tanto la coma como el punto decimal entre dígitos (`1,5` y `1.5`).
- Los números se muestran con `toLocaleString('es-ES')`, máximo 2 decimales (los de 5 cifras o más llevan separador de miles).
- Un valor «a mano» (sin `=`) en una celda objetivo se rechaza como `noFormula`.
- Si una fórmula acierta con los datos actuales pero falla con los alternativos, se informa de «no se adapta» antes de comprobar los requisitos de función o referencias.
- Las celdas editables de cada misión son exactamente sus celdas objetivo.
- La población inicial de la aldea es la de la hoja de M3 (de 12 a 18), conocida desde el principio.
- M3 resta del stock de trigo el consumo diario; M4 acoge colonos según el balance (balance ÷ 1,5, entre 0 y 5), sin más mecánicas.
- Los trabajadores son 0 hasta completar M5 y 6 después.
- Edificios: Almacén (M1), Gallineros (M2), Oficina del capataz (M5) y Tablón de la aldea (M8).
- Misiones completadas: se revisan en solo lectura desde la lista de misiones del panel Aldea; no dan XP de nuevo.
- Semilla de la partida aleatoria (entre 1000 y 900999); los datos de cada misión salen de `semilla + 7919 × n.º de misión`.

## Ronda 2 (CAMBIOS.md)
- Se añaden tres módulos sin DOM al build (`libro.js`, `escuela.js`, `practicas.js`) para no inflar `missions.js` ni `game.js`.
- **E8:** los validadores de M6 y M7 no tenían fallos propios; la causa del bloqueo era la carga de la antigua M6. Se añaden conjuntos de datos fijos (`variantes`, umbrales 41 y 59 con valores a ambos lados) para detectar siempre un umbral escrito a mano, sin depender de la semilla.
- M6 exige que la fórmula apunte a `G1` (con `$` o escrita una a una); un umbral a mano o `G1` sin fijar tras rellenar se rechazan, y el mensaje remite a la pista 2 (donde está el `$`).
- M7 compara el texto sin distinguir mayúsculas ni espacios sobrantes (`textoFlexible`); las demás misiones de texto exigen el texto exacto.
- **E6:** el mensaje «tiene decimales y se pide un entero» solo se usa en las celdas marcadas `entero` (las que siempre dan un entero); las demás dicen solo «mayor» o «menor».
- Los mensajes de fallo agrupan las celdas con el mismo motivo (por ejemplo «E3, E5: …»).
- **E7:** el aviso de rango sale solo si cambia el rango; el aviso de nivel es aparte y no menciona el rango.
- **E4:** el clic inserta referencia si, ignorando espacios, el cursor está tras `= ( ; + - * / ^ < >` y fuera de comillas; arrastrar inserta un rango; un segundo clic seguido sustituye la referencia recién insertada.
- Los colores de las referencias en edición son 6 y se repiten por orden de aparición; se usan en la hoja y en la barra de fórmulas.
- **E3:** el cuadradito repite el patrón de las filas seleccionadas hacia abajo (como Excel); Ctrl+D y el botón copian la celda superior de cada columna seleccionada.
- El minitutorial inicial se sustituye por la Escuela: la bienvenida solo pide el nombre.
- Escuela: 4 lecciones y 7 ejercicios, comprobados con un botón «Comprobar»; saltarla pide confirmación con el cuadro nativo del navegador. Las lecciones de la Escuela no dan XP.
- Una partida que salta la Escuela no desbloquea las fichas del Libro de las lecciones de la Escuela; esas fichas se desbloquean con las lecciones de las misiones (M1 incluye SUMA, rangos y fórmulas).
- Las fichas del Libro se desbloquean al pulsar «Empezar misión» tras la lección (o al completar la lección de la Escuela que las enseña). Al completar una misión también se marca su lección como vista.
- Las prácticas se desbloquean al ver la lección de la misión indicada en cada plantilla (por ejemplo, la de PROMEDIO/ENTERO con M4), no solo la de su familia, para no pedir funciones que aún no se han enseñado.
- 9 plantillas: Ábaco 3, Compás 2, Balanza 2, Pincel 2. Cada repetición usa una semilla distinta (`semilla + 997 × plantilla + 131 × repetición`).
- Maestría: 1 punto por práctica con pistas, 2 sin pistas; 5 de oro; sin XP; máximo 3 repeticiones por plantilla. Una práctica abandonada no cuenta como repetición.
- Objetos: umbrales de maestría 0, 4, 10, 16 (plata 24 y oro 34 definidos pero «Próximamente»); el nivel se limita a bronce. El bono es +1 a la estadística del objeto por nivel alcanzado (piedra +1, cobre +2, bronce +3) y se muestra aparte de la base.
- Con las prácticas actuales solo el Ábaco puede llegar a bronce (3 plantillas × 3 repeticiones × 2 puntos = 18).
- M6 y M7 reparten la antigua M6 (100 XP, 50 de oro, +2 Lógica, +1 Finanzas) en 50 XP / 25 oro / +1 Lógica +1 Finanzas y 50 XP / 25 oro / +1 Lógica.
- Los campos `tipo`, `entorno`, `negocio`, `familia` y `requisitos` se asignan a todas las misiones; `requisitosCumplidos` y `requisitosFaltantes` existen y se prueban, pero devuelven «cumplido» porque ninguna misión tiene requisitos. Los requisitos de tipo `objeto` comparan el nivel del objeto.
- Si hay una práctica en curso, las pistas, la edición y la entrega actúan sobre ella; la misión principal conserva su borrador.
- **Migración del guardado:** una partida de la versión 1 se carga como Escuela saltada y con las lecciones de las misiones ya hechas vistas. Si había completado la antigua M6, cuenta como M6 y M7 completadas (misma XP, oro y estadísticas) y su hoja se ve vacía en modo solo lectura; los gráficos de la antigua M7 pasan a M8.
- Ventana emergente solo en éxito, con «Continuar» (Intro y Esc también); los fallos se muestran junto al botón Entregar.
- Los paneles laterales se cierran con el mismo botón, con Esc o con un clic fuera; mientras uno está abierto no se puede tocar la hoja.
- La detección del doble clic se hace a mano (450 ms) porque la hoja se repinta al seleccionar y el navegador podría perder el evento `dblclick`.
