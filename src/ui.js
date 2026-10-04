/* Interfaz: todo lo que toca el DOM. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const E = window.Engine, M = window.Misiones, J = window.Juego;
  const raiz = document.getElementById('app');
  const NMISIONES = M.MISIONES.length;

  const semillaNueva = () => 1000 + Math.floor(Math.random() * 900000);
  let estado = J.cargarLocal() || J.nuevaPartida('', semillaNueva());

  const ui = {
    ver: 0, sel: { c: 0, r: 1 }, anchor: { c: 0, r: 1 }, editando: null,
    mensajes: [], resultado: {}, aviso: null, estadoMsg: '', enfocarHoja: false,
    grafico: { rango: '', tipo: '', titulo: '' }, vistaGrafico: false, errorImportar: ''
  };
  ui.ver = Math.min(estado.misionActual, NMISIONES);

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const guardar = () => J.guardarLocal(estado);
  const pantalla = () => (!estado.iniciada ? 'bienvenida' : !estado.tutorialVisto ? 'tutorial' : 'juego');

  /* ---------- Contexto de la misión que se está viendo ---------- */
  function contexto() {
    const idx = ui.ver;
    const m = M.MISIONES[idx];
    const datos = m.generarDatos(estado.semilla);
    const soloLectura = idx < estado.misionActual;
    const comp = estado.completadas[m.id];
    const jugador = soloLectura ? (comp ? comp.celdas : {}) : (estado.borradores[m.id] || {});
    const celdas = Object.assign({}, datos.celdas);
    const edit = M.celdasEditables(m);
    edit.forEach((k) => { if (jugador[k]) celdas[k] = jugador[k]; });
    return { idx, m, datos, soloLectura, edit: new Set(edit), hoja: E.Hoja.desde(celdas, datos.cols, datos.filas) };
  }

  /* ---------- Gráfico SVG ---------- */
  function svgGrafico(datos, g) {
    const mt = /^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/.exec(String(g.rango || '').replace(/\s/g, '').toUpperCase());
    if (!mt) return null;
    const c1 = E.letraACol(mt[1]), c2 = E.letraACol(mt[3]);
    const r1 = parseInt(mt[2], 10), r2 = parseInt(mt[4], 10);
    if (c2 <= c1 || r2 <= r1) return null;
    const pts = [];
    for (let r = r1 + 1; r <= r2; r++) {
      const etiqueta = datos.celdas[E.refA1(c1, r)];
      const v = parseFloat(String(datos.celdas[E.refA1(c2, r)] || '').replace(',', '.'));
      if (etiqueta !== undefined && !isNaN(v)) pts.push({ etiqueta, v });
    }
    if (!pts.length) return null;
    const W = 440, H = 250, izq = 40, der = 12, sup = 40, inf = 40;
    const max = Math.max.apply(null, pts.map((p) => p.v)) || 1;
    const aw = W - izq - der, ah = H - sup - inf;
    const paso = aw / pts.length;
    const y = (v) => sup + ah - (v / max) * ah;
    let s = `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico: ${esc(g.titulo || '')}">`;
    s += `<text x="${W / 2}" y="22" text-anchor="middle" class="g-titulo">${esc(g.titulo || '')}</text>`;
    s += `<line x1="${izq}" y1="${sup + ah}" x2="${W - der}" y2="${sup + ah}" class="g-eje"/><line x1="${izq}" y1="${sup}" x2="${izq}" y2="${sup + ah}" class="g-eje"/>`;
    if (g.tipo === 'líneas' || g.tipo === 'lineas') {
      const xy = pts.map((p, i) => [izq + paso * i + paso / 2, y(p.v)]);
      s += `<polyline class="g-linea" fill="none" points="${xy.map((q) => q.join(',')).join(' ')}"/>`;
      xy.forEach((q, i) => {
        s += `<circle cx="${q[0]}" cy="${q[1]}" r="4" class="g-barra"/><text x="${q[0]}" y="${q[1] - 8}" text-anchor="middle" class="g-valor">${pts[i].v}</text>`;
      });
    } else {
      pts.forEach((p, i) => {
        const x = izq + paso * i + paso * 0.15, bw = paso * 0.7, yy = y(p.v);
        s += `<rect x="${x}" y="${yy}" width="${bw}" height="${sup + ah - yy}" class="g-barra"/><text x="${x + bw / 2}" y="${yy - 5}" text-anchor="middle" class="g-valor">${p.v}</text>`;
      });
    }
    pts.forEach((p, i) => {
      s += `<text x="${izq + paso * i + paso / 2}" y="${sup + ah + 16}" text-anchor="middle" class="g-etq">${esc(String(p.etiqueta).slice(0, 9))}</text>`;
    });
    return s + '</svg>';
  }

  /* ---------- Piezas de la interfaz ---------- */
  function htmlCabecera() {
    const n = J.nivel(estado.xp);
    const stats = J.STATS.map((s) => `${J.NOMBRES_STATS[s]} <b>${estado.stats[s]}</b>`).join(' · ');
    return `<header class="cabecera">
      <div class="fila-cab"><span class="nombre">${esc(estado.nombre)}</span> · ${esc(estado.clase)} · Rango: <b>${esc(J.rango(n))}</b> · Nivel <b>${n}</b> · Oro <b>${estado.oro}</b></div>
      <div class="fila-cab"><span class="xp" aria-label="Experiencia">XP ${esc(J.barraXP(estado.xp))}</span> · Equipo: ${esc(estado.equipo)}</div>
      <div class="fila-cab stats">${stats}</div>
      <div class="fila-cab botones-cab">
        <button data-act="exportar">Exportar partida</button>
        <button data-act="importar">Importar partida</button>
        <button data-act="nueva">Nueva partida</button>
        <input type="file" id="archivo" accept=".json,application/json" hidden>
        ${ui.errorImportar ? `<span class="error" role="alert">${esc(ui.errorImportar)}</span>` : ''}
      </div></header>`;
  }

  function htmlIzquierda() {
    const a = J.calcularAldea(estado);
    const misiones = M.MISIONES.map((m, i) => {
      const hecha = i < estado.misionActual;
      const actual = i === estado.misionActual;
      const bloqueada = i > estado.misionActual;
      const etiqueta = `${i + 1}. ${m.titulo}${hecha ? ' ✓' : ''}`;
      return `<li>${bloqueada ? `<span class="bloqueada">${esc(etiqueta)} (bloqueada)</span>` :
        `<button class="enlace${i === ui.ver ? ' activo' : ''}" data-act="ver" data-i="${i}">${esc(etiqueta)}${actual ? ' ◄' : ''}</button>`}</li>`;
    }).join('');
    const registro = estado.registro.length
      ? estado.registro.map((r) => `<li><b>${esc(r.titulo)}:</b> ${esc(r.texto)}</li>`).join('')
      : '<li class="suave">Aún no ha pasado nada en la aldea.</li>';
    return `<aside class="izquierda">
      <section class="panel"><h2>Estado de la aldea</h2><ul class="lista-simple">
        <li>Trigo: <b>${a.trigo.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</b> kg</li>
        <li>Huevos: <b>${a.huevos}</b></li>
        <li>Población: <b>${a.poblacion}</b></li>
        <li>Trabajadores: <b>${a.trabajadores}</b></li>
        <li>Edificios: <b>${a.edificios.length}</b>${a.edificios.length ? ' (' + esc(a.edificios.join(', ')) + ')' : ''}</li></ul></section>
      <section class="panel"><h2>Misiones</h2><ul class="lista-simple">${misiones}</ul></section>
      <section class="panel"><h2>Registro</h2><ul class="registro">${registro}</ul></section>
    </aside>`;
  }

  function htmlCodice() {
    const items = J.codice(estado).map((c) => c.desbloqueada
      ? `<li class="desbloqueada">✓ ${esc(c.nombre)} <span class="suave">(${esc(c.mision)})</span></li>`
      : `<li class="pendiente">○ ${esc(c.nombre)}</li>`).join('');
    return `<aside class="derecha"><section class="panel"><h2>Códice</h2><ul class="lista-simple">${items}</ul></section></aside>`;
  }

  function rangoSel() {
    const { anchor, sel } = ui;
    if (anchor.c !== sel.c) return { c: sel.c, r1: sel.r, r2: sel.r };
    return { c: sel.c, r1: Math.min(anchor.r, sel.r), r2: Math.max(anchor.r, sel.r) };
  }

  function htmlHoja(cx) {
    const { hoja, datos } = cx;
    const rg = rangoSel();
    const anchos = [];
    for (let c = 0; c < datos.cols; c++) {
      let mx = 4;
      for (let r = 1; r <= datos.filas; r++) mx = Math.max(mx, hoja.texto(E.refA1(c, r)).length);
      anchos.push(Math.min(30, mx) + 2);
    }
    let h = '<div class="hoja-wrap" tabindex="0" role="grid" aria-label="Hoja de cálculo. Flechas para moverse, F2 para editar, Ctrl+D para rellenar hacia abajo"><table class="hoja"><thead><tr><th class="esq"></th>';
    for (let c = 0; c < datos.cols; c++) h += `<th class="cab-col" style="min-width:${anchos[c]}ch">${E.colALetra(c)}</th>`;
    h += '</tr></thead><tbody>';
    for (let r = 1; r <= datos.filas; r++) {
      h += `<tr><th class="cab-fila">${r}</th>`;
      for (let c = 0; c < datos.cols; c++) {
        const ref = E.refA1(c, r);
        const v = hoja.valor(ref);
        const cls = ['celda'];
        if (cx.edit.has(ref)) cls.push(cx.soloLectura ? 'hecha' : 'editable');
        if (typeof v === 'number') cls.push('num');
        if (E.esError(v)) cls.push('err');
        if (c === ui.sel.c && r === ui.sel.r) cls.push('sel');
        else if (c === rg.c && r >= rg.r1 && r <= rg.r2) cls.push('rango');
        const res = ui.resultado[ref];
        if (res === 'ok') cls.push('ok'); else if (res) cls.push('mal');
        const titulo = E.esError(v) ? ` title="${esc(v.codigo + ': ' + v.explicacion)}"` : '';
        let contenido;
        if (ui.editando && ui.editando.ref === ref) {
          contenido = `<input class="celda-input" value="${esc(ui.editando.texto)}" spellcheck="false" autocomplete="off" aria-label="Editando ${ref}">`;
        } else contenido = esc(hoja.texto(ref));
        h += `<td class="${cls.join(' ')}" data-ref="${ref}"${titulo}>${contenido}</td>`;
      }
      h += '</tr>';
    }
    return h + '</tbody></table></div>';
  }

  function htmlBarra(cx) {
    const ref = E.refA1(ui.sel.c, ui.sel.r);
    const raw = ui.editando ? ui.editando.texto : (cx.hoja.crudo(ref) || '');
    const v = cx.hoja.valor(ref);
    const expl = E.esError(v) ? `<div class="explica error" role="status">${esc(v.codigo)}: ${esc(v.explicacion)}</div>` : '';
    return `<div class="barra-formulas"><span class="nombre-celda">${ref}</span><span class="fx">fx</span><span id="barra-texto" class="barra-texto">${esc(raw)}</span></div>${expl}`;
  }

  function htmlGraficoPanel(cx) {
    if (cx.soloLectura) {
      const g = estado.grafico;
      return g ? `<div class="panel-grafico">${svgGrafico(cx.datos, g) || ''}</div>` : '';
    }
    const g = ui.grafico;
    const dibujo = ui.vistaGrafico ? (svgGrafico(cx.datos, g) || '<p class="error">No se puede dibujar un gráfico con ese rango. Escríbelo como CELDA:CELDA (por ejemplo, de la esquina superior izquierda a la inferior derecha).</p>') : '';
    return `<div class="panel-grafico"><h3>Panel de gráfico</h3>
      <label>Rango de datos <input type="text" data-campo="rango" value="${esc(g.rango)}" placeholder="CELDA:CELDA" autocomplete="off"></label>
      <label>Tipo de gráfico <select data-campo="tipo">
        <option value=""${g.tipo === '' ? ' selected' : ''}>Elige un tipo…</option>
        <option value="columnas"${g.tipo === 'columnas' ? ' selected' : ''}>Columnas</option>
        <option value="líneas"${g.tipo === 'líneas' ? ' selected' : ''}>Líneas</option></select></label>
      <label>Título <input type="text" data-campo="titulo" value="${esc(g.titulo)}" autocomplete="off"></label>
      <button data-act="dibujar">Dibujar gráfico</button>${dibujo}</div>`;
  }

  function htmlAviso() {
    const r = ui.aviso;
    if (!r) return '';
    const ganancias = Object.keys(r.stats).map((k) => `+${r.stats[k]} ${J.NOMBRES_STATS[k]}`).join(', ');
    return `<div class="aviso ok" role="status"><strong>¡Misión completada!</strong> +${r.xp} XP · +${r.oro} oro · ${esc(ganancias)}
      <p>${esc(r.consecuencia)}</p>${r.mensajeNivel ? `<p class="nivel">${esc(r.mensajeNivel)}</p>` : ''}
      <button data-act="siguiente">${estado.misionActual >= NMISIONES ? 'Ver el resumen final' : 'Siguiente misión'}</button></div>`;
  }

  function htmlFinal() {
    const r = J.resumenFinal(estado);
    const stats = J.STATS.map((s) => `<li>${J.NOMBRES_STATS[s]}: <b>${r.stats[s]}</b></li>`).join('');
    const tablon = estado.grafico ? `<section class="panel"><h2>Tablón de la aldea</h2>${svgGrafico(M.MISIONES[7].generarDatos(estado.semilla), estado.grafico) || ''}</section>` : '';
    return `<section class="panel final"><h1>¡La aldea ha nacido!</h1>
      <p>${esc(r.nombre)}, has pasado de Aprendiz a ${esc(r.rango)} usando solo fórmulas de Excel.</p>
      <ul class="lista-simple"><li>Nivel: <b>${r.nivel}</b> (${esc(r.rango)})</li><li>XP total: <b>${r.xp}</b></li><li>Oro: <b>${r.oro}</b></li>${stats}
      <li>Códice completado: <b>${r.codiceDesbloqueadas}/${r.codiceTotal}</b></li></ul>
      <p class="proximamente">Próximamente: más misiones (Bosque de las Fórmulas).</p></section>${tablon}`;
  }

  function htmlCentro() {
    if (ui.ver >= NMISIONES) return `<main class="centro">${htmlFinal()}</main>`;
    const cx = contexto();
    const m = cx.m;
    const usadas = estado.pistas[m.id] || 0;
    const pistas = !cx.soloLectura && usadas ? `<ol class="pistas">${m.pistas.slice(0, usadas).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : '';
    const msgs = ui.mensajes.length ? `<ul class="mensajes error" role="alert">${ui.mensajes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    const botones = cx.soloLectura
      ? '<p class="suave">Misión completada: la estás revisando en modo solo lectura.</p>'
      : `<div class="botones">
          <button class="principal" data-act="entregar">Entregar al mayordomo</button>
          <button data-act="pista"${usadas >= 3 ? ' disabled' : ''}>Pista (${usadas}/3)</button>
          ${m.grafico ? '' : '<button data-act="rellenar">Rellenar hacia abajo</button>'}
        </div>`;
    return `<main class="centro">
      <section class="panel mision"><h2>Misión ${cx.idx + 1}: ${esc(m.titulo)}</h2>
        <p class="meta">${esc(m.dificultad)} · ${m.xp} XP · ${m.oro} oro</p>
        ${m.texto.map((t) => `<p>${esc(t)}</p>`).join('')}
        <div class="que-hacer"><h3>Qué tienes que hacer</h3><ul>${m.queHacer.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      </section>
      ${htmlAviso()}
      <section class="panel">
        ${m.grafico ? htmlHoja(cx) + htmlGraficoPanel(cx) : htmlBarra(cx) + htmlHoja(cx)}
        <div class="estado-msg" role="status">${esc(ui.estadoMsg)}</div>
        ${botones}${msgs}${pistas}
      </section></main>`;
  }

  function htmlBienvenida() {
    return `<div class="pantalla"><section class="panel"><h1>Excel RPG: El nacimiento de la aldea</h1>
      ${M.INTRO.bienvenida.map((t) => `<p>${esc(t)}</p>`).join('')}
      <label>¿Cómo te llamas? <input type="text" id="nombre" value="Daniel" maxlength="30" autocomplete="off"></label>
      <div class="botones"><button class="principal" data-act="empezar">Empezar</button>
      <button data-act="importar">Importar partida</button></div>
      <input type="file" id="archivo" accept=".json,application/json" hidden>
      ${ui.errorImportar ? `<p class="error" role="alert">${esc(ui.errorImportar)}</p>` : ''}</section></div>`;
  }

  function htmlTutorial() {
    return `<div class="pantalla"><section class="panel"><h1>Antes de empezar</h1>
      ${M.INTRO.tutorial.map((t) => `<h3>${esc(t.titulo)}</h3><p>${esc(t.texto)}</p>`).join('')}
      <div class="botones"><button class="principal" data-act="tutorial-ok">Entendido, ¡a la aldea!</button></div></section></div>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const p = pantalla();
    if (p === 'bienvenida') raiz.innerHTML = htmlBienvenida();
    else if (p === 'tutorial') raiz.innerHTML = htmlTutorial();
    else raiz.innerHTML = htmlCabecera() + `<div class="rejilla">${htmlIzquierda()}${htmlCentro()}${htmlCodice()}</div>`;
    if (ui.editando) {
      const i = raiz.querySelector('.celda-input');
      if (i) { i.focus(); const n = i.value.length; i.setSelectionRange(n, n); }
    } else if (ui.enfocarHoja) {
      const w = raiz.querySelector('.hoja-wrap');
      if (w && w.focus) w.focus({ preventScroll: true });
    }
    ui.enfocarHoja = false;
  }

  /* ---------- Acciones ---------- */
  function iniciarEdicion(ref, inicial) {
    if (ui.ver >= NMISIONES) return;
    const cx = contexto();
    ui.estadoMsg = '';
    if (cx.soloLectura) { ui.estadoMsg = 'Esta misión ya está completada: solo puedes mirarla.'; render(); return; }
    if (!cx.edit.has(ref)) { ui.estadoMsg = `La celda ${ref} es de solo lectura. Solo puedes editar las celdas de «Qué tienes que hacer».`; render(); return; }
    ui.editando = { ref, texto: inicial === undefined || inicial === null ? (cx.hoja.crudo(ref) || '') : inicial };
    render();
  }

  function confirmarEdicion(dc, dr) {
    if (!ui.editando) return;
    const { ref, texto } = ui.editando;
    J.editarCelda(estado, ref, texto.trim() === '' ? '' : texto.trim());
    delete ui.resultado[ref];
    ui.editando = null;
    guardar();
    if (dc || dr) mover(dc, dr, false);
    ui.enfocarHoja = true;
    render();
  }

  function mover(dc, dr, extender) {
    const cx = contexto();
    const c = Math.max(0, Math.min(cx.datos.cols - 1, ui.sel.c + dc));
    const r = Math.max(1, Math.min(cx.datos.filas, ui.sel.r + dr));
    ui.sel = { c, r };
    if (!extender) ui.anchor = { c, r };
  }

  function rellenar() {
    if (ui.editando) confirmarEdicion(0, 0);
    const cx = contexto();
    ui.estadoMsg = '';
    if (cx.soloLectura) ui.estadoMsg = 'Esta misión ya está completada: solo puedes mirarla.';
    else {
      const rg = rangoSel();
      if (rg.r2 === rg.r1) ui.estadoMsg = 'Selecciona varias celdas de arriba abajo (clic en la primera y Mayús+clic en la última) y vuelve a pulsar Rellenar hacia abajo.';
      else {
        const superior = cx.hoja.crudoCR(rg.c, rg.r1);
        if (!superior) ui.estadoMsg = 'La celda superior de la selección está vacía: escribe primero la fórmula allí.';
        else {
          const nuevos = E.rellenarAbajo(superior, rg.r2 - rg.r1);
          let hechas = 0;
          nuevos.forEach((raw, i) => {
            const ref = E.refA1(rg.c, rg.r1 + 1 + i);
            if (cx.edit.has(ref) && J.editarCelda(estado, ref, raw)) { delete ui.resultado[ref]; hechas++; }
          });
          ui.estadoMsg = hechas ? `Fórmula copiada en ${hechas} celda${hechas === 1 ? '' : 's'}.` : 'Ninguna de las celdas seleccionadas se puede editar.';
          guardar();
        }
      }
    }
    ui.enfocarHoja = true;
    render();
  }

  function entregar() {
    if (ui.editando) confirmarEdicion(0, 0);
    const cx = contexto();
    if (cx.soloLectura) return;
    const entrega = estado.borradores[cx.m.id] || {};
    const r = J.entregar(estado, entrega, cx.m.grafico ? Object.assign({}, ui.grafico) : undefined);
    guardar();
    ui.estadoMsg = '';
    if (r.ok) { ui.aviso = r; ui.mensajes = []; ui.resultado = r.porCelda; }
    else { ui.aviso = null; ui.mensajes = r.mensajes; ui.resultado = cx.m.grafico ? {} : r.porCelda; }
    if (cx.m.grafico) ui.vistaGrafico = true;
    render();
  }

  function reiniciarUI() {
    ui.ver = Math.min(estado.misionActual, NMISIONES);
    ui.sel = { c: 0, r: 1 }; ui.anchor = { c: 0, r: 1 };
    ui.editando = null; ui.mensajes = []; ui.resultado = {}; ui.aviso = null; ui.estadoMsg = '';
    ui.grafico = { rango: '', tipo: '', titulo: '' }; ui.vistaGrafico = false;
  }

  function exportar() {
    try {
      const blob = new Blob([J.serializar(estado)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aldea-partida.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      ui.errorImportar = 'No se pudo exportar la partida en este navegador.';
      render();
    }
  }

  function importarArchivo(file) {
    if (!file) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        estado = J.cargar(String(lector.result));
        ui.errorImportar = '';
        guardar();
        reiniciarUI();
      } catch (e) { ui.errorImportar = 'No se pudo importar: el archivo no es una partida válida.'; }
      render();
    };
    lector.onerror = () => { ui.errorImportar = 'No se pudo leer el archivo.'; render(); };
    lector.readAsText(file);
  }

  /* ---------- Eventos ---------- */
  raiz.addEventListener('click', (e) => {
    const t = e.target;
    const td = t.closest && t.closest('td[data-ref]');
    if (td && !(t.classList && t.classList.contains('celda-input'))) {
      if (ui.editando) confirmarEdicion(0, 0);
      const pr = E.parsearRef(td.getAttribute('data-ref'));
      const nueva = { c: pr.c, r: pr.r };
      if (e.shiftKey && ui.anchor.c === nueva.c) ui.sel = nueva;
      else { ui.sel = nueva; ui.anchor = nueva; }
      ui.estadoMsg = '';
      ui.enfocarHoja = true;
      render();
      return;
    }
    const b = t.closest && t.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'entregar') entregar();
    else if (act === 'pista') { J.usarPista(estado); guardar(); render(); }
    else if (act === 'rellenar') rellenar();
    else if (act === 'dibujar') {
      ui.vistaGrafico = true;
      render();
    } else if (act === 'siguiente') {
      ui.aviso = null; ui.resultado = {}; ui.mensajes = [];
      ui.ver = Math.min(estado.misionActual, NMISIONES);
      ui.sel = { c: 0, r: 1 }; ui.anchor = { c: 0, r: 1 };
      render();
    } else if (act === 'ver') {
      if (ui.editando) confirmarEdicion(0, 0);
      ui.ver = parseInt(b.getAttribute('data-i'), 10);
      ui.sel = { c: 0, r: 1 }; ui.anchor = { c: 0, r: 1 };
      ui.mensajes = []; ui.resultado = {}; ui.aviso = null; ui.estadoMsg = '';
      render();
    } else if (act === 'exportar') exportar();
    else if (act === 'importar') { const f = raiz.querySelector('#archivo'); if (f) f.click(); }
    else if (act === 'nueva') {
      if (window.confirm('¿Seguro que quieres empezar una partida nueva? Se perderá el progreso actual (exporta la partida antes si quieres conservarla).')) {
        J.borrarLocal();
        estado = J.nuevaPartida('', semillaNueva());
        reiniciarUI();
        guardar();
        render();
      }
    } else if (act === 'empezar') {
      const inp = raiz.querySelector('#nombre');
      const nombre = (inp && inp.value.trim()) || 'Daniel';
      estado.nombre = nombre;
      estado.iniciada = true;
      guardar();
      render();
    } else if (act === 'tutorial-ok') {
      estado.tutorialVisto = true;
      guardar();
      render();
    }
  });

  raiz.addEventListener('dblclick', (e) => {
    const td = e.target.closest && e.target.closest('td[data-ref]');
    if (td && !(e.target.classList && e.target.classList.contains('celda-input'))) iniciarEdicion(td.getAttribute('data-ref'));
  });

  raiz.addEventListener('input', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('celda-input') && ui.editando) {
      ui.editando.texto = t.value;
      const barra = raiz.querySelector('#barra-texto');
      if (barra) barra.textContent = t.value;
    } else if (t.getAttribute && t.getAttribute('data-campo')) ui.grafico[t.getAttribute('data-campo')] = t.value;
  });

  raiz.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'archivo') importarArchivo(t.files && t.files[0]);
    else if (t.getAttribute && t.getAttribute('data-campo')) ui.grafico[t.getAttribute('data-campo')] = t.value;
  });

  document.addEventListener('keydown', (e) => {
    if (pantalla() !== 'juego') return;
    const t = e.target;
    if (t && t.classList && t.classList.contains('celda-input')) {
      if (e.key === 'Enter') { e.preventDefault(); confirmarEdicion(0, 1); }
      else if (e.key === 'Tab') { e.preventDefault(); confirmarEdicion(1, 0); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); confirmarEdicion(0, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); confirmarEdicion(0, -1); }
      else if (e.key === 'Escape') { e.preventDefault(); ui.editando = null; ui.enfocarHoja = true; render(); }
      else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); rellenar(); }
      return;
    }
    if (t && t.matches && t.matches('input, select, textarea')) return;
    if (t && t.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    if (ui.ver >= NMISIONES) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); rellenar(); return; }
    const flechas = { ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (flechas[e.key]) {
      e.preventDefault();
      mover(flechas[e.key][0], flechas[e.key][1], e.shiftKey);
      ui.estadoMsg = '';
      ui.enfocarHoja = true;
      render();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      mover(e.shiftKey ? -1 : 1, 0, false);
      ui.enfocarHoja = true;
      render();
    } else if (e.key === 'F2' || e.key === 'Enter') {
      e.preventDefault();
      iniciarEdicion(E.refA1(ui.sel.c, ui.sel.r));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const ref = E.refA1(ui.sel.c, ui.sel.r);
      iniciarEdicion(ref, '');
      if (ui.editando) confirmarEdicion(0, 0);
    } else if (e.key.length === 1 && !mod && !e.altKey) {
      e.preventDefault();
      iniciarEdicion(E.refA1(ui.sel.c, ui.sel.r), e.key);
    }
  });

  render();
})();
