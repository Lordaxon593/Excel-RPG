# CAMBIOS — Ronda 2 del prototipo "El nacimiento de la aldea"

Esta ronda **modifica el juego existente** (`src/`, `tests/`, `build.js`, `dist/aldea.html`). **No lo reescribas desde cero**: lee el código actual, aplica los cambios y conserva lo que funciona. Lee `CLAUDE.md` y `SPEC.md`; donde `CAMBIOS.md` contradiga a `SPEC.md`, manda `CAMBIOS.md`. Los hitos de esta ronda (§9) sustituyen a los de `CLAUDE.md`. El resto de reglas de `CLAUDE.md` siguen vigentes.

Origen: Daniel jugó la primera versión en Brave (ordenador) y encontró los fallos de §1. Además pidió un cambio de enfoque pedagógico (§3 y §4), una pantalla más clara (§2) y un sistema de equipo y práctica (§5).

Principio rector: **el juego debe enseñar antes de evaluar.** Daniel parte de cero; las misiones no pueden dar por sabido nada que no haya enseñado antes la Escuela o la lección de la misión.

## 1. Errores a corregir (obligatorio)

**E1 — Selección de celdas poco visible (Brave).** Al arrastrar para seleccionar se sombrea toda la página y las celdas elegidas apenas se distinguen. Arreglo: `user-select: none` en la hoja, resaltado claro del rango (fondo distinto y borde grueso), celda activa con borde marcado y la barra de fórmulas mostrando el rango (`E2:E6`). Soportar arrastrar con el ratón, Mayús+clic y Mayús+flechas.

**E2 — Celdas con error no muestran su fórmula.** Al seleccionar una celda que da error, la barra de fórmulas debe mostrar siempre el **texto original** de la celda. Al editar (doble clic, F2 o escribir), el editor se abre con ese texto cargado para poder corregirlo. Al empezar a teclear sobre una celda seleccionada sin pulsar F2, se reemplaza el contenido (como Excel), pero F2 y doble clic conservan el texto.

**E3 — Rellenar con el cuadradito de la esquina.** Además de Ctrl+D y el botón, la celda activa (o el rango) muestra un cuadradito en la esquina inferior derecha que se arrastra hacia abajo para rellenar, con ajuste de referencias relativas y respeto de las absolutas.

**E4 — Modo señalar.** Mientras se escribe una fórmula, un clic en otra celda inserta su referencia (`B3`) en la posición del cursor y se sigue editando. Solo cuando el cursor está justo tras `=`, `(`, `;` o un operador (`+ - * / ^ < > =`); en otro caso el clic termina la edición como ahora. Arrastrar inserta un rango (`B2:B8`). Un segundo clic antes de teclear otro carácter reemplaza la referencia recién insertada. Las referencias de la fórmula en edición se resaltan en la hoja con el mismo color que su texto en la barra de fórmulas. Enter confirma, Esc cancela. Extraer la lógica de "¿toca insertar referencia aquí?" a una función pura en `engine.js` y probarla.

**E5 — Faltaba enseñar las funciones.** Se resuelve con §3 y §4. Además, la **pista 2 de toda misión debe nombrar la función** (o el operador) que hay que usar.

**E6 — Mensajes de validación poco útiles.** "El valor no es el esperado" no basta. Diferenciar, sin revelar el valor esperado ni la fórmula: (a) el resultado tiene decimales y se pide un entero, (b) se esperaba texto y hay un número (o al revés), (c) hay un error de Excel en la celda (`#DIV/0!`, etc.) con su explicación, (d) el resultado es mayor o menor del esperado (solo la dirección), (e) la fórmula funciona ahora pero no se adapta a otros datos (ya existente). Siempre indicar la celda. Caso concreto detectado: en M4, `=B10/B11` en B14 daba decimales cuando se piden días completos; el mensaje (a) debe cubrirlo y la lección de M4 debe enseñar `ENTERO`.

**E7 — Aviso de rango falso.** El juego anunció "nuevo rango Aprendiz" cuando el rango no había cambiado. Mostrar el aviso de rango **solo si el rango nuevo es distinto del anterior**. Prueba automática: subir de nivel 1→2→3→4 no dispara aviso; un salto de nivel que cruce de rango (p. ej. 5→6) sí.

