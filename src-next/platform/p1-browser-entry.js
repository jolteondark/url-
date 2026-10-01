import { bootP1BrowserApp } from './p1-browser-app.js';

const root = document.querySelector('#mapless-p1-root');
if (!root) throw new Error('missing #mapless-p1-root');
bootP1BrowserApp(root).catch((error) => {
  globalThis.__maplessP1LastError = error instanceof Error ? error : new Error(String(error));
  console.error('[Mapless P1]', globalThis.__maplessP1LastError);
});
