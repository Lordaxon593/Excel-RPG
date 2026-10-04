/* Estado del juego, XP, niveles, recompensas y guardado. Sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./missions.js'));
  else raiz.Juego = fabrica(raiz.Misiones);
})(typeof self !== 'undefined' ? self : this, function (Misiones) {
  'use strict';

  const { MISIONES, CODICE } = Misiones;
  const VERSION = 1;
  const CLAVE = 'excelrpg.aldea.v1';
  const STATS = ['logica', 'analisis', 'automatizacion', 'finanzas', 'productividad'];
  const NOMBRES_STATS = { logica: 'Lógica', analisis: 'Análisis', automatizacion: 'Automatización', finanzas: 'Finanzas', productividad: 'Productividad' };

  function nuevaPartida(nombre, semilla) {
    const stats = {};
    STATS.forEach((s) => { stats[s] = 1; });
    return {
      version: VERSION,
      nombre: String(nombre || '').trim() || 'Daniel',
      clase: 'Aprendiz de Finanzas',
      equipo: 'Hoja de cálculo de madera',
      semilla: Number.isInteger(semilla) ? semilla : Math.floor(Math.random() * 1e6),
      iniciada: false,
      tutorialVisto: false,
      misionActual: 0,
      completadas: {},
      borradores: {},
      pistas: {},
      xp: 0,
      oro: 0,
      stats,
      registro: [],
      grafico: null
    };
  }

  const nivel = (xp) => 1 + Math.floor(xp / 100);
  function rango(n) {
    if (n <= 5) return 'Aprendiz';
    if (n <= 10) return 'Auxiliar';
    if (n <= 15) return 'Analista Junior';
    if (n <= 20) return 'Analista';
    if (n <= 25) return 'Analista Senior';
    if (n <= 30) return 'Controller';
    return 'Maestro Financiero';
  }
  function barraXP(xp) {
    const en = xp % 100;
    const llenos = Math.floor(en / 10);
    return `[${'#'.repeat(llenos)}${'-'.repeat(10 - llenos)}] ${en}/100`;
  }

  const mision = (estado) => MISIONES[estado.misionActual] || null;
  const datosMision = (estado, i) => MISIONES[i].generarDatos(estado.semilla);
  const terminada = (estado) => estado.misionActual >= MISIONES.length;

  function editarCelda(estado, ref, raw) {
    const m = mision(estado);
    if (!m) return false;
    const k = String(ref).toUpperCase();
    if (!Misiones.celdasEditables(m).includes(k)) return false;
    const b = estado.borradores[m.id] || (estado.borradores[m.id] = {});
    if (raw === '' || raw === null || raw === undefined) delete b[k];
    else b[k] = String(raw);
    return true;
  }

  function usarPista(estado) {
    const m = mision(estado);
    if (!m) return null;
    const n = estado.pistas[m.id] || 0;
    if (n < m.pistas.length) estado.pistas[m.id] = n + 1;
    return { usadas: estado.pistas[m.id] || 0, texto: m.pistas.slice(0, estado.pistas[m.id] || 0) };
  }

  /* Entrega la misión actual. entrega: {celda: texto}; extra: datos del gráfico (M7). */
  function entregar(estado, entrega, extra) {
    const m = mision(estado);
    if (!m) return { ok: false, completada: false, mensajes: ['Ya has completado todas las misiones.'], porCelda: {} };
    const res = Misiones.validar(m, entrega, estado.semilla, extra);
    if (!res.ok) return Object.assign({ completada: false }, res);

    const nivelAntes = nivel(estado.xp);
    estado.xp += m.xp;
    estado.oro += m.oro;
    for (const k of Object.keys(m.stats)) estado.stats[k] += m.stats[k];
    const celdas = {};
    for (const c of Misiones.celdasEditables(m)) celdas[c] = String(entrega[c]).trim();
    estado.completadas[m.id] = { celdas, extra: m.grafico ? Object.assign({}, extra) : null };
    if (m.grafico) estado.grafico = Object.assign({}, extra);
    estado.registro.push({ mision: m.id, titulo: m.titulo, texto: m.consecuencia.texto(m.generarDatos(estado.semilla), extra) });
    delete estado.borradores[m.id];
    estado.misionActual += 1;

    const nivelDespues = nivel(estado.xp);
    return {
      ok: true, completada: true, porCelda: res.porCelda, mensajes: [],
      xp: m.xp, oro: m.oro, stats: m.stats,
      nivelAntes, nivelDespues,
      subeNivel: nivelDespues > nivelAntes,
      mensajeNivel: nivelDespues > nivelAntes ? `¡Has subido al nivel ${nivelDespues}! Nuevo rango: ${rango(nivelDespues)}.` : '',
      consecuencia: estado.registro[estado.registro.length - 1].texto
    };
  }

  /* El estado de la aldea se deduce de las misiones completadas. */
  function calcularAldea(estado) {
    const m3 = MISIONES[2].generarDatos(estado.semilla);
    const aldea = { trigo: 0, huevos: 0, poblacion: m3.v.personas, trabajadores: 0, edificios: [] };
    MISIONES.forEach((m, i) => {
      if (estado.completadas[m.id]) m.aplicarAldea(aldea, m.generarDatos(estado.semilla));
    });
    return aldea;
  }

  function codice(estado) {
    const desbloqueadas = {};
    for (const m of MISIONES) {
      if (estado.completadas[m.id]) m.etiquetas.forEach((e) => { desbloqueadas[e] = m.titulo; });
    }
    const todas = {};
    for (const m of MISIONES) m.etiquetas.forEach((e) => { todas[e] = todas[e] || m.titulo; });
    return CODICE.map((c) => ({
      id: c.id, nombre: c.nombre, moduloPlan: c.moduloPlan,
      desbloqueada: !!desbloqueadas[c.id],
      mision: desbloqueadas[c.id] || null
    }));
  }

  function resumenFinal(estado) {
    const cod = codice(estado);
    return {
      nombre: estado.nombre, nivel: nivel(estado.xp), rango: rango(nivel(estado.xp)),
      xp: estado.xp, oro: estado.oro, stats: Object.assign({}, estado.stats),
      codiceDesbloqueadas: cod.filter((c) => c.desbloqueada).length, codiceTotal: cod.length
    };
  }

  /* ---------- Guardado ---------- */
  const serializar = (estado) => JSON.stringify(estado);

  function cargar(texto) {
    let o;
    try { o = typeof texto === 'string' ? JSON.parse(texto) : texto; } catch (e) { throw new Error('El archivo no es una partida válida.'); }
    if (!o || o.version !== VERSION || typeof o.nombre !== 'string' || !Number.isInteger(o.semilla) ||
        !Number.isInteger(o.misionActual) || o.misionActual < 0 || o.misionActual > MISIONES.length ||
        typeof o.xp !== 'number' || typeof o.oro !== 'number' || !o.stats || typeof o.stats !== 'object') {
      throw new Error('El archivo no es una partida válida.');
    }
    const base = nuevaPartida(o.nombre, o.semilla);
    const estado = Object.assign(base, {
      iniciada: !!o.iniciada, tutorialVisto: !!o.tutorialVisto,
      misionActual: o.misionActual, xp: o.xp, oro: o.oro,
      completadas: o.completadas && typeof o.completadas === 'object' ? o.completadas : {},
      borradores: o.borradores && typeof o.borradores === 'object' ? o.borradores : {},
      pistas: o.pistas && typeof o.pistas === 'object' ? o.pistas : {},
      registro: Array.isArray(o.registro) ? o.registro : [],
      grafico: o.grafico || null
    });
    STATS.forEach((s) => { estado.stats[s] = Number.isFinite(o.stats[s]) ? o.stats[s] : 1; });
    return estado;
  }

  function almacen(storage) {
    if (storage) return storage;
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }
  function guardarLocal(estado, storage) {
    try {
      const s = almacen(storage);
      if (!s) return false;
      s.setItem(CLAVE, serializar(estado));
      return true;
    } catch (e) { return false; }
  }
  function cargarLocal(storage) {
    try {
      const s = almacen(storage);
      const t = s && s.getItem(CLAVE);
      return t ? cargar(t) : null;
    } catch (e) { return null; }
  }
  function borrarLocal(storage) {
    try { const s = almacen(storage); if (s) s.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
  }

  return {
    STATS, NOMBRES_STATS, nuevaPartida, nivel, rango, barraXP, mision, datosMision, terminada,
    editarCelda, usarPista, entregar, calcularAldea, codice, resumenFinal,
    serializar, cargar, guardarLocal, cargarLocal, borrarLocal
  };
});
