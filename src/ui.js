/* Interfaz: todo lo que toca el DOM. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const E = window.Engine, M = window.Misiones, J = window.Juego, Esc = window.Escuela, L = window.Libro, P = window.Practicas;
  const raiz = document.getElementById('app');
  const NM = M.MISIONES.length;

  const semillaNueva = () => 1000 + Math.floor(Math.random() * 900000);
  let estado = J.cargarLocal() || J.nuevaPartida('', semillaNueva());

  const ui = {
    ver: 0, sel: E.selUna(0, 1), editando: null, arrastrando: null, rellenoDestino: null, dragSenalar: null, ultimoClic: null,
    mensajes: [], resultado: {}, estadoMsg: '', enfocarHoja: false,
    grafico: { rango: '', tipo: '', titulo: '' }, vistaGrafico: false, errorImportar: '',
    panel: null, libroQ: '', libroFoco: false, ficha: null, popup: null,
    narrativa: true, leccionAbierta: false, pag: 0,
    ejId: null, escuelaCeldas: {}, escuelaMsg: null, escuelaFin: false
  };
  ui.ver = Math.min(estado.misionActual, NM);

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const guardar = () => J.guardarLocal(estado);
  function pantalla() {
    if (!estado.iniciada) return 'bienvenida';
    if (!J.aldeaDesbloqueada(estado) || ui.escuelaFin) return 'escuela';
    return 'juego';
  }
  const ICONO_NEGOCIO = { almacen: '🌾', granja: '🥚', capataz: '⚒', tablon: '📜' };

  /* ---------- Contexto de la hoja que se está usando ---------- */
  function ejercicioActual() {
    return (ui.ejId && Esc.ejercicio(ui.ejId)) || J.siguienteEjercicio(estado);
  }

  function ctxDeDef(def, datos, jugador, soloLectura, modo, idx) {
    const celdas = Object.assign({}, datos.celdas);
    const edit = M.celdasEditables(def);
    edit.forEach((k) => { if (jugador[k]) celdas[k] = jugador[k]; });
    return { modo, def, idx, datos, cols: datos.cols, filas: datos.filas, soloLectura, edit: new Set(edit), hoja: E.Hoja.desde(celdas, datos.cols, datos.filas) };
  }

  function ctx() {
    const p = pantalla();
    if (p === 'escuela') {
      const ej = ui.escuelaFin ? null : ejercicioActual();
      if (!ej) return null;
      const h = Esc.hojaEjercicio(ej);
      const celdas = Object.assign({}, h.celdas);
      h.editables.forEach((k) => { if (ui.escuelaCeldas[k]) celdas[k] = ui.escuelaCeldas[k]; });
      return { modo: 'escuela', ej, cols: h.cols, filas: h.filas, soloLectura: false, edit: new Set(h.editables), hoja: E.Hoja.desde(celdas, h.cols, h.filas), datos: h };
    }
    if (p !== 'juego') return null;
    if (estado.practicaActiva) {
      const a = J.activo(estado);
      return ctxDeDef(a.def, a.def.generarDatos(a.semilla), a.borrador, false, 'practica', -1);
    }
    if (ui.ver >= NM) return null;
    const m = M.MISIONES[ui.ver];
    const datos = m.generarDatos(estado.semilla);
    const soloLectura = ui.ver < estado.misionActual;
    const comp = estado.completadas[m.id];
    const jugador = soloLectura ? (comp ? comp.celdas : {}) : (estado.borradores[m.id] || {});
    return ctxDeDef(m, datos, jugador, soloLectura, 'mision', ui.ver);
  }

  function guardarCelda(cx, ref, texto) {
    if (cx.modo === 'escuela') {
      if (texto === '') delete ui.escuelaCeldas[ref]; else ui.escuelaCeldas[ref] = texto;
      ui.escuelaMsg = null;
    } else {
      J.editarCelda(estado, ref, texto);
      guardar();
    }
    delete ui.resultado[ref];
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

  /* ---------- Colores de referencias (modo señalar) ---------- */
  function mapaRefs(refs) {
    const mapa = new Map();
    refs.forEach((rf) => {
      const partes = rf.texto.split(':').map((t) => E.parsearRef(t));
      if (partes.some((x) => !x)) return;
      const a = partes[0], b = partes[1] || partes[0];
      for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) {
        for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) {
          const k = c + ',' + r;
          if (!mapa.has(k)) mapa.set(k, rf.color);
        }
      }
    });
    return mapa;
  }
  function htmlColoreado(texto) {
    const refs = E.escanearReferencias(texto);
    let out = '', ult = 0;
    refs.forEach((r) => {
      out += esc(texto.slice(ult, r.inicio)) + `<span class="rc${r.color}">${esc(texto.slice(r.inicio, r.fin))}</span>`;
      ult = r.fin;
    });
    return out + esc(texto.slice(ult));
  }

  /* ---------- Hoja interactiva ---------- */
  function htmlBarra(cx) {
    const rc = E.rectSel(ui.sel);
    const act = ui.sel.activa;
    const ref = E.refA1(act.c, act.r);
    const raw = ui.editando ? ui.editando.texto : (cx.hoja.crudo(ref) || '');
    const v = cx.hoja.valor(ref);
    const expl = !ui.editando && E.esError(v) ? `<div class="explica error" role="status">${esc(v.codigo)}: ${esc(v.explicacion)}</div>` : '';
    return `<div class="barra-formulas"><span class="nombre-celda" id="nombre-celda">${E.rangoTexto(rc)}</span><span class="fx">fx</span><span id="barra-texto" class="barra-texto">${htmlColoreado(raw)}</span></div><div id="explica">${expl}</div>`;
  }

  function htmlHoja(cx) {
    const { hoja } = cx;
    const rc = E.rectSel(ui.sel);
    const act = ui.sel.activa;
    const mapa = mapaRefs(ui.editando ? E.escanearReferencias(ui.editando.texto) : []);
    const dest = ui.arrastrando === 'relleno' && ui.rellenoDestino > rc.r2 ? ui.rellenoDestino : 0;
    const anchos = [];
    for (let c = 0; c < cx.cols; c++) {
      let mx = 4;
      for (let r = 1; r <= cx.filas; r++) mx = Math.max(mx, hoja.texto(E.refA1(c, r)).length);
      anchos.push(Math.min(30, mx) + 2);
    }
    let h = '<div class="hoja-wrap" tabindex="0" role="grid" aria-label="Hoja de cálculo. Flechas para moverse, Mayús para seleccionar varias celdas, F2 para editar, Ctrl+D para rellenar hacia abajo"><table class="hoja"><thead><tr><th class="esq"></th>';
    for (let c = 0; c < cx.cols; c++) h += `<th class="cab-col${c >= rc.c1 && c <= rc.c2 ? ' en-sel' : ''}" style="min-width:${anchos[c]}ch">${E.colALetra(c)}</th>`;
    h += '</tr></thead><tbody>';
    for (let r = 1; r <= cx.filas; r++) {
      h += `<tr><th class="cab-fila${r >= rc.r1 && r <= rc.r2 ? ' en-sel' : ''}">${r}</th>`;
      for (let c = 0; c < cx.cols; c++) {
        const ref = E.refA1(c, r);
        const v = hoja.valor(ref);
        const cls = ['celda'];
        if (cx.edit.has(ref)) cls.push(cx.soloLectura ? 'hecha' : 'editable');
        if (typeof v === 'number') cls.push('num');
        if (E.esError(v)) cls.push('err');
        const dentro = c >= rc.c1 && c <= rc.c2 && r >= rc.r1 && r <= rc.r2;
        if (dentro) {
          cls.push('sel-r');
          if (r === rc.r1) cls.push('b-t');
          if (r === rc.r2) cls.push('b-b');
          if (c === rc.c1) cls.push('b-l');
          if (c === rc.c2) cls.push('b-r');
        }
        if (c === act.c && r === act.r) cls.push('activa');
        if (dest && c >= rc.c1 && c <= rc.c2 && r > rc.r2 && r <= dest) cls.push('rel-prev');
        const k = mapa.get(c + ',' + r);
        if (k !== undefined) cls.push('ref' + k);
        const res = ui.resultado[ref];
        if (res === 'ok') cls.push('ok'); else if (res) cls.push('mal');
        const titulo = E.esError(v) ? ` title="${esc(v.codigo + ': ' + v.explicacion)}"` : '';
        let contenido;
        if (ui.editando && ui.editando.ref === ref) {
          contenido = `<input class="celda-input" value="${esc(ui.editando.texto)}" spellcheck="false" autocomplete="off" aria-label="Editando ${ref}">`;
        } else contenido = esc(hoja.texto(ref));
        const asa = !cx.soloLectura && !ui.editando && c === rc.c2 && r === rc.r2 ? '<span class="asa" data-asa="1" title="Arrastra hacia abajo para rellenar"></span>' : '';
        h += `<td class="${cls.join(' ')}" data-ref="${ref}"${titulo}>${contenido}${asa}</td>`;
      }
      h += '</tr>';
    }
    return h + '</tbody></table></div>';
  }

  const htmlZonaHoja = (cx) => htmlBarra(cx) + htmlHoja(cx);

  /* Repinta solo la hoja (sin perder el resto de la pantalla). */
  function refrescarHoja() {
    const zona = raiz.querySelector('#zona-hoja');
    const cx = ctx();
    if (!zona || !cx) { render(); return; }
    zona.innerHTML = cx.def && cx.def.grafico ? htmlHoja(cx) : htmlZonaHoja(cx);
    enfocar();
  }
  function enfocar() {
    if (ui.editando) {
      const i = raiz.querySelector('.celda-input');
      if (i) { i.focus(); const n = typeof ui.editando.cursor === 'number' ? ui.editando.cursor : i.value.length; i.setSelectionRange(n, n); }
    } else if (ui.enfocarHoja) {
      const w = raiz.querySelector('.hoja-wrap');
      if (w && w.focus) w.focus({ preventScroll: true });
    }
    ui.enfocarHoja = false;
  }
  /* Actualiza barra y colores de referencias mientras se escribe (sin tocar el input). */
  function pintarEdicion() {
    const zona = raiz.querySelector('#zona-hoja');
    if (!zona || !ui.editando) return;
    const mapa = mapaRefs(E.escanearReferencias(ui.editando.texto));
    zona.querySelectorAll('td[data-ref]').forEach((td) => {
      td.className = td.className.replace(/\bref\d\b/g, '').replace(/\s+/g, ' ').trim();
      const pr = E.parsearRef(td.getAttribute('data-ref'));
      const k = mapa.get(pr.c + ',' + pr.r);
      if (k !== undefined) td.className += ' ref' + k;
    });
    const barra = raiz.querySelector('#barra-texto');
    if (barra) barra.innerHTML = htmlColoreado(ui.editando.texto);
  }

  /* ---------- Piezas de pantalla ---------- */
  function htmlBarraSup() {
    const n = J.nivel(estado.xp);
    return `<header class="barra-sup">
      <span class="b-nombre">👤 <b>${esc(estado.nombre)}</b></span>
      <span>Nivel <b>${n}</b></span>
      <span class="xp" aria-label="Experiencia">XP ${esc(J.barraXP(estado.xp))}</span>
      <span>🪙 <b>${estado.oro}</b></span>
      <span>🎖 ${esc(J.rango(n))}</span>
      <nav class="b-botones" aria-label="Paneles">
        <button data-panel="personaje" aria-pressed="${ui.panel === 'personaje'}">🧙 Personaje</button>
        <button data-panel="equipo" aria-pressed="${ui.panel === 'equipo'}">🧰 Equipo</button>
        <button data-panel="aldea" aria-pressed="${ui.panel === 'aldea'}">🏘 Aldea</button>
        <button data-panel="libro" aria-pressed="${ui.panel === 'libro'}">📖 Libro de funciones</button>
      </nav>
      <input type="file" id="archivo" accept=".json,application/json" hidden>
    </header>`;
  }

  function htmlEscuela() {
    if (ui.escuelaFin) {
      return `<main class="contenido"><section class="tarjeta"><h2>🎓 ¡Has terminado la Escuela!</h2>
        <p>Ya sabes moverte por la hoja, escribir datos y fórmulas, y usar una función. La Aldea te espera: allí Maese Aldric te dará una lección antes de cada misión.</p>
        <div class="botones"><button class="principal" data-act="entrar-aldea">Entrar en la Aldea</button></div></section></main>`;
    }
    const cx = ctx();
    const ej = cx.ej;
    const lec = Esc.leccion(ej.leccion);
    const prog = J.escuelaProgreso(estado);
    const total = Esc.ejercicios.length;
    const hechos = Esc.ejercicios.filter((e) => estado.escuela.ejercicios[e.id]).length;
    const llenos = Math.round((hechos / total) * 10);
    const msg = ui.escuelaMsg;
    const hecho = !!estado.escuela.ejercicios[ej.id];
    const lecciones = prog.map((l) => `<span class="paso${l.id === lec.id ? ' actual' : ''}${l.completa ? ' hecho' : ''}">${l.completa ? '✓' : '○'} ${esc(l.titulo)}</span>`).join(' ');
    return `<main class="contenido">
      <section class="tarjeta">
        <h2>🏫 La Escuela</h2>
        <p class="meta">Sin XP: aquí solo se aprende lo básico. <span class="xp">[${'#'.repeat(llenos)}${'-'.repeat(10 - llenos)}] ${hechos}/${total} ejercicios</span></p>
        <p class="pasos">${lecciones}</p>
        <h3>Lección ${esc(lec.id.slice(1))}: ${esc(lec.titulo)}</h3>
        <p>${esc(lec.texto)}</p>
      </section>
      <section class="tarjeta">
        <div class="que-hacer"><h3>Qué tienes que hacer</h3><p>${esc(ej.enunciado)}</p></div>
        <div id="zona-hoja">${htmlZonaHoja(cx)}</div>
        <div class="estado-msg" role="status">${esc(ui.estadoMsg)}</div>
        <div class="botones">
          ${hecho ? '<button class="principal" data-act="esc-continuar">Continuar</button>' : '<button class="principal" data-act="esc-comprobar">Comprobar</button>'}
          <button data-act="esc-saltar">Saltar la Escuela</button>
        </div>
        ${msg ? `<p class="${msg.ok ? 'ok-msg' : 'error'}" role="status">${esc(msg.mensaje)}</p>` : ''}
      </section></main>`;
  }

  function htmlHojaEstatica(ej) {
    const hoja = E.Hoja.desde(ej.celdas, ej.cols, ej.filas);
    let h = '<div class="hoja-wrap"><table class="hoja estatica"><thead><tr><th class="esq"></th>';
    for (let c = 0; c < ej.cols; c++) h += `<th class="cab-col">${E.colALetra(c)}</th>`;
    h += '</tr></thead><tbody>';
    for (let r = 1; r <= ej.filas; r++) {
      h += `<tr><th class="cab-fila">${r}</th>`;
      for (let c = 0; c < ej.cols; c++) {
        const ref = E.refA1(c, r);
        const v = hoja.valor(ref);
        h += `<td class="celda${typeof v === 'number' ? ' num' : ''}">${esc(hoja.texto(ref))}</td>`;
      }
      h += '</tr>';
    }
    h += '</tbody></table></div>';
    const formulas = Object.keys(ej.celdas).filter((k) => ej.celdas[k][0] === '=');
    if (formulas.length) h += `<ul class="formulas-ej">${formulas.map((k) => `<li><b>${k}</b>: <code>${esc(ej.celdas[k])}</code></li>`).join('')}</ul>`;
    return h;
  }

  function htmlLeccion(m) {
    const paginas = m.leccion.paginas;
    const idx = Math.min(ui.pag, paginas.length - 1);
    const p = paginas[idx];
    const ultima = idx >= paginas.length - 1;
    const vista = J.leccionVista(estado, m.id);
    const repasos = ultima ? m.leccion.repasos.map((r) => `<p class="repaso">↺ ${esc(r.texto)} <button class="enlace" data-act="ficha" data-id="${esc(r.ficha)}">Ver ficha</button></p>`).join('') : '';
    return `<main class="contenido"><section class="tarjeta leccion">
      <h2>🎓 Lección de Maese Aldric: ${esc(p.titulo)}</h2>
      <p class="meta">Misión ${ui.ver + 1}: ${esc(m.titulo)} · página ${idx + 1} de ${paginas.length}</p>
      <p>${esc(p.texto)}</p>
      <div class="ejemplo"><h3>Ejemplo resuelto</h3>${htmlHojaEstatica(p.ejemplo)}</div>
      ${repasos}
      <div class="botones">
        ${idx > 0 ? '<button data-act="pag-ant">Anterior</button>' : ''}
        ${ultima ? `<button class="principal" data-act="empezar-mision">${vista ? 'Volver a la misión' : 'Empezar misión'}</button>` : '<button class="principal" data-act="pag-sig">Siguiente</button>'}
      </div></section></main>`;
  }

  function htmlGraficoPanel(cx) {
    if (cx.soloLectura) {
      const g = estado.grafico;
      return g ? `<div class="panel-grafico">${svgGrafico(cx.datos, g) || ''}</div>` : '';
    }
    const g = ui.grafico;
    const dibujo = ui.vistaGrafico ? (svgGrafico(cx.datos, g) || '<p class="error">No se puede dibujar un gráfico con ese rango. Escríbelo como CELDA:CELDA (por ejemplo, de la esquina superior izquierda a la inferior derecha).</p>') : '';
    return `<div class="panel-grafico"><h3>📊 Panel de gráfico</h3>
      <label>Rango de datos <input type="text" data-campo="rango" value="${esc(g.rango)}" placeholder="CELDA:CELDA" autocomplete="off"></label>
      <label>Tipo de gráfico <select data-campo="tipo">
        <option value=""${g.tipo === '' ? ' selected' : ''}>Elige un tipo…</option>
        <option value="columnas"${g.tipo === 'columnas' ? ' selected' : ''}>Columnas</option>
        <option value="líneas"${g.tipo === 'líneas' ? ' selected' : ''}>Líneas</option></select></label>
      <label>Título <input type="text" data-campo="titulo" value="${esc(g.titulo)}" autocomplete="off"></label>
      <button data-act="dibujar">Dibujar gráfico</button>${dibujo}</div>`;
  }

  function htmlFinal() {
    const r = J.resumenFinal(estado);
    const stats = J.STATS.map((s) => {
      const x = r.statsEfectivos[s];
      return `<li>${J.NOMBRES_STATS[s]}: <b>${x.base}</b>${x.bono ? ` <span class="bono">(+${x.bono} de equipo)</span>` : ''}</li>`;
    }).join('');
    const tablon = estado.grafico ? `<section class="tarjeta"><h2>📜 Tablón de la aldea</h2>${svgGrafico(M.MISIONES[NM - 1].generarDatos(estado.semilla), estado.grafico) || ''}</section>` : '';
    return `<main class="contenido"><section class="tarjeta final"><h1>🏘 ¡La aldea ha nacido!</h1>
      <p>${esc(r.nombre)}, has pasado de Aprendiz a ${esc(r.rango)} usando solo fórmulas de Excel.</p>
      <ul class="lista-simple"><li>Nivel: <b>${r.nivel}</b> (${esc(r.rango)})</li><li>XP total: <b>${r.xp}</b></li><li>Oro: <b>${r.oro}</b></li>${stats}
      <li>Libro de funciones: <b>${r.codiceDesbloqueadas}/${r.codiceTotal}</b> fichas</li></ul>
      <p>Puedes seguir mejorando tu equipo con las misiones de práctica (botón Equipo).</p>
      <p class="proximamente">Próximamente: más misiones (Bosque de las Fórmulas).</p></section>${tablon}</main>`;
  }

  function htmlMision(cx) {
    const def = cx.def;
    const practica = cx.modo === 'practica';
    const usadas = practica ? J.pistasUsadas(estado) : (estado.pistas[def.id] || 0);
    const pistas = !cx.soloLectura && usadas ? `<ol class="pistas">${def.pistas.slice(0, usadas).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : '';
    const msgs = ui.mensajes.length ? `<ul class="mensajes error" role="alert">${ui.mensajes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    const icono = practica ? (P.objeto(def.familia) || {}).icono || '🎯' : (ICONO_NEGOCIO[def.negocio] || '🌾');
    const botones = cx.soloLectura
      ? '<p class="suave">Misión completada: la estás revisando en modo solo lectura.</p><div class="botones"><button data-act="leccion">📖 Ver la lección</button></div>'
      : `<div class="botones">
          <button class="principal" data-act="entregar">${practica ? 'Entregar práctica' : 'Entregar al mayordomo'}</button>
          <button data-act="pista"${usadas >= def.pistas.length ? ' disabled' : ''}>Pista (${usadas}/3)</button>
          ${def.grafico ? '' : '<button data-act="rellenar">Rellenar hacia abajo</button>'}
          <button data-act="aldric">🧓 Preguntar a Aldric</button>
          ${practica ? '<button data-act="abandonar">Abandonar práctica</button>' : '<button data-act="leccion">📖 Lección</button>'}
        </div>`;
    const cab = practica
      ? `<h2>${icono} Práctica: ${esc(def.titulo)}</h2><p class="meta">Misión secundaria · mejora tu ${esc((P.objeto(def.familia) || {}).nombre || '')} · repetición ${estado.practicaActiva.rep + 1} de ${P.MAX_REPETICIONES} · sin XP</p>`
      : `<h2>${icono} Misión ${cx.idx + 1}: ${esc(def.titulo)}</h2><p class="meta">${esc(def.dificultad)} · ${def.xp} XP · ${def.oro} oro</p>`;
    const narrativa = `<button class="enlace plegar" data-act="narrativa" aria-expanded="${ui.narrativa}">${ui.narrativa ? '▾ Ocultar la narrativa' : '▸ Mostrar la narrativa'}</button>${ui.narrativa ? def.texto.map((t) => `<p>${esc(t)}</p>`).join('') : ''}`;
    const zona = def.grafico ? `<div id="zona-hoja">${htmlHoja(cx)}</div>${htmlGraficoPanel(cx)}` : `<div id="zona-hoja">${htmlZonaHoja(cx)}</div>`;
    return `<main class="contenido">
      <section class="tarjeta mision">${cab}${narrativa}
        <div class="que-hacer"><h3>Qué tienes que hacer</h3><ul>${def.queHacer.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      </section>
      <section class="tarjeta">
        ${zona}
        <div class="estado-msg" role="status">${esc(ui.estadoMsg)}</div>
        ${botones}${msgs}${pistas}
      </section></main>`;
  }

  function htmlJuego() {
    if (!estado.practicaActiva && ui.ver >= NM) return htmlFinal();
    const cx = ctx();
    const necesitaLeccion = !estado.practicaActiva && (ui.leccionAbierta || (ui.ver === estado.misionActual && !J.leccionVista(estado, M.MISIONES[ui.ver].id)));
    if (necesitaLeccion) return htmlLeccion(M.MISIONES[ui.ver]);
    return htmlMision(cx);
  }

  /* ---------- Paneles laterales ---------- */
  function htmlPanelPersonaje() {
    const r = J.resumenFinal(estado);
    const n = J.nivel(estado.xp);
    const stats = J.STATS.map((s) => {
      const x = r.statsEfectivos[s];
      return `<li>${J.NOMBRES_STATS[s]}: <b>${x.total}</b> <span class="suave">(base ${x.base}${x.bono ? ` + ${x.bono} de equipo` : ''})</span></li>`;
    }).join('');
    return `<h2>🧙 Personaje</h2>
      <ul class="lista-simple">
        <li>Nombre: <b>${esc(estado.nombre)}</b></li><li>Clase: ${esc(estado.clase)}</li>
        <li>Nivel <b>${n}</b> · Rango <b>${esc(J.rango(n))}</b></li>
        <li class="xp">XP ${esc(J.barraXP(estado.xp))}</li>
        <li>Oro: <b>${estado.oro}</b></li>
        <li>Equipo inicial: ${esc(estado.equipo)}</li></ul>
      <h3>Estadísticas</h3><ul class="lista-simple">${stats}</ul>
      <h3>Partida</h3>
      <div class="botones"><button data-act="exportar">Exportar partida</button><button data-act="importar">Importar partida</button><button data-act="nueva">Nueva partida</button></div>
      ${ui.errorImportar ? `<p class="error" role="alert">${esc(ui.errorImportar)}</p>` : ''}`;
  }

  function htmlPanelEquipo() {
    const objetos = J.equipo(estado).map((o) => {
      const prac = o.practicas.map((p) => {
        const motivo = p.desbloqueada ? (p.restantes <= 0 ? 'Agotada' : '') : `Se desbloquea con la lección de la misión ${p.desbloqueo.slice(1)}`;
        return `<li>${esc(p.titulo)} <span class="suave">· ${p.restantes} de ${P.MAX_REPETICIONES} repeticiones</span>
          ${motivo ? `<span class="suave">(${esc(motivo)})</span>` : `<button data-act="practicar" data-id="${esc(p.id)}">Practicar</button>`}</li>`;
      }).join('');
      return `<section class="objeto"><h3>${o.icono} ${esc(o.nombre)} <span class="suave">(${esc(o.familia)})</span> · ${esc(o.nombreNivel)}</h3>
        <p class="xp">${esc(o.barra)}</p>
        <p>Bono: <b>+${o.bono} ${esc(o.statNombre)}</b></p>
        <p>${esc(o.consejo)}</p>${o.proximamente ? `<p class="suave">${esc(o.proximamente)}</p>` : ''}
        <ul class="practicas">${prac}</ul></section>`;
    }).join('');
    return `<h2>🧰 Equipo</h2><p class="suave">Las misiones de práctica no dan XP: suben la maestría de tus objetos y dan algo de oro. Cada nivel de objeto te da +1 a una estadística. Cada práctica se puede hacer 3 veces. Si no usas pistas, ganas el doble de puntos.</p>${objetos}`;
  }

  function htmlPanelAldea() {
    const a = J.calcularAldea(estado);
    const misiones = M.MISIONES.map((m, i) => {
      const hecha = i < estado.misionActual;
      const actual = i === estado.misionActual;
      const bloqueada = i > estado.misionActual || !J.aldeaDesbloqueada(estado);
      const etiqueta = `${i + 1}. ${m.titulo}${hecha ? ' ✓' : ''}`;
      return `<li>${bloqueada ? `<span class="bloqueada">${esc(etiqueta)} (bloqueada)</span>` :
        `<button class="enlace" data-act="ver" data-i="${i}">${esc(etiqueta)}${actual ? ' ◄' : ''}</button>`}</li>`;
    }).join('');
    const registro = estado.registro.length
      ? estado.registro.map((r) => `<li><b>${esc(r.titulo)}:</b> ${esc(r.texto)}</li>`).join('')
      : '<li class="suave">Aún no ha pasado nada en la aldea.</li>';
    return `<h2>🏘 Aldea</h2><ul class="lista-simple">
        <li>🌾 Trigo: <b>${a.trigo.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</b> kg</li>
        <li>🥚 Huevos: <b>${a.huevos}</b></li>
        <li>👥 Población: <b>${a.poblacion}</b></li>
        <li>⚒ Trabajadores: <b>${a.trabajadores}</b></li>
        <li>🏠 Edificios: <b>${a.edificios.length}</b>${a.edificios.length ? ' (' + esc(a.edificios.join(', ')) + ')' : ''}</li></ul>
      <h3>Misiones</h3><ul class="lista-simple">${misiones}</ul>
      <h3>Registro</h3><ul class="registro">${registro}</ul>`;
  }

  function htmlLibroLista() {
    const lista = L.buscar(ui.libroQ, J.libro(estado));
    return lista.map((f) => f.desbloqueada
      ? `<li><button class="enlace${f.id === ui.ficha ? ' activo' : ''}" data-act="ficha" data-id="${esc(f.id)}">${esc(f.icono)} ${esc(f.nombre)}</button></li>`
      : `<li class="pendiente">🔒 ${esc(f.nombre)} <span class="suave">(aún no enseñada)</span></li>`).join('') || '<li class="suave">No hay fichas con ese texto.</li>';
  }
  function htmlPanelLibro() {
    const fichas = J.libro(estado);
    const f = fichas.find((x) => x.id === ui.ficha && x.desbloqueada);
    const detalle = f ? `<article class="ficha"><h3>${esc(f.icono)} ${esc(f.nombre)}</h3>
        <p><b>Para qué sirve:</b> ${esc(f.paraQue)}</p><p><b>Forma:</b> <code>${esc(f.forma)}</code></p>
        <p><b>Ejemplo:</b> <code>${esc(f.ejemplo)}</code></p><p><b>Errores típicos:</b> ${esc(f.errores)}</p></article>`
      : '<p class="suave">Elige una ficha de la lista. Las fichas se desbloquean cuando Maese Aldric te enseña algo nuevo.</p>';
    const n = fichas.filter((x) => x.desbloqueada).length;
    return `<h2>📖 Libro de funciones</h2><p class="suave">${n} de ${fichas.length} fichas desbloqueadas.</p>
      <label>Buscar o elegir <input type="text" id="libro-q" value="${esc(ui.libroQ)}" placeholder="Por ejemplo: SUMA" autocomplete="off"></label>
      <ul class="lista-simple" id="libro-lista">${htmlLibroLista()}</ul>${detalle}`;
  }

  function htmlPanel() {
    if (!ui.panel) return '';
    const cuerpo = { personaje: htmlPanelPersonaje, equipo: htmlPanelEquipo, aldea: htmlPanelAldea, libro: htmlPanelLibro }[ui.panel]();
    return `<div class="fondo-panel" data-act="cerrar-panel"></div>
      <aside class="panel-lateral" role="dialog" aria-label="Panel ${esc(ui.panel)}"><button class="cerrar" data-act="cerrar-panel" aria-label="Cerrar panel">✕</button>${cuerpo}</aside>`;
  }

  /* ---------- Ventana emergente de éxito ---------- */
  function htmlPopup() {
    const r = ui.popup;
    if (!r) return '';
    let cuerpo;
    if (r.practica) {
      cuerpo = `<h2 id="vt">🎯 ¡Práctica completada!</h2>
        <p>${esc(r.titulo)}: todo correcto.${r.sinPistas ? ' Sin pistas: ¡puntos dobles!' : ''}</p>
        <ul class="lista-simple"><li>+${r.puntos} punto${r.puntos === 1 ? '' : 's'} de maestría en tu ${esc(r.objeto)}</li><li>+${r.oro} de oro</li><li>Te quedan ${r.restantes} repetición${r.restantes === 1 ? '' : 'es'} de esta práctica</li></ul>
        ${r.subeObjeto ? `<p class="nivel">¡Tu ${esc(r.objeto)} sube a ${esc(r.nombreNivel)}! Bono total: +${r.bono} ${esc(J.NOMBRES_STATS[r.stat])}.</p>` : ''}`;
    } else {
      const ganancias = Object.keys(r.stats).map((k) => `+${r.stats[k]} ${J.NOMBRES_STATS[k]}`).join(', ');
      cuerpo = `<h2 id="vt">🎉 ¡Misión completada!</h2>
        <p>Maese Aldric ha revisado tu hoja: todo correcto.</p>
        <ul class="lista-simple"><li>+${r.xp} XP</li><li>+${r.oro} de oro</li><li>${esc(ganancias)}</li></ul>
        ${r.mensajeNivel ? `<p class="nivel">${esc(r.mensajeNivel)}</p>` : ''}${r.mensajeRango ? `<p class="nivel">${esc(r.mensajeRango)}</p>` : ''}
        <p><b>En la aldea:</b> ${esc(r.consecuencia)}</p>`;
    }
    return `<div class="ventana-fondo"><div class="ventana" role="dialog" aria-modal="true" aria-labelledby="vt">${cuerpo}
      <div class="botones"><button class="principal btn-continuar" data-act="continuar">Continuar</button></div></div></div>`;
  }

  function htmlBienvenida() {
    return `<div class="pantalla"><section class="tarjeta"><h1>🏘 Excel RPG: El nacimiento de la aldea</h1>
      ${M.INTRO.bienvenida.map((t) => `<p>${esc(t)}</p>`).join('')}
      <p>Empezarás en la Escuela, con cuatro lecciones cortas, y después entrarás en la Aldea.</p>
      <label>¿Cómo te llamas? <input type="text" id="nombre" value="Daniel" maxlength="30" autocomplete="off"></label>
      <div class="botones"><button class="principal" data-act="empezar">Empezar</button>
      <button data-act="importar">Importar partida</button></div>
      <input type="file" id="archivo" accept=".json,application/json" hidden>
      ${ui.errorImportar ? `<p class="error" role="alert">${esc(ui.errorImportar)}</p>` : ''}</section></div>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const p = pantalla();
    if (p === 'bienvenida') raiz.innerHTML = htmlBienvenida();
    else raiz.innerHTML = htmlBarraSup() + (p === 'escuela' ? htmlEscuela() : htmlJuego()) + htmlPanel() + htmlPopup();
    if (ui.popup) {
      const b = raiz.querySelector('.btn-continuar');
      if (b) b.focus();
    } else if (ui.panel === 'libro' && ui.libroFoco) {
      const i = raiz.querySelector('#libro-q');
      if (i) i.focus();
      ui.libroFoco = false;
    } else enfocar();
    ui.enfocarHoja = false;
  }

  /* ---------- Acciones de hoja ---------- */
  const celdaActiva = () => E.refA1(ui.sel.activa.c, ui.sel.activa.r);

  function refrescarEstadoMsg() {
    const el = raiz.querySelector('.estado-msg');
    if (el) el.textContent = ui.estadoMsg;
  }

  function iniciarEdicion(ref, inicial) {
    const cx = ctx();
    if (!cx) return;
    ui.estadoMsg = '';
    if (cx.soloLectura) { ui.estadoMsg = 'Esta misión ya está completada: solo puedes mirarla.'; refrescarEstadoMsg(); return; }
    if (!cx.edit.has(ref)) { ui.estadoMsg = `La celda ${ref} es de solo lectura. Solo puedes editar las celdas de «Qué tienes que hacer».`; refrescarEstadoMsg(); return; }
    const texto = inicial === undefined || inicial === null ? (cx.hoja.crudo(ref) || '') : inicial;
    ui.editando = { ref, texto, cursor: texto.length, ultimaRef: null };
    refrescarHoja();
    refrescarEstadoMsg();
  }

  function confirmarEdicion(dc, dr) {
    if (!ui.editando) return;
    const cx = ctx();
    const { ref, texto } = ui.editando;
    ui.editando = null;
    if (cx) guardarCelda(cx, ref, texto.trim());
    if ((dc || dr) && cx) ui.sel = E.moverSeleccion(E.selUna(ui.sel.activa.c, ui.sel.activa.r), dc, dr, false, cx.cols, cx.filas);
    ui.enfocarHoja = true;
    refrescarHoja();
  }
  function cancelarEdicion() {
    ui.editando = null;
    ui.enfocarHoja = true;
    refrescarHoja();
  }

  /* Modo señalar: inserta la referencia en el cursor (o sustituye la recién insertada). true si se ha usado. */
  function senalar(refTexto, sustituir) {
    const ed = ui.editando;
    if (!ed) return false;
    const input = raiz.querySelector('.celda-input');
    const cursor = input && typeof input.selectionStart === 'number' ? input.selectionStart : ed.texto.length;
    const ult = ed.ultimaRef;
    const reemplazo = ult && (sustituir || cursor === ult.fin) ? ult : null;
    const r = E.insertarReferencia(ed.texto, reemplazo ? ult.fin : cursor, refTexto, reemplazo);
    if (!r) return false;
    ed.texto = r.texto;
    ed.cursor = r.cursor;
    ed.ultimaRef = { inicio: r.inicio, fin: r.fin };
    if (input) { input.value = r.texto; input.focus(); input.setSelectionRange(r.cursor, r.cursor); }
    pintarEdicion();
    return true;
  }

  /* Relleno con el cuadradito de la esquina: repite el patrón de las filas seleccionadas hacia abajo. */
  function ejecutarRelleno(rect, dest) {
    const cx = ctx();
    if (!cx || cx.soloLectura) return;
    const n = dest - rect.r2;
    if (n <= 0) return;
    let hechas = 0;
    for (let c = rect.c1; c <= rect.c2; c++) {
      const origen = [];
      for (let r = rect.r1; r <= rect.r2; r++) origen.push(cx.hoja.crudoCR(c, r) || '');
      if (origen.every((x) => x === '')) continue;
      E.rellenarPatron(origen, n).forEach((raw, i) => {
        const ref = E.refA1(c, rect.r2 + 1 + i);
        if (cx.edit.has(ref)) { guardarCelda(cx, ref, raw); hechas++; }
      });
    }
    ui.sel = { anchor: { c: rect.c1, r: rect.r1 }, activa: { c: rect.c2, r: dest } };
    ui.estadoMsg = hechas ? `Fórmula copiada en ${hechas} celda${hechas === 1 ? '' : 's'}.` : 'Ninguna de las celdas de destino se puede editar.';
    ui.enfocarHoja = true;
    refrescarHoja();
    refrescarEstadoMsg();
  }

  /* Ctrl+D / botón: copia la celda superior de la selección al resto. */
  function rellenarAbajo() {
    if (ui.editando) confirmarEdicion(0, 0);
    const cx = ctx();
    if (!cx) return;
    const rc = E.rectSel(ui.sel);
    ui.estadoMsg = '';
    if (cx.soloLectura) ui.estadoMsg = 'Esta misión ya está completada: solo puedes mirarla.';
    else if (rc.r2 === rc.r1) ui.estadoMsg = 'Selecciona varias celdas de arriba abajo (clic en la primera y Mayús+clic en la última, o arrastra) y vuelve a pulsar Rellenar hacia abajo.';
    else {
      let hechas = 0, vacia = true;
      for (let c = rc.c1; c <= rc.c2; c++) {
        const superior = cx.hoja.crudoCR(c, rc.r1);
        if (!superior) continue;
        vacia = false;
        E.rellenarAbajo(superior, rc.r2 - rc.r1).forEach((raw, i) => {
          const ref = E.refA1(c, rc.r1 + 1 + i);
          if (cx.edit.has(ref)) { guardarCelda(cx, ref, raw); hechas++; }
        });
      }
      ui.estadoMsg = vacia ? 'La celda superior de la selección está vacía: escribe primero la fórmula allí.'
        : hechas ? `Fórmula copiada en ${hechas} celda${hechas === 1 ? '' : 's'}.` : 'Ninguna de las celdas seleccionadas se puede editar.';
    }
    ui.enfocarHoja = true;
    refrescarHoja();
    refrescarEstadoMsg();
  }

  /* ---------- Acciones de juego ---------- */
  function entregar() {
    if (ui.editando) confirmarEdicion(0, 0);
    const cx = ctx();
    if (!cx || cx.soloLectura) return;
    const practica = cx.modo === 'practica';
    const entrega = practica ? estado.practicaActiva.borrador : (estado.borradores[cx.def.id] || {});
    const r = J.entregar(estado, entrega, cx.def.grafico ? Object.assign({}, ui.grafico) : undefined);
    guardar();
    ui.estadoMsg = '';
    if (r.ok) {
      ui.popup = r;
      ui.mensajes = [];
      ui.resultado = {};
    } else {
      ui.mensajes = r.mensajes;
      ui.resultado = cx.def.grafico ? {} : r.porCelda;
    }
    if (cx.def.grafico) ui.vistaGrafico = true;
    render();
  }

  function reiniciarVista() {
    ui.sel = E.selUna(0, 1);
    ui.editando = null; ui.mensajes = []; ui.resultado = {}; ui.estadoMsg = '';
    ui.leccionAbierta = false; ui.pag = 0; ui.narrativa = true;
    ui.grafico = { rango: '', tipo: '', titulo: '' }; ui.vistaGrafico = false;
  }

  function continuar() {
    const r = ui.popup;
    ui.popup = null;
    reiniciarVista();
    ui.ver = Math.min(estado.misionActual, NM);
    ui.panel = r && r.practica ? 'equipo' : null;
    render();
  }

  function reiniciarTodo() {
    reiniciarVista();
    ui.ver = Math.min(estado.misionActual, NM);
    ui.panel = null; ui.popup = null; ui.ejId = null; ui.escuelaCeldas = {}; ui.escuelaMsg = null; ui.escuelaFin = false;
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
        reiniciarTodo();
      } catch (e) { ui.errorImportar = 'No se pudo importar: el archivo no es una partida válida.'; }
      render();
    };
    lector.onerror = () => { ui.errorImportar = 'No se pudo leer el archivo.'; render(); };
    lector.readAsText(file);
  }

  function comprobarEjercicio() {
    if (ui.editando) confirmarEdicion(0, 0);
    const cx = ctx();
    if (!cx) return;
    ui.ejId = cx.ej.id;
    const r = J.completarEjercicio(estado, cx.ej.id, { sel: E.rectSel(ui.sel), celdas: ui.escuelaCeldas });
    guardar();
    ui.escuelaMsg = { ok: r.ok, mensaje: r.mensaje };
    if (r.ok && r.escuelaCompleta) ui.escuelaFin = true;
    render();
  }
  function siguienteEjercicio() {
    const sig = J.siguienteEjercicio(estado);
    ui.escuelaMsg = null; ui.escuelaCeldas = {}; ui.sel = E.selUna(0, 1); ui.editando = null; ui.estadoMsg = '';
    if (!sig) { ui.ejId = null; ui.escuelaFin = true; } else ui.ejId = sig.id;
    render();
  }

  /* ---------- Eventos ---------- */
  function celdaDe(el) {
    const td = el && el.closest ? el.closest('td[data-ref]') : null;
    if (!td || !raiz.contains(td)) return null;
    const pr = E.parsearRef(td.getAttribute('data-ref'));
    return pr ? { c: pr.c, r: pr.r } : null;
  }

  raiz.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || ui.popup) return;
    const t = e.target;
    if (t.classList && t.classList.contains('celda-input')) return;
    const cx = ctx();
    if (!cx) return;
    if (t.getAttribute && t.getAttribute('data-asa') && !ui.editando) {
      e.preventDefault();
      ui.arrastrando = 'relleno';
      ui.rellenoDestino = E.rectSel(ui.sel).r2;
      return;
    }
    const cel = celdaDe(t);
    if (!cel) return;
    if (ui.editando) {
      if (senalar(E.refA1(cel.c, cel.r), false)) {
        e.preventDefault();
        ui.dragSenalar = { c: cel.c, r: cel.r };
        return;
      }
      confirmarEdicion(0, 0);
    }
    e.preventDefault();
    const ahora = Date.now();
    const ref = E.refA1(cel.c, cel.r);
    const doble = ui.ultimoClic && ui.ultimoClic.ref === ref && ahora - ui.ultimoClic.t < 450 && !e.shiftKey;
    ui.ultimoClic = { ref, t: ahora };
    ui.estadoMsg = '';
    if (doble) { ui.ultimoClic = null; iniciarEdicion(ref); return; }
    ui.sel = E.seleccionar(ui.sel, cel.c, cel.r, e.shiftKey);
    ui.arrastrando = 'sel';
    ui.enfocarHoja = true;
    refrescarHoja();
    refrescarEstadoMsg();
  });

  raiz.addEventListener('mouseover', (e) => {
    if (!ui.arrastrando && !ui.dragSenalar) return;
    const cel = celdaDe(e.target);
    if (!cel) return;
    if (ui.dragSenalar) {
      const a = ui.dragSenalar;
      const rect = { c1: Math.min(a.c, cel.c), c2: Math.max(a.c, cel.c), r1: Math.min(a.r, cel.r), r2: Math.max(a.r, cel.r) };
      senalar(E.rangoTexto(rect), true);
      return;
    }
    if (ui.arrastrando === 'sel') {
      const act = ui.sel.activa;
      if (act.c === cel.c && act.r === cel.r) return;
      ui.sel = E.seleccionar(ui.sel, cel.c, cel.r, true);
      refrescarHoja();
    } else if (ui.arrastrando === 'relleno') {
      const cx = ctx();
      const dest = Math.min(cx.filas, Math.max(E.rectSel(ui.sel).r2, cel.r));
      if (dest === ui.rellenoDestino) return;
      ui.rellenoDestino = dest;
      refrescarHoja();
    }
  });

  document.addEventListener('mouseup', () => {
    const modo = ui.arrastrando;
    ui.dragSenalar = null;
    ui.arrastrando = null;
    if (modo === 'relleno') {
      const dest = ui.rellenoDestino;
      ui.rellenoDestino = null;
      const rect = E.rectSel(ui.sel);
      if (dest > rect.r2) ejecutarRelleno(rect, dest); else refrescarHoja();
    }
  });

  raiz.addEventListener('click', (e) => {
    const t = e.target;
    if (ui.popup && !(t.closest && t.closest('[data-act="continuar"]'))) return;
    const bp = t.closest && t.closest('[data-panel]');
    if (bp) {
      if (ui.editando) confirmarEdicion(0, 0);
      const p = bp.getAttribute('data-panel');
      ui.panel = ui.panel === p ? null : p;
      render();
      return;
    }
    const b = t.closest && t.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    if (ui.editando) confirmarEdicion(0, 0);
    switch (act) {
      case 'entregar': entregar(); break;
      case 'pista': J.usarPista(estado); guardar(); render(); break;
      case 'rellenar': rellenarAbajo(); break;
      case 'aldric': ui.panel = 'libro'; ui.libroFoco = true; render(); break;
      case 'dibujar': ui.vistaGrafico = true; render(); break;
      case 'narrativa': ui.narrativa = !ui.narrativa; render(); break;
      case 'leccion': ui.leccionAbierta = true; ui.pag = 0; render(); break;
      case 'pag-sig': ui.pag += 1; render(); break;
      case 'pag-ant': ui.pag = Math.max(0, ui.pag - 1); render(); break;
      case 'empezar-mision': {
        const m = M.MISIONES[ui.ver];
        if (m && ui.ver === estado.misionActual) { J.verLeccion(estado, m.id); guardar(); }
        ui.leccionAbierta = false;
        render();
        break;
      }
      case 'cerrar-panel': ui.panel = null; render(); break;
      case 'ficha': ui.panel = 'libro'; ui.ficha = b.getAttribute('data-id'); render(); break;
      case 'ver':
        if (estado.practicaActiva) J.abandonarPractica(estado);
        reiniciarVista();
        ui.ver = parseInt(b.getAttribute('data-i'), 10);
        ui.panel = null;
        render();
        break;
      case 'practicar': {
        const r = J.iniciarPractica(estado, b.getAttribute('data-id'));
        if (r.ok) { guardar(); reiniciarVista(); ui.panel = null; ui.errorImportar = ''; } else ui.errorImportar = r.mensaje;
        render();
        break;
      }
      case 'abandonar': J.abandonarPractica(estado); guardar(); reiniciarVista(); ui.ver = Math.min(estado.misionActual, NM); render(); break;
      case 'continuar': continuar(); break;
      case 'exportar': exportar(); break;
      case 'importar': { const f = raiz.querySelector('#archivo'); if (f) f.click(); break; }
      case 'nueva':
        if (window.confirm('¿Seguro que quieres empezar una partida nueva? Se perderá el progreso actual (exporta la partida antes si quieres conservarla).')) {
          J.borrarLocal();
          estado = J.nuevaPartida('', semillaNueva());
          reiniciarTodo();
          guardar();
          render();
        }
        break;
      case 'empezar': {
        const inp = raiz.querySelector('#nombre');
        estado.nombre = (inp && inp.value.trim()) || 'Daniel';
        estado.iniciada = true;
        estado.tutorialVisto = true;
        guardar();
        reiniciarTodo();
        render();
        break;
      }
      case 'esc-comprobar': comprobarEjercicio(); break;
      case 'esc-continuar': siguienteEjercicio(); break;
      case 'esc-saltar':
        if (window.confirm('¿Seguro que quieres saltar la Escuela? Explica cosas básicas (celdas, rangos, fórmulas y funciones) que las misiones dan por sabidas.')) {
          J.saltarEscuela(estado);
          guardar();
          ui.escuelaFin = false; ui.ejId = null; ui.escuelaMsg = null; ui.escuelaCeldas = {};
          ui.sel = E.selUna(0, 1);
          render();
        }
        break;
      case 'entrar-aldea': ui.escuelaFin = false; ui.ejId = null; reiniciarVista(); ui.ver = Math.min(estado.misionActual, NM); render(); break;
      default: break;
    }
  });

  raiz.addEventListener('input', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('celda-input') && ui.editando) {
      ui.editando.texto = t.value;
      ui.editando.cursor = t.selectionStart;
      ui.editando.ultimaRef = null;
      pintarEdicion();
    } else if (t.id === 'libro-q') {
      ui.libroQ = t.value;
      const lista = raiz.querySelector('#libro-lista');
      if (lista) lista.innerHTML = htmlLibroLista();
    } else if (t.getAttribute && t.getAttribute('data-campo')) ui.grafico[t.getAttribute('data-campo')] = t.value;
  });

  raiz.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'archivo') importarArchivo(t.files && t.files[0]);
    else if (t.getAttribute && t.getAttribute('data-campo')) ui.grafico[t.getAttribute('data-campo')] = t.value;
  });

  function teclasHoja(e) {
    const cx = ctx();
    if (!cx) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); rellenarAbajo(); return; }
    const flechas = { ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (flechas[e.key]) {
      e.preventDefault();
      ui.sel = E.moverSeleccion(ui.sel, flechas[e.key][0], flechas[e.key][1], e.shiftKey, cx.cols, cx.filas);
      ui.estadoMsg = '';
      ui.enfocarHoja = true;
      refrescarHoja();
      refrescarEstadoMsg();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      ui.sel = E.moverSeleccion(E.selUna(ui.sel.activa.c, ui.sel.activa.r), e.shiftKey ? -1 : 1, 0, false, cx.cols, cx.filas);
      ui.enfocarHoja = true;
      refrescarHoja();
    } else if (e.key === 'F2' || e.key === 'Enter') {
      e.preventDefault();
      iniciarEdicion(celdaActiva());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (cx.soloLectura) return;
      const rc = E.rectSel(ui.sel);
      let hecho = false;
      for (let c = rc.c1; c <= rc.c2; c++) {
        for (let r = rc.r1; r <= rc.r2; r++) {
          const ref = E.refA1(c, r);
          if (cx.edit.has(ref)) { guardarCelda(cx, ref, ''); hecho = true; }
        }
      }
      ui.estadoMsg = hecho ? '' : `La celda ${celdaActiva()} es de solo lectura.`;
      ui.enfocarHoja = true;
      refrescarHoja();
      refrescarEstadoMsg();
    } else if (e.key.length === 1 && !mod && !e.altKey) {
      e.preventDefault();
      iniciarEdicion(celdaActiva(), e.key);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (ui.popup) {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); continuar(); }
      return;
    }
    const t = e.target;
    if (e.key === 'Escape' && ui.panel) { e.preventDefault(); ui.panel = null; render(); return; }
    if (pantalla() === 'bienvenida') {
      if (e.key === 'Enter' && t && t.id === 'nombre') { e.preventDefault(); const b = raiz.querySelector('[data-act="empezar"]'); if (b) b.click(); }
      return;
    }
    if (t && t.classList && t.classList.contains('celda-input')) {
      if (e.key === 'Enter') { e.preventDefault(); confirmarEdicion(0, 1); }
      else if (e.key === 'Tab') { e.preventDefault(); confirmarEdicion(e.shiftKey ? -1 : 1, 0); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); confirmarEdicion(0, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); confirmarEdicion(0, -1); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelarEdicion(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
        setTimeout(() => { if (ui.editando && typeof t.selectionStart === 'number') { ui.editando.cursor = t.selectionStart; ui.editando.ultimaRef = null; } }, 0);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) e.preventDefault();
      return;
    }
    if (ui.panel) return;
    if (t && t.matches && t.matches('input, select, textarea')) return;
    if (t && t.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    if (pantalla() === 'juego' && !estado.practicaActiva && ui.ver >= NM) return;
    teclasHoja(e);
  });

  render();
})();
