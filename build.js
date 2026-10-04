'use strict';
/* Genera dist/aldea.html (un solo archivo, todo inline) y lo comprueba. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = __dirname;
const leer = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

function construir() {
  const css = leer('src/style.css');
  const script = ['engine', 'missions', 'libro', 'escuela', 'practicas', 'game', 'ui'].map((n) => leer(`src/${n}.js`)).join('\n;\n');
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Excel RPG - El nacimiento de la aldea</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>Este juego necesita JavaScript activado.</noscript>
<script>
${script}
</script>
</body>
</html>
`;
  return { html, script };
}

function comprobar({ html, script }) {
  new vm.Script(script, { filename: 'aldea.js' });
  const prohibidos = ['http://', 'https://', 'src="'];
  for (const p of prohibidos) {
    if (html.includes(p)) throw new Error(`El HTML contiene una referencia externa: ${p}`);
  }
  if (html.split('</script>').length !== 2) throw new Error('El script contiene una etiqueta </script> intermedia.');
  const kb = Buffer.byteLength(html, 'utf8') / 1024;
  if (kb >= 300) throw new Error(`El HTML pesa ${kb.toFixed(1)} KB (máximo 300 KB).`);
  return kb;
}

function main() {
  const r = construir();
  const kb = comprobar(r);
  fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'dist', 'aldea.html'), r.html);
  console.log(`dist/aldea.html generado (${kb.toFixed(1)} KB)`);
}

if (require.main === module) main();
module.exports = { construir, comprobar };
