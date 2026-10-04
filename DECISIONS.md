# Decisiones ante ambigüedades

- Los errores de sintaxis de fórmula (paréntesis sin cerrar, comas como separador…) se muestran como `#ERROR!`, un código extra aparte de los cinco que pide SPEC §4, con explicación didáctica.
- En fórmulas se acepta tanto la coma como el punto decimal entre dígitos (`1,5` y `1.5`).
- Los números se muestran con `toLocaleString('es-ES')`, máximo 2 decimales; en el navegador de Daniel, los de 5 cifras o más llevan separador de miles.
- Los valores «a mano» (sin `=`) en una celda objetivo se rechazan como `noFormula`.
- Si una fórmula acierta con los datos actuales pero falla con los alternativos, se informa de «no se adapta» antes de comprobar los requisitos de función o referencias.
- Las celdas editables de cada misión son exactamente sus celdas objetivo.
- La población inicial de la aldea es la de la hoja de M3 (de 12 a 18), conocida desde el principio.
- M3 resta del stock de trigo el consumo diario; M4 acoge colonos según el balance (balance ÷ 1,5, entre 0 y 5), sin más mecánicas.
- Los trabajadores son 0 hasta completar M5 y 6 después.
- Edificios: Almacén (M1), Gallineros (M2), Oficina del capataz (M5) y Tablón de la aldea (M7).
- M7: el tipo del gráfico empieza sin elegir; el jugador pulsa «Dibujar gráfico» para previsualizar y «Entregar al mayordomo» para validar.
- Misiones completadas: se revisan en solo lectura desde la lista «Misiones»; no dan XP de nuevo.
- Semilla de la partida aleatoria (entre 1000 y 900999); los datos de cada misión salen de `semilla + 7919 × n.º de misión`.
- Hoja de M6: la columna A (días) y B3:B8 (fórmulas `=D2`…) son de solo lectura; solo se editan D2:D8 y E2:E8.
- El umbral de M6 se compara con «menor que» estricto.
- Si falla una celda de estado en M6, el mensaje remite a la pista 2 (donde se menciona `$`).