**E8 — Bloqueo en M6.** Daniel no pudo superar la antigua M6 ("Tiempos de escasez"). La causa no era un fallo del validador sino una misión demasiado cargada: introducía a la vez `$`, `SI`, comparaciones y texto entre comillas, sin haberlos enseñado. Se resuelve dividiéndola en dos misiones (ver §1b). Aun así, revisa los validadores de las dos misiones resultantes y añade pruebas de que **todas estas variantes equivalentes se aceptan**: `=SI(B2<$G$1;"RACIONAR";"NORMAL")`, `=SI($G$1>B2;"RACIONAR";"NORMAL")`, texto en minúsculas o con espacios sobrantes (comparar sin distinguir mayúsculas y con `trim`), y rellenado hacia abajo o con fórmulas escritas una a una. Y que **se rechaza con mensaje claro**: umbral escrito a mano (`40`), umbral sin `$` tras rellenar, coma en vez de `;`. Si encuentras un fallo, corrígelo y anótalo en `DECISIONS.md`.

## 1b. La antigua M6 se divide en dos misiones

Una idea nueva por misión. La antigua M7 (gráficos) pasa a ser **M8**. Hay ahora 8 misiones principales. El total de XP (350), el oro de las principales (150) y las estadísticas base finales de `SPEC.md` **no cambian**; solo se reparten.

### M6 — "El umbral" · Normal · 50 XP · 25 oro · +1 Lógica, +1 Finanzas · familia `compas`
- Lección previa: referencias absolutas (`$`). Ejemplo con otros datos (p. ej. un precio fijo en una celda que se aplica a una columna).
- Hoja: A1 "Día", B1 "Stock final (kg)", C1 "Margen sobre umbral"; A2:A8 días 1–7; B2:B8 enteros 20–140 (dato); F1 "Umbral (kg)", G1 entero 40–60. A10 pequeño texto de apoyo opcional.
- Objetivo: **C2:C8** = `B - $G$1` (cuántos kg quedan por encima o por debajo del umbral cada día), rellenando hacia abajo. Requisito: la fórmula debe usar `$G$1` o una referencia que siga apuntando a G1 tras rellenar.
- La validación con datos alternativos cambia el umbral, de modo que escribir el número a mano o usar una referencia relativa mal rellenada falla. En ese caso la pista 2 menciona el símbolo `$`.
- Consecuencia: Aldric apunta el umbral en la pizarra de la aldea.
- Etiquetas: `ref.absoluta`.

### M7 — "Racionamiento" · Normal · 50 XP · 25 oro · +1 Lógica · familia `balanza`
- Lección previa: `SI` y comparaciones (`<`, `>`, `=`), y el texto entre comillas. Ejemplo con otros datos (p. ej. notas: "APROBADO" / "SUSPENDIDO").
- Hoja: A1 "Día", B1 "Stock final (kg)", C1 "Estado"; A2:A8 días 1–7; B2:B8 enteros 20–140 (dato); F1 "Umbral (kg)", G1 entero 40–60.
- Objetivo: **C2:C8** = `SI(B < $G$1; "RACIONAR"; "NORMAL")`, rellenando hacia abajo. Requisito: función `SI`. Comparación del texto sin distinguir mayúsculas ni espacios sobrantes.
- Es algo más difícil que el ejemplo de la lección (hay que combinar `SI` con la referencia absoluta ya aprendida), pero no introduce nada nuevo.
- Consecuencia: se instaura la política de racionamiento; la aldea sobrevive al invierno.
- Etiquetas: `funcion.si`, `comparaciones`.

### M8 — "El tablón de la aldea" · Normal · 50 XP · 20 oro · +1 Análisis · familia `pincel`
Igual que la antigua M7 de `SPEC.md`.

El repaso opcional de M7 recuerda `$` (de M6) y el de M8 recuerda el rango de datos. Actualiza el Códice, los hitos y la partida completa de las pruebas a 8 misiones.

## 2. Rediseño de pantalla

Hay demasiada información a la vez. Estructura nueva:

- **Barra superior fija y delgada:** nombre, nivel, barra de XP en texto, oro y rango. Siempre visible.
- **Cuatro botones en la barra:** **Personaje** (hoja de personaje y estadísticas), **Equipo** (§5), **Aldea** (estado de la aldea + registro) y **Libro de funciones** (§4). Cada uno abre un **panel lateral** que se superpone por un lado sin desplazar la hoja, y se cierra al pulsar de nuevo, con Esc o fuera del panel. Un solo panel abierto a la vez.
- **Pantalla principal:** título de la misión, narrativa (plegable tras leerla), recuadro **"Qué tienes que hacer"** siempre visible, hoja de cálculo y botones **Entregar**, **Pista (n/3)**, **Rellenar hacia abajo** y **Preguntar a Aldric**.
- **Ventana emergente al completar una misión (solo en éxito):** resultado, XP, oro y estadísticas ganadas, subida de nivel si la hay, aviso de rango solo si cambia (E7), la consecuencia en la aldea y un único botón **Continuar** (Intro también lo activa) que abre lo siguiente. Mientras está abierta no se ve el resto. Los fallos de entrega **no** usan ventana emergente: el mensaje queda junto al botón Entregar.
- Ambientación barata: iconos de texto/emoji (🌾 🥚 ⚖) y paleta coherente. Nada de imágenes ni sprites.
- Mantener accesibilidad: foco visible, todo operable con teclado, Esc cierra paneles y ventanas.

