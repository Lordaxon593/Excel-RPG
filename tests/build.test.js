'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { construir, comprobar } = require('../build.js');

test('el build genera un HTML único, que parsea y sin recursos externos', () => {
  const r = construir();
  const kb = comprobar(r);
  assert.ok(kb < 300);
  assert.doesNotThrow(() => new vm.Script(r.script));
  assert.ok(!r.html.includes('http://') && !r.html.includes('https://') && !r.html.includes('src="'));
  assert.ok(r.html.includes('<style>') && r.html.includes('id="app"'));
});

test('el build rechaza referencias externas', () => {
  assert.throws(() => comprobar({ html: '<img src="x.png">', script: '1' }), /externa/);
  assert.throws(() => comprobar({ html: 'https://x.es', script: '1' }), /externa/);
  assert.throws(() => comprobar({ html: 'ok', script: 'function (' }));
});

test('dist/aldea.html está actualizado respecto a las fuentes', () => {
  const f = path.join(__dirname, '..', 'dist', 'aldea.html');
  assert.ok(fs.existsSync(f), 'ejecuta npm run build');
  assert.strictEqual(fs.readFileSync(f, 'utf8'), construir().html);
});

test('el script completo arranca en un navegador simulado sin errores', () => {
  const { script } = construir();
  const eventos = {};
  const elem = () => ({ innerHTML: '', addEventListener: (t, f) => { eventos[t] = f; }, querySelector: () => null });
  const app = elem();
  const sandbox = {
    document: { getElementById: () => app, addEventListener() {}, createElement: elem, body: {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Blob: function () {}, URL: {}, FileReader: function () {}, setTimeout,
    confirm: () => false
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  assert.ok(app.innerHTML.includes('El nacimiento de la aldea'));
  assert.ok(app.innerHTML.includes('data-act="empezar"'));
});
