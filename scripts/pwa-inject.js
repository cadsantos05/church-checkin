const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const pub = path.join(__dirname, '..', 'public');

// Copy PWA assets to dist
const files = ['manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png'];
for (const file of files) {
  const src = path.join(pub, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, file));
    console.log(`  Copied ${file}`);
  }
}

// Inject PWA meta tags into index.html
const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const pwaMeta = `
  <meta name="theme-color" content="#0F0F0F" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Kids Check-in" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
`;

const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); });
    }
  </script>
`;

if (!html.includes('manifest.json')) {
  html = html.replace('</head>', pwaMeta + '</head>');
  html = html.replace('</body>', swScript + '</body>');
  fs.writeFileSync(htmlPath, html);
  console.log('  PWA tags injected into index.html');
} else {
  console.log('  PWA tags already present');
}

console.log('\n✅ PWA build complete! Deploy the /dist folder.');