## 3. La Escuela (entorno nuevo, antes de la Aldea)

Entorno `escuela`: lecciones interactivas cortas, **sin XP** (el objetivo es solo aprender lo básico). Se completan con ejercicios guiados que se validan con el motor. Se puede saltar con confirmación ("Saltar la Escuela"). Al terminar (o saltar) se desbloquea la Aldea.

Cuatro lecciones, cada una con explicación breve (máx. ~80 palabras) y 1–3 ejercicios guiados:

1. **La hoja:** filas, columnas, celdas y su nombre (`B3`). Ejercicio: hacer clic en una celda indicada.
2. **Moverse y seleccionar:** flechas, clic, arrastrar, Mayús; qué es un rango (`A1:B5`). Ejercicio: seleccionar un rango indicado.
3. **Escribir datos y fórmulas:** texto y números, coma decimal, Enter y Esc, la fórmula empieza por `=`, operadores con referencias (`=A1+B1`) y modo señalar. Ejercicio: escribir en C1 una fórmula que sume A1 y B1.
4. **Funciones:** qué es una función, nombre + paréntesis + argumentos, el separador `;`, un rango como argumento. Ejercicio guiado con una función que se enseña en el momento (p. ej. `=SUMA(A1:A4)`), con datos distintos a los de la misión M1.

La lógica de validación de los ejercicios de la Escuela debe ser testeable sin DOM (estado de selección, contenido de celdas).

## 4. Lecciones por misión y Libro de funciones

**Cada misión de la Aldea abre con una lección del mayordomo (Maese Aldric)** antes de mostrar la hoja:
- Presenta la(s) función(es) nueva(s): para qué sirve, forma (`=NOMBRE(rango)`) y errores comunes.
- Incluye un **ejemplo resuelto** en una mini-hoja de solo lectura con datos distintos a los de la misión.
- Botón "Empezar misión". La lección se puede reabrir después.
- **La misión debe ser algo más difícil que el ejemplo pero resolverse con lo enseñado.** Ajusta el enunciado si hace falta.

Qué enseña cada lección: M1 `SUMA`; M2 referencias relativas y rellenar hacia abajo; M3 operadores con referencias (breve, repaso); M4 `PROMEDIO` y `ENTERO` (dos páginas); M5 `MAX`, `MIN`, `CONTAR` y el ratio por fila; M6 referencias absolutas `$`; M7 `SI` con comparaciones y texto (dos páginas); M8 gráficos (rango, tipo, título). Cada misión enseña **una sola idea nueva** (M4 y M5 agrupan funciones muy parecidas).

**Repasos:** en M3, M5 y M7 el mayordomo recuerda en una línea una función ya vista, con enlace a su ficha. Opcionales, sin penalización.

**Libro de funciones** (sustituye al Códice): una ficha por función o concepto, que se desbloquea al enseñarlo: nombre, para qué sirve, forma, ejemplo y errores típicos. Se abre como panel lateral. El botón **Preguntar a Aldric** (en cualquier misión) abre el libro con un buscador/selector. Las etiquetas de competencias de `SPEC.md §9` se mantienen y siguen vinculadas.

## 5. Equipo, maestría y misiones de práctica

**Modelo de progresión** (decidido por Daniel):
- **Misiones principales:** enseñan, dan XP y suben las **estadísticas del personaje** (como ahora).
- **Misiones secundarias (práctica):** suben la **maestría de los objetos de equipo** y dan algo de oro. No dan XP.
- Cada nivel de objeto alcanzado da **+1 a una estadística** como bono (se muestra aparte de la base).

**Cuatro objetos, uno por familia de funciones:**

