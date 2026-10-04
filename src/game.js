/* Estado del juego, XP, niveles, recompensas y guardado. Sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./missions.js'), require('./libro.js'), require('./escuela.js'), require('./practicas.js'));
  else raiz.Juego = fabrica(raiz.Misiones, raiz.Libro, raiz.Escuela, raiz.Practicas);
})(typeof self !== 'undefined' ? self : this, function (Misiones, Libro, Escuela, Practicas) {
  'use strict';

  const { MISIONES } = Misiones;
  const VERSION = 2;
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
      grafico: null,
      escuela: { ejercicios: {}, saltada: false },
      leccionesVistas: {},
      practicas: {},
      maestria: maestriaInicial(),
      practicaActiva: null
    };
  }
  function maestriaInicial() {
    const m = {};
    Practicas.OBJETOS.forEach((o) => { m[o.id] = 0; });
    return m;
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

  /* Aviso de rango: solo si el rango nuevo es distinto del anterior. */
  function avisoRango(xpAntes, xpDespues) {
    const antes = rango(nivel(xpAntes)), despues = rango(nivel(xpDespues));
    return antes === despues ? '' : `¡Nuevo rango: ${despues}!`;
  }

  /* ---------- Requisitos de misión (preparados para la Ciudad; vacíos en esta versión) ---------- */
  const nivelObjeto = (estado, id) => Practicas.nivelDePuntos((estado.maestria && estado.maestria[id]) || 0);
  function valorRequisito(estado, r) {
    if (r.tipo === 'objeto') return nivelObjeto(estado, r.id);
    if (r.tipo === 'stat') return (estado.stats && estado.stats[r.id]) || 0;
    if (r.tipo === 'mision') return estado.completadas && estado.completadas[r.id] ? 1 : 0;
    return 0;
  }
  function requisitosFaltantes(estado, m) {
    return (m.requisitos || []).filter((r) => valorRequisito(estado, r) < (r.tipo === 'mision' ? 1 : r.valor || 0));
  }
  const requisitosCumplidos = (estado, m) => requisitosFaltantes(estado, m).length === 0;

  const mision = (estado) => MISIONES[estado.misionActual] || null;
  const datosMision = (estado, i) => MISIONES[i].generarDatos(estado.semilla);
  const terminada = (estado) => estado.misionActual >= MISIONES.length;

  /* ---------- La Escuela ---------- */
  const leccionEscuelaCompleta = (estado, id) => {
    const l = Escuela.leccion(id);
    return !!l && l.ejercicios.every((e) => estado.escuela.ejercicios[e.id]);
  };
  const escuelaCompleta = (estado) => estado.escuela.saltada || Escuela.LECCIONES.every((l) => leccionEscuelaCompleta(estado, l.id));
  const aldeaDesbloqueada = escuelaCompleta;
  function escuelaProgreso(estado) {
    return Escuela.LECCIONES.map((l) => ({
      id: l.id, titulo: l.titulo,
      ejercicios: l.ejercicios.map((e) => ({ id: e.id, hecho: !!estado.escuela.ejercicios[e.id] })),
      completa: leccionEscuelaCompleta(estado, l.id)
    }));
  }
  function completarEjercicio(estado, id, ctx) {
    const ej = Escuela.ejercicio(id);
    if (!ej) return { ok: false, mensaje: 'Ejercicio desconocido.' };
    const r = Escuela.evaluarEjercicio(ej, ctx);
    if (r.ok) estado.escuela.ejercicios[id] = true;
    return Object.assign({}, r, { leccionCompleta: r.ok && leccionEscuelaCompleta(estado, ej.leccion), escuelaCompleta: escuelaCompleta(estado) });
  }
  function saltarEscuela(estado) { estado.escuela.saltada = true; }
  function siguienteEjercicio(estado) {
    for (const e of Escuela.ejercicios) if (!estado.escuela.ejercicios[e.id]) return e;
    return null;
  }

  /* ---------- Lecciones y Libro de funciones ---------- */
  const verLeccion = (estado, id) => { estado.leccionesVistas[id] = true; };
  const leccionVista = (estado, id) => !!estado.leccionesVistas[id];
  function libro(estado) {
    const esc = {};
    Escuela.LECCIONES.forEach((l) => { if (leccionEscuelaCompleta(estado, l.id)) esc[l.id] = true; });
    const modulos = {};
    Misiones.CODICE.forEach((c) => { modulos[c.id] = c.moduloPlan; });
    return Libro.FICHAS.map((f) => Object.assign({}, f, { moduloPlan: modulos[f.id] || '', desbloqueada: Libro.desbloqueada(f, estado.leccionesVistas, esc) }));
  }

  /* ---------- Objetivo activo: misión principal o práctica ---------- */
  function activo(estado) {
    const pa = estado.practicaActiva;
    if (pa) {
      const def = Practicas.plantilla(pa.id);
      return { tipo: 'practica', def, semilla: Practicas.semillaPractica(estado.semilla, pa.id, pa.rep), borrador: pa.borrador, ref: pa };
    }
    const m = mision(estado);
    return m ? { tipo: 'mision', def: m, semilla: estado.semilla, borrador: estado.borradores[m.id] || {}, ref: null } : null;
  }
  const datosActivos = (estado) => { const a = activo(estado); return a ? a.def.generarDatos(a.semilla) : null; };

  function editarCelda(estado, ref, raw) {
    const a = activo(estado);
    if (!a) return false;
    const k = String(ref).toUpperCase();
    if (!Misiones.celdasEditables(a.def).includes(k)) return false;
    let b;
    if (a.tipo === 'practica') b = a.ref.borrador;
    else b = estado.borradores[a.def.id] || (estado.borradores[a.def.id] = {});
    if (raw === '' || raw === null || raw === undefined) delete b[k];
    else b[k] = String(raw);
    return true;
  }

  function pistasUsadas(estado) {
    const a = activo(estado);
    if (!a) return 0;
    return a.tipo === 'practica' ? a.ref.pistas : estado.pistas[a.def.id] || 0;
  }
  function usarPista(estado) {
    const a = activo(estado);
    if (!a) return null;
    const n = pistasUsadas(estado);
    if (n < a.def.pistas.length) {
      if (a.tipo === 'practica') a.ref.pistas = n + 1;
      else estado.pistas[a.def.id] = n + 1;
    }
    const usadas = pistasUsadas(estado);
    return { usadas, texto: a.def.pistas.slice(0, usadas) };
  }

  /* ---------- Prácticas y equipo ---------- */
  function practicasInfo(estado) {
    return Practicas.PLANTILLAS.map((p) => {
      const hechas = (estado.practicas[p.id] && estado.practicas[p.id].hechas) || 0;
      return {
        id: p.id, titulo: p.titulo, familia: p.familia, desbloqueo: p.desbloqueo,
        desbloqueada: aldeaDesbloqueada(estado) && !!estado.leccionesVistas[p.desbloqueo],
        hechas, restantes: Math.max(0, p.maxRepeticiones - hechas),
        activa: !!(estado.practicaActiva && estado.practicaActiva.id === p.id)
      };
    });
  }
  function iniciarPractica(estado, id) {
    const info = practicasInfo(estado).find((p) => p.id === id);
    if (!info) return { ok: false, mensaje: 'Esa práctica no existe.' };
    if (!info.desbloqueada) return { ok: false, mensaje: 'Todavía no has visto la lección de esta práctica.' };
    if (info.restantes <= 0) return { ok: false, mensaje: 'Ya has hecho esta práctica las 3 veces permitidas.' };
    estado.practicaActiva = { id, rep: info.hechas, borrador: {}, pistas: 0 };
    return { ok: true };
  }
  function abandonarPractica(estado) { estado.practicaActiva = null; }

  function entregarPractica(estado, entrega, extra) {
    const pa = estado.practicaActiva;
    const p = Practicas.plantilla(pa.id);
    const res = Misiones.validar(p, entrega, Practicas.semillaPractica(estado.semilla, pa.id, pa.rep), extra);
    if (!res.ok) return Object.assign({ completada: false, practica: true }, res);
    const antes = Practicas.infoObjeto(p.familia, estado.maestria[p.familia]);
    const puntos = pa.pistas === 0 ? Practicas.PUNTOS.sinPistas : Practicas.PUNTOS.conPistas;
    estado.maestria[p.familia] = (estado.maestria[p.familia] || 0) + puntos;
    estado.oro += Practicas.ORO_PRACTICA;
    const reg = estado.practicas[p.id] || (estado.practicas[p.id] = { hechas: 0 });
    reg.hechas += 1;
    estado.practicaActiva = null;
    const despues = Practicas.infoObjeto(p.familia, estado.maestria[p.familia]);
    return {
      ok: true, completada: true, practica: true, porCelda: res.porCelda, mensajes: [],
      titulo: p.titulo, puntos, oro: Practicas.ORO_PRACTICA, sinPistas: pa.pistas === 0,
      objeto: despues.nombre, nivelAntes: antes.nivel, nivelDespues: despues.nivel,
      nombreNivel: despues.nombreNivel, subeObjeto: despues.nivel > antes.nivel, bono: despues.bono, stat: despues.stat,
      restantes: Math.max(0, p.maxRepeticiones - reg.hechas)
    };
  }

  function equipo(estado) {
    const prac = practicasInfo(estado);
    return Practicas.OBJETOS.map((o) => Object.assign(Practicas.infoObjeto(o.id, estado.maestria[o.id]), {
      familia: o.familia, statNombre: NOMBRES_STATS[o.stat], practicas: prac.filter((p) => p.familia === o.id)
    }));
  }
  /* Estadísticas con el bono de los objetos mostrado aparte de la base. */
  function statsEfectivos(estado) {
    const r = {};
    STATS.forEach((s) => { r[s] = { base: estado.stats[s], bono: 0 }; });
    Practicas.OBJETOS.forEach((o) => { r[o.stat].bono += nivelObjeto(estado, o.id); });
    STATS.forEach((s) => { r[s].total = r[s].base + r[s].bono; });
    return r;
  }

  /* Entrega la misión actual (o la práctica activa). entrega: {celda: texto}; extra: datos del gráfico. */
  function entregar(estado, entrega, extra) {
    if (!aldeaDesbloqueada(estado)) return { ok: false, completada: false, mensajes: ['Primero completa la Escuela o sáltala para entrar en la Aldea.'], porCelda: {} };
    if (estado.practicaActiva) return entregarPractica(estado, entrega, extra);
    const m = mision(estado);
    if (!m) return { ok: false, completada: false, mensajes: ['Ya has completado todas las misiones.'], porCelda: {} };
    if (!requisitosCumplidos(estado, m)) return { ok: false, completada: false, mensajes: ['Todavía no cumples los requisitos de esta misión.'], porCelda: {} };
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
    estado.leccionesVistas[m.id] = true;
    delete estado.borradores[m.id];
    estado.misionActual += 1;

    const nivelDespues = nivel(estado.xp);
    return {
      ok: true, completada: true, practica: false, porCelda: res.porCelda, mensajes: [],
      xp: m.xp, oro: m.oro, stats: m.stats,
      nivelAntes, nivelDespues,
      subeNivel: nivelDespues > nivelAntes,
      mensajeNivel: nivelDespues > nivelAntes ? `¡Has subido al nivel ${nivelDespues}!` : '',
      cambiaRango: rango(nivelAntes) !== rango(nivelDespues),
      mensajeRango: avisoRango(estado.xp - m.xp, estado.xp),
      consecuencia: estado.registro[estado.registro.length - 1].texto
    };
  }

  /* El estado de la aldea se deduce de las misiones completadas. */
  function calcularAldea(estado) {
    const m3 = MISIONES[2].generarDatos(estado.semilla);
    const aldea = { trigo: 0, huevos: 0, poblacion: m3.v.personas, trabajadores: 0, edificios: [] };
    MISIONES.forEach((m) => {
      if (estado.completadas[m.id]) m.aplicarAldea(aldea, m.generarDatos(estado.semilla));
    });
    return aldea;
  }

  function resumenFinal(estado) {
    const fichas = libro(estado);
    return {
      nombre: estado.nombre, nivel: nivel(estado.xp), rango: rango(nivel(estado.xp)),
      xp: estado.xp, oro: estado.oro, stats: Object.assign({}, estado.stats), statsEfectivos: statsEfectivos(estado),
      codiceDesbloqueadas: fichas.filter((c) => c.desbloqueada).length, codiceTotal: fichas.length
    };
  }

  /* ---------- Guardado ---------- */
  const serializar = (estado) => JSON.stringify(estado);

  /* Partidas de la versión 1 (7 misiones): la antigua M6 pasa a ser M6 + M7 y los gráficos pasan a M8.
     El total de XP, oro y estadísticas de la antigua M6 coincide con el de M6 + M7. */
  function migrarV1(o) {
    const n = Object.assign({}, o, { version: VERSION });
    const comp = {}, bor = {}, pis = {};
    const viejas = o.completadas && typeof o.completadas === 'object' ? o.completadas : {};
    ['M1', 'M2', 'M3', 'M4', 'M5'].forEach((id) => {
      if (viejas[id]) comp[id] = viejas[id];
      if (o.borradores && o.borradores[id]) bor[id] = o.borradores[id];
      if (o.pistas && o.pistas[id]) pis[id] = o.pistas[id];
    });
    if (viejas.M6) {
      comp.M6 = { celdas: {}, extra: null, migrada: true };
      comp.M7 = { celdas: {}, extra: null, migrada: true };
    }
    if (viejas.M7) comp.M8 = viejas.M7;
    if (o.pistas && o.pistas.M7) pis.M8 = o.pistas.M7;
    n.completadas = comp;
    n.borradores = bor;
    n.pistas = pis;
    n.misionActual = o.misionActual >= 6 ? o.misionActual + 1 : o.misionActual;
    n.registro = (Array.isArray(o.registro) ? o.registro : []).map((r) => (r && r.mision === 'M7' ? Object.assign({}, r, { mision: 'M8' }) : r));
    n.leccionesVistas = {};
    for (let i = 0; i < n.misionActual; i++) n.leccionesVistas['M' + (i + 1)] = true;
    n.escuela = { ejercicios: {}, saltada: true };
    return n;
  }

  function cargar(texto) {
    let o;
    try { o = typeof texto === 'string' ? JSON.parse(texto) : texto; } catch (e) { throw new Error('El archivo no es una partida válida.'); }
    if (o && o.version === 1 && Number.isInteger(o.misionActual) && o.misionActual >= 0 && o.misionActual <= 7) o = migrarV1(o);
    if (!o || o.version !== VERSION || typeof o.nombre !== 'string' || !Number.isInteger(o.semilla) ||
        !Number.isInteger(o.misionActual) || o.misionActual < 0 || o.misionActual > MISIONES.length ||
        typeof o.xp !== 'number' || typeof o.oro !== 'number' || !o.stats || typeof o.stats !== 'object') {
      throw new Error('El archivo no es una partida válida.');
    }
    const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    const base = nuevaPartida(o.nombre, o.semilla);
    const estado = Object.assign(base, {
      iniciada: !!o.iniciada, tutorialVisto: !!o.tutorialVisto,
      misionActual: o.misionActual, xp: o.xp, oro: o.oro,
      completadas: obj(o.completadas),
      borradores: obj(o.borradores),
      pistas: obj(o.pistas),
      registro: Array.isArray(o.registro) ? o.registro : [],
      grafico: o.grafico || null,
      escuela: { ejercicios: obj(obj(o.escuela).ejercicios), saltada: !!obj(o.escuela).saltada },
      leccionesVistas: obj(o.leccionesVistas),
      practicas: obj(o.practicas)
    });
    STATS.forEach((s) => { estado.stats[s] = Number.isFinite(o.stats[s]) ? o.stats[s] : 1; });
    Practicas.OBJETOS.forEach((ob) => { estado.maestria[ob.id] = Number.isFinite(obj(o.maestria)[ob.id]) ? o.maestria[ob.id] : 0; });
    const pa = o.practicaActiva;
    estado.practicaActiva = pa && Practicas.plantilla(pa.id) && Number.isInteger(pa.rep)
      ? { id: pa.id, rep: pa.rep, borrador: obj(pa.borrador), pistas: Number.isInteger(pa.pistas) ? pa.pistas : 0 } : null;
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
    STATS, NOMBRES_STATS, nuevaPartida, nivel, rango, barraXP, mision, datosMision, terminada, avisoRango,
    requisitosCumplidos, requisitosFaltantes, nivelObjeto,
    leccionEscuelaCompleta, escuelaCompleta, aldeaDesbloqueada, escuelaProgreso, completarEjercicio, saltarEscuela, siguienteEjercicio,
    verLeccion, leccionVista, libro,
    activo, datosActivos, editarCelda, pistasUsadas, usarPista, entregar,
    practicasInfo, iniciarPractica, abandonarPractica, equipo, statsEfectivos,
    calcularAldea, resumenFinal,
    serializar, cargar, guardarLocal, cargarLocal, borrarLocal
  };
});
