const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '..', 'src', 'screens');

// Regex para encontrar <div className="... min-h-screen ..." (com ou sem bg-black, bg-slate, dark:bg, etc.)
// Apenas substituímos "min-h-screen bg-..." or similar patterns by "min-h-screen netflix-main-bg"
// Vamos focar nas substituições comuns
const regexes = [
  { p: /className="([^"]*)bg-black([^"]*)min-h-screen([^"]*)"/g, r: 'className="$1netflix-main-bg$2min-h-screen$3"' },
  { p: /className="([^"]*)min-h-screen([^"]*)bg-black([^"]*)"/g, r: 'className="$1min-h-screen$2netflix-main-bg$3"' },
  { p: /className="([^"]*)bg-slate-50\s+dark:bg-slate-900([^"]*)min-h-screen([^"]*)"/g, r: 'className="$1netflix-main-bg$2min-h-screen$3 text-white"' },
  { p: /className="([^"]*)min-h-screen([^"]*)bg-slate-50\s+dark:bg-slate-900([^"]*)"/g, r: 'className="$1min-h-screen$2netflix-main-bg$3 text-white"' },
  { p: /className="([^"]*)bg-white\s+dark:bg-slate-900([^"]*)min-h-screen([^"]*)"/g, r: 'className="$1netflix-main-bg$2min-h-screen$3 text-white"' },
  { p: /className="([^"]*)min-h-screen([^"]*)bg-white\s+dark:bg-slate-900([^"]*)"/g, r: 'className="$1min-h-screen$2netflix-main-bg$3 text-white"' },
  { p: /bg-slate-50 dark:bg-slate-900/g, r: 'netflix-main-bg text-white' },
  { p: /bg-white dark:bg-slate-900/g, r: 'netflix-main-bg text-white' },
  { p: /bg-[#020617]/g, r: 'netflix-main-bg' },
  { p: /bg-slate-950/g, r: 'netflix-main-bg' },
  { p: /bg-background-light dark:bg-background-dark/g, r: 'netflix-main-bg text-white' }
];

fs.readdirSync(screensDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(screensDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let mod = false;

    // Apenas aplica nas tags raízes se possível, ou substitui no aqruivo geral.
    // Usaremos a substituição geral para ser rápido.
    if (!file.includes('AuthScreen') && !file.includes('ProfileScreen') && !file.includes('ProviderDashboardScreen') && !file.includes('ForgotPassword') && !file.includes('UpdatePassword')) {
        let newContent = content;
        regexes.forEach(({p, r}) => {
             newContent = newContent.replace(p, r);
        });
        if (newContent !== content) {
             fs.writeFileSync(filePath, newContent, 'utf8');
             console.log(`Updated ${file}`);
        }
    }
  }
});
