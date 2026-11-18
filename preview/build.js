// Merakit pratinjau lokal: Index.html + Style + App + server tiruan. Folder ini tidak ikut di-push ke Apps Script.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const skema = vm.runInNewContext(rd('Skema.gs') + ';({MODUL:MODUL,URUTAN_MODUL:URUTAN_MODUL})');
const html = rd('Index.html')
  .replace("<?!= sertakan_('Style'); ?>", () => rd('Style.html'))
  .replace("<?!= sertakan_('App'); ?>", () => '<script>window.__SKEMA=' + JSON.stringify(skema) + ';</script><script src="mock.js"></script>' + rd('App.html'));
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('preview/index.html dibuat');
