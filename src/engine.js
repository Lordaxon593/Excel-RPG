/* Motor de fórmulas y hoja de cálculo (Excel en español de España). Sin DOM. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Engine = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FUNCIONES = ['SUMA', 'PROMEDIO', 'MAX', 'MIN', 'CONTAR', 'SI', 'ENTERO', 'REDONDEAR'];

  const EXPLICACIONES = {
    '#¿NOMBRE?': 'Excel no reconoce una función o un nombre de la fórmula. Revisa que esté bien escrito.',
    '#DIV/0!': 'Estás dividiendo entre cero (o entre una celda vacía). Una división necesita un divisor distinto de 0.',
    '#VALOR!': 'Estás operando con texto o con un tipo de dato que no encaja. Las operaciones necesitan números.',
    '#REF!': 'La fórmula apunta a una celda que no existe en esta hoja.',
    '#CIRCULAR': 'Referencia circular: la fórmula depende de sí misma, directa o indirectamente.',
    '#ERROR!': 'La fórmula no está bien escrita. Revisa paréntesis, operadores y separadores.'
  };

  class ErrorHoja {
    constructor(codigo, explicacion) {
      this.codigo = codigo;
      this.explicacion = explicacion || EXPLICACIONES[codigo] || '';
    }
    toString() { return this.codigo; }
  }
  const err = (codigo, explicacion) => new ErrorHoja(codigo, explicacion);
  const esError = (v) => v instanceof ErrorHoja;

  /* ---------- Referencias ---------- */
  function colALetra(c) {
    let s = '';
    c += 1;
    while (c > 0) {
      const m = (c - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      c = Math.floor((c - 1) / 26);
    }
    return s;
  }
  function letraACol(s) {
    let n = 0;
    for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }
  const RE_REF = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/;
  function parsearRef(texto) {
    const m = RE_REF.exec(String(texto).trim());
    if (!m) return null;
    return { c: letraACol(m[2]), r: parseInt(m[4], 10), absC: m[1] === '$', absR: m[3] === '$' };
  }
  const refA1 = (c, r) => colALetra(c) + r;

  /* ---------- Tokenizador ---------- */
  const ERR_SINTAXIS = () => err('#ERROR!', 'La fórmula no está bien escrita: revisa paréntesis, operadores y separadores.');
  const ERR_COMA = () => err('#ERROR!', 'En Excel en español los argumentos se separan con ; (punto y coma)');
  const esDig = (c) => c !== undefined && c >= '0' && c <= '9';
  const RE_PALABRA = /[A-Za-z0-9_.$ÁÉÍÓÚÜÑáéíóúüñ]/;
  const RE_INICIO = /[A-Za-z_$ÁÉÍÓÚÜÑáéíóúüñ]/;

  function tokenizar(src) {
    const toks = [];
    const n = src.length;
    let i = 0;
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (esDig(c)) {
        let j = i;
        while (esDig(src[j])) j++;
        if ((src[j] === ',' || src[j] === '.') && esDig(src[j + 1])) {
          j++;
          while (esDig(src[j])) j++;
        }
        if (src[j] !== undefined && RE_INICIO.test(src[j])) throw ERR_SINTAXIS();
        toks.push({ t: 'num', v: parseFloat(src.slice(i, j).replace(',', '.')), i, j });
        i = j;
        continue;
      }
      if (c === '"') {
        let j = i + 1;
        let s = '';
        let cerrada = false;
        while (j < n) {
          if (src[j] === '"') {
            if (src[j + 1] === '"') { s += '"'; j += 2; continue; }
            cerrada = true;
            j++;
            break;
          }
          s += src[j++];
        }
        if (!cerrada) throw ERR_SINTAXIS();
        toks.push({ t: 'str', v: s, i, j });
        i = j;
        continue;
      }
      if (RE_INICIO.test(c)) {
        let j = i;
        while (j < n && RE_PALABRA.test(src[j])) j++;
        const palabra = src.slice(i, j);
        if (src[j] === '(') {
          toks.push({ t: 'func', v: palabra.toUpperCase(), i, j });
          i = j;
          continue;
        }
        const ra = parsearRef(palabra);
        if (ra) {
          if (src[j] === ':') {
            let k = j + 1;
            while (k < n && RE_PALABRA.test(src[k])) k++;
            const rb = parsearRef(src.slice(j + 1, k));
            if (!rb) throw ERR_SINTAXIS();
            toks.push({ t: 'rango', a: ra, b: rb, i, j: k });
            i = k;
          } else {
            toks.push({ t: 'ref', ref: ra, i, j });
            i = j;
          }
          continue;
        }
        toks.push({ t: 'nombre', v: palabra.toUpperCase(), i, j });
        i = j;
        continue;
      }
      if (c === ',') throw ERR_COMA();
      const dos = src.slice(i, i + 2);
      if (dos === '<>' || dos === '<=' || dos === '>=') {
        toks.push({ t: 'op', v: dos, i, j: i + 2 });
        i += 2;
        continue;
      }
      if ('+-*/^=<>();'.includes(c)) {
        toks.push({ t: 'op', v: c, i, j: i + 1 });
        i++;
        continue;
      }
      throw ERR_SINTAXIS();
    }
    return toks;
  }

  /* ---------- Parser ---------- */
  function parsear(toks) {
    let p = 0;
    const sig = () => toks[p];
    const esOp = (v) => toks[p] && toks[p].t === 'op' && toks[p].v === v;
    function esperar(v) {
      if (!esOp(v)) throw ERR_SINTAXIS();
      p++;
    }
    function cmp() {
      let a = suma();
      while (sig() && sig().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(sig().v)) {
        const op = toks[p++].v;
        a = { t: 'bin', op, a, b: suma() };
      }
      return a;
    }
    function suma() {
      let a = mul();
      while (esOp('+') || esOp('-')) {
        const op = toks[p++].v;
        a = { t: 'bin', op, a, b: mul() };
      }
      return a;
    }
    function mul() {
      let a = pot();
      while (esOp('*') || esOp('/')) {
        const op = toks[p++].v;
        a = { t: 'bin', op, a, b: pot() };
      }
      return a;
    }
    function pot() {
      let a = unario();
      while (esOp('^')) {
        p++;
        a = { t: 'bin', op: '^', a, b: unario() };
      }
      return a;
    }
    function unario() {
      if (esOp('-') || esOp('+')) {
        const op = toks[p++].v;
        return { t: 'un', op, e: unario() };
      }
      return primario();
    }
    function primario() {
      const tk = sig();
      if (!tk) throw ERR_SINTAXIS();
      if (tk.t === 'num' || tk.t === 'str') { p++; return { t: tk.t, v: tk.v }; }
      if (tk.t === 'ref') { p++; return { t: 'ref', c: tk.ref.c, r: tk.ref.r }; }
      if (tk.t === 'rango') { p++; return { t: 'rango', a: tk.a, b: tk.b }; }
      if (tk.t === 'nombre') { p++; return { t: 'nombre', v: tk.v }; }
      if (tk.t === 'func') {
        p++;
        esperar('(');
        const args = [];
        if (!esOp(')')) {
          args.push(cmp());
          while (esOp(';')) { p++; args.push(cmp()); }
        }
        esperar(')');
        return { t: 'func', nombre: tk.v, args };
      }
      if (esOp('(')) {
        p++;
        const e = cmp();
        esperar(')');
        return e;
      }
      throw ERR_SINTAXIS();
    }
    const raiz = cmp();
    if (p < toks.length) throw ERR_SINTAXIS();
    return raiz;
  }

  const cacheCompilado = new Map();
  function compilar(raw) {
    let r = cacheCompilado.get(raw);
    if (r) return r;
    try {
      r = { ast: parsear(tokenizar(raw.slice(1))) };
    } catch (e) {
      if (!(e instanceof ErrorHoja)) throw e;
      r = { error: e };
    }
    if (cacheCompilado.size > 5000) cacheCompilado.clear();
    cacheCompilado.set(raw, r);
    return r;
  }

  /* ---------- Conversión de valores ---------- */
  const RE_NUM = /^\s*[+-]?\d+([.,]\d+)?\s*$/;
  function textoANumero(s) {
    return RE_NUM.test(s) ? parseFloat(s.replace(',', '.')) : null;
  }
  function interpretar(raw) {
    if (raw === undefined || raw === null) return null;
    const t = String(raw);
    if (t.trim() === '') return null;
    const n = textoANumero(t);
    return n === null ? t : n;
  }
  const escalar = (v) => (v && v.celdas ? err('#VALOR!', 'Aquí hace falta un único valor, no un rango. Usa una función como SUMA para trabajar con rangos.') : v);
  function aNumero(v) {
    if (esError(v)) return v;
    if (typeof v === 'number') return v;
    if (v === null) return 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const n = textoANumero(v);
    return n === null ? err('#VALOR!') : n;
  }

  /* ---------- Evaluación ---------- */
  class Pasada {
    constructor(hoja) {
      this.hoja = hoja;
      this.memo = new Map();
      this.enCurso = new Set();
    }
    celda(c, r) {
      const h = this.hoja;
      if (c < 0 || r < 1 || c >= h.cols || r > h.filas) return err('#REF!');
      const clave = r * 1000 + c;
      if (this.memo.has(clave)) return this.memo.get(clave);
      if (this.enCurso.has(clave)) return err('#CIRCULAR');
      this.enCurso.add(clave);
      let v;
      const raw = h.crudoCR(c, r);
      if (typeof raw === 'string' && raw.startsWith('=')) v = this.formula(raw);
      else v = interpretar(raw);
      this.enCurso.delete(clave);
      this.memo.set(clave, v);
      return v;
    }
    formula(raw) {
      const comp = compilar(raw);
      if (comp.error) return comp.error;
      let v = evaluar(comp.ast, this);
      v = escalar(v);
      return v === null ? 0 : v;
    }
    rango(n) {
      const h = this.hoja;
      for (const e of [n.a, n.b]) {
        if (e.c < 0 || e.r < 1 || e.c >= h.cols || e.r > h.filas) return err('#REF!');
      }
      const c1 = Math.min(n.a.c, n.b.c), c2 = Math.max(n.a.c, n.b.c);
      const r1 = Math.min(n.a.r, n.b.r), r2 = Math.max(n.a.r, n.b.r);
      const celdas = [];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) celdas.push(this.celda(c, r));
      return { celdas };
    }
  }

  function comparar(op, a, b) {
    if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
    if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
    const rango = (x) => (typeof x === 'number' ? 0 : typeof x === 'string' ? 1 : 2);
    let cmp;
    if (rango(a) !== rango(b)) cmp = rango(a) - rango(b);
    else if (typeof a === 'string') {
      const x = a.toLowerCase(), y = b.toLowerCase();
      cmp = x < y ? -1 : x > y ? 1 : 0;
    } else cmp = a < b ? -1 : a > b ? 1 : 0;
    switch (op) {
      case '=': return cmp === 0;
      case '<>': return cmp !== 0;
      case '<': return cmp < 0;
      case '>': return cmp > 0;
      case '<=': return cmp <= 0;
      default: return cmp >= 0;
    }
  }

  function recolectar(args, ctx, nombre) {
    const out = [];
    for (const a of args) {
      if (a.t === 'ref' || a.t === 'rango') {
        const v = evaluar(a, ctx);
        if (esError(v)) return v;
        for (const x of v.celdas || [v]) {
          if (esError(x)) return x;
          if (typeof x === 'number') out.push(x);
        }
      } else {
        const v = escalar(evaluar(a, ctx));
        if (esError(v)) return v;
        if (typeof v === 'number') out.push(v);
        else if (typeof v === 'boolean') out.push(v ? 1 : 0);
        else if (typeof v === 'string') {
          const n = textoANumero(v);
          if (n !== null) out.push(n);
          else if (nombre !== 'CONTAR') return err('#VALOR!', 'Has escrito texto donde la función espera números.');
        }
      }
    }
    return out;
  }

  function redondear(x, d) {
    d = Math.trunc(d);
    const f = Math.pow(10, d);
    const abs = Math.abs(x) * f * (1 + 1e-15);
    return (Math.sign(x) * Math.round(abs)) / f;
  }

  function aridad(nombre, args, min, max) {
    if (args.length < min || args.length > max) {
      const cuantos = min === max ? `${min}` : `entre ${min} y ${max}`;
      return err('#ERROR!', `La función ${nombre} necesita ${cuantos} argumento(s) separados por ;`);
    }
    return null;
  }

  function llamar(n, ctx) {
    const { nombre, args } = n;
    let e;
    switch (nombre) {
      case 'SUMA': case 'PROMEDIO': case 'MAX': case 'MIN': case 'CONTAR': {
        if (args.length < 1) return err('#ERROR!', `La función ${nombre} necesita al menos un argumento.`);
        const nums = recolectar(args, ctx, nombre);
        if (esError(nums)) return nums;
        if (nombre === 'SUMA') return nums.reduce((s, x) => s + x, 0);
        if (nombre === 'CONTAR') return nums.length;
        if (nombre === 'PROMEDIO') {
          return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : err('#DIV/0!', 'PROMEDIO no encontró ningún número que promediar.');
        }
        if (!nums.length) return 0;
        return nombre === 'MAX' ? Math.max(...nums) : Math.min(...nums);
      }
      case 'SI': {
        if ((e = aridad(nombre, args, 2, 3))) return e;
        let cond = escalar(evaluar(args[0], ctx));
        if (esError(cond)) return cond;
        if (typeof cond === 'string') return err('#VALOR!', 'La condición de SI debe ser una comparación (verdadera o falsa), no texto.');
        cond = cond === null ? false : typeof cond === 'boolean' ? cond : cond !== 0;
        if (cond) return escalar(evaluar(args[1], ctx));
        return args[2] ? escalar(evaluar(args[2], ctx)) : false;
      }
      case 'ENTERO': {
        if ((e = aridad(nombre, args, 1, 1))) return e;
        const x = aNumero(escalar(evaluar(args[0], ctx)));
        return esError(x) ? x : Math.floor(x);
      }
      case 'REDONDEAR': {
        if ((e = aridad(nombre, args, 2, 2))) return e;
        const x = aNumero(escalar(evaluar(args[0], ctx)));
        if (esError(x)) return x;
        const d = aNumero(escalar(evaluar(args[1], ctx)));
        return esError(d) ? d : redondear(x, d);
      }
      default:
        return err('#¿NOMBRE?', `Excel no reconoce la función «${nombre}». En este juego tienes: ${FUNCIONES.join(', ')}.`);
    }
  }

  function evaluar(n, ctx) {
    switch (n.t) {
      case 'num': case 'str': return n.v;
      case 'ref': return ctx.celda(n.c, n.r);
      case 'rango': return ctx.rango(n);
      case 'nombre': return err('#¿NOMBRE?', `Excel no reconoce «${n.v}». Si es texto, ponlo entre comillas dobles; si es una celda, revisa su letra y número.`);
      case 'func': return llamar(n, ctx);
      case 'un': {
        const x = aNumero(escalar(evaluar(n.e, ctx)));
        if (esError(x)) return x;
        return n.op === '-' ? -x : x;
      }
      case 'bin': {
        const a = escalar(evaluar(n.a, ctx));
        const b = escalar(evaluar(n.b, ctx));
        if (esError(a)) return a;
        if (esError(b)) return b;
        if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) return comparar(n.op, a, b);
        const x = aNumero(a);
        if (esError(x)) return x;
        const y = aNumero(b);
        if (esError(y)) return y;
        let r;
        switch (n.op) {
          case '+': r = x + y; break;
          case '-': r = x - y; break;
          case '*': r = x * y; break;
          case '/':
            if (y === 0) return err('#DIV/0!');
            r = x / y;
            break;
          default: r = Math.pow(x, y);
        }
        return Number.isFinite(r) ? r : err('#VALOR!', 'El resultado no es un número válido.');
      }
    }
    return err('#ERROR!');
  }

  /* ---------- Formato ---------- */
  function formatear(v) {
    if (esError(v)) return v.codigo;
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
    if (typeof v === 'number') {
      if (Math.abs(v) < 0.005) return '0';
      return v.toLocaleString('es-ES', { maximumFractionDigits: 2 });
    }
    return String(v);
  }

  /* ---------- Hoja ---------- */
  class Hoja {
    constructor(cols, filas) {
      this.cols = cols || 10;
      this.filas = filas || 20;
      this.datos = new Map();
      this._pasada = null;
    }
    static desde(obj, cols, filas) {
      const h = new Hoja(cols, filas);
      for (const k of Object.keys(obj || {})) h.poner(k, obj[k]);
      return h;
    }
    poner(ref, raw) {
      const k = String(ref).toUpperCase();
      if (raw === '' || raw === null || raw === undefined) this.datos.delete(k);
      else this.datos.set(k, String(raw));
      this._pasada = null;
    }
    crudo(ref) { return this.datos.get(String(ref).toUpperCase()); }
    crudoCR(c, r) { return this.datos.get(refA1(c, r)); }
    celdas() {
      const o = {};
      for (const [k, v] of this.datos) o[k] = v;
      return o;
    }
    valor(ref) {
      const pr = parsearRef(ref);
      if (!pr) return err('#REF!');
      if (!this._pasada) this._pasada = new Pasada(this);
      return this._pasada.celda(pr.c, pr.r);
    }
    texto(ref) { return formatear(this.valor(ref)); }
  }

  /* ---------- Análisis y relleno ---------- */
  function analizar(raw) {
    const info = { esFormula: false, funciones: [], referencias: 0, error: false };
    if (typeof raw !== 'string' || !raw.startsWith('=')) return info;
    info.esFormula = true;
    try {
      for (const t of tokenizar(raw.slice(1))) {
        if (t.t === 'func') info.funciones.push(t.v);
        else if (t.t === 'ref' || t.t === 'rango') info.referencias++;
      }
    } catch (e) {
      if (!(e instanceof ErrorHoja)) throw e;
      info.error = true;
    }
    return info;
  }

  function desplazarRef(r, dc, dr) {
    const c = r.absC ? r.c : r.c + dc;
    const f = r.absR ? r.r : r.r + dr;
    if (c < 0 || f < 1) return null;
    return (r.absC ? '$' : '') + colALetra(c) + (r.absR ? '$' : '') + f;
  }

  function desplazarFormula(raw, dc, dr) {
    if (typeof raw !== 'string' || !raw.startsWith('=')) return raw;
    const src = raw.slice(1);
    let toks;
    try { toks = tokenizar(src); } catch (e) { return raw; }
    let out = '=';
    let ult = 0;
    for (const t of toks) {
      if (t.t !== 'ref' && t.t !== 'rango') continue;
      out += src.slice(ult, t.i);
      if (t.t === 'ref') out += desplazarRef(t.ref, dc, dr) || '#REF!';
      else {
        const a = desplazarRef(t.a, dc, dr), b = desplazarRef(t.b, dc, dr);
        out += a && b ? a + ':' + b : '#REF!';
      }
      ult = t.j;
    }
    return out + src.slice(ult);
  }

  /* Como Ctrl+D: devuelve el contenido para las n filas situadas debajo de la celda superior. */
  function rellenarAbajo(rawSuperior, n) {
    const res = [];
    for (let k = 1; k <= n; k++) res.push(desplazarFormula(rawSuperior, 0, k));
    return res;
  }

  return {
    FUNCIONES, EXPLICACIONES, ErrorHoja, esError, Hoja,
    colALetra, letraACol, parsearRef, refA1,
    interpretar, formatear, analizar, desplazarFormula, rellenarAbajo
  };
});
