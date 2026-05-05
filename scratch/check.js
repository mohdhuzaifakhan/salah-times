const fs = require('fs');
const path = require('path');
const pkgs = new Set();
function readDir(d) {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d, { withFileTypes: true }).forEach(f => {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      readDir(p);
    } else if (f.name.endsWith('.ts') || f.name.endsWith('.tsx')) {
      const content = fs.readFileSync(p, 'utf-8');
      const matches = content.matchAll(/from ['"]([^'"]+)['"]/g);
      for (const m of matches) {
        if (!m[1].startsWith('.')) {
          let pkg = m[1].split('/')[0];
          if (pkg.startsWith('@')) {
            pkg = m[1].split('/').slice(0, 2).join('/');
          }
          pkgs.add(pkg);
        }
      }
    }
  });
}
['app', 'components', 'constants', 'lib'].forEach(readDir);
const used = Array.from(pkgs);
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const allDeps = Object.keys(packageJson.dependencies);
const unused = allDeps.filter(d => !used.includes(d) && !d.startsWith('expo-') && !d.startsWith('react-native-') && d !== 'expo' && d !== 'react' && d !== 'react-dom' && d !== 'react-native');
console.log("Used directly:", used.sort().join(", "));
console.log("Potentially unused from package.json:", unused.sort().join(", "));