| Objeto | Familia | Estadística del bono |
|---|---|---|
| Ábaco | cálculo: operadores, SUMA, PROMEDIO, MAX, MIN, CONTAR, ENTERO | Finanzas |
| Compás | moverse por la hoja: referencias relativas y absolutas, rellenar | Productividad |
| Balanza | lógica: SI y comparaciones | Lógica |
| Pincel | gráficos | Análisis |

**Niveles:** madera, piedra, cobre, bronce, plata, oro. Umbrales de puntos de maestría: piedra 4, cobre 10, bronce 16, plata y oro definidos pero marcados "Próximamente" (no alcanzables con el contenido actual).

**Misiones de práctica generadas:** cada familia tiene 2–3 **plantillas** que generan una hoja con datos nuevos por semilla y reutilizan el motor de validación (datos alternativos incluidos). Dificultad igual o algo menor que la misión principal de esa familia. Cada plantilla se puede hacer **hasta 3 veces** (con datos distintos); después queda agotada, para impedir repetir sin límite. Puntos: **1** por práctica correcta, **2** si se resuelve sin usar pistas. Oro: 5 por práctica. Las prácticas de una familia se desbloquean cuando se ha completado la lección de esa familia.

**Panel Equipo:** cada objeto con su nivel, barra de progreso en texto y una línea de qué hacer para mejorarlo, p. ej. "Para subir tu Ábaco, completa prácticas de cálculo en el Almacén". Mostrar las prácticas disponibles y cuántas repeticiones quedan.

**Sin puertas en esta versión:** ninguna misión exige objeto, nivel ni atributo. El camino principal queda siempre abierto. Las puertas por requisito llegarán con la Ciudad.

## 6. Estructura de datos preparada para la Ciudad (sin implementar la Ciudad)

Cada misión (principal, secundaria o de Escuela) declara además estos campos: `tipo` (`principal` | `secundaria` | `escuela`), `entorno` (`escuela` | `aldea`; `ciudad` reservado), `negocio` (`almacen`, `granja`, `capataz`, `tablon`, …), `familia` (`abaco` | `compas` | `balanza` | `pincel`) y `requisitos` (lista de `{tipo: 'objeto'|'stat'|'mision', id, valor}`; **vacía en todas las misiones de esta versión**). Implementa y prueba una función `requisitosCumplidos(estado, mision)` y otra que devuelve qué falta, aunque aquí siempre devuelvan "cumplido". Esto evita reescribir el juego cuando se añadan negocios y caminos no lineales.

## 7. Fuera de alcance en esta ronda

Logros y recompensas estéticas; niveles de objeto por encima de bronce; la Ciudad, el mundo abierto y las puertas; más misiones principales; imágenes y sonido. Si algo falta, decide lo más simple y anótalo en `DECISIONS.md`.

## 8. Pruebas nuevas

- Motor: lógica de modo señalar (§1 E4), relleno por arrastre, selección y rangos.
- Validación: mensajes de E6 en cada caso, variantes de M6 y M7 (E8), pista 2 nombra siempre la función.
- Juego: aviso de rango solo al cambiar (E7), progresión de la Escuela, desbloqueo de la Aldea, maestría y niveles de objetos, límite de 3 repeticiones por plantilla, bonos de estadística sin duplicar la base, requisitos vacíos.
- Partida completa actualizada: Escuela + 8 misiones (M6 dividida en M6 y M7, gráficos pasa a M8) + prácticas. Mantener los totales de XP (350), nivel 4, oro de las principales (150) y estadísticas base de `SPEC.md`; los bonos y el oro de prácticas se comprueban aparte.
- Datos alternativos: 20 semillas para principales y prácticas.
- Guardado: el estado nuevo (Escuela, maestría, repeticiones) se guarda y carga sin pérdida, y una partida guardada de la versión anterior se carga sin romperse (migración mínima).
- Build: mantener las comprobaciones de `build.js`.

## 9. Hitos (en este orden, `npm test` en verde y un commit en español por hito)

1. **Núcleo y errores:** E1–E8 en la parte lógica (motor, validación, rango, M6), campos de §6, pruebas.
2. **Contenido y sistemas:** Escuela, lecciones por misión, Libro de funciones (datos), equipo, maestría, prácticas, migración de guardado, pruebas de §8.
3. **Interfaz:** rediseño de §2, paneles, ventana emergente, E1–E4 en `ui.js`, regenerar `dist/aldea.html`, actualizar `LEEME.md` y `DECISIONS.md`.

**Cierre:** `dist/aldea.html` commiteado, push a la rama de la sesión y pull request. Mensaje final de máximo 12 líneas, indicando qué partes de la interfaz no están cubiertas por pruebas.
