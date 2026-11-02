// Builds the optional Windows desktop app (Neutralino wrapper around index.html).
const { copyFileSync } = require('node:fs');
const { execSync } = require('node:child_process');
const run = c => execSync(c, { cwd: 'desktop', stdio: 'inherit' });
copyFileSync('index.html', 'desktop/resources/index.html');
run('npx --yes @neutralinojs/neu update');
run('npx --yes @neutralinojs/neu build --embed-resources');
console.log('\nDone. Windows exe: desktop/dist/os-algorithm-lab/os-algorithm-lab-win_x64.exe');
