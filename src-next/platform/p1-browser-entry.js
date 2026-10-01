import { bootP1BrowserApp } from './p1-browser-app.js';
import { createBrowserPerformanceProbe } from './browser-performance-probe.js';

const root = document.querySelector('#mapless-p1-root');
if (!root) throw new Error('missing #mapless-p1-root');

const params = new URLSearchParams(globalThis.location?.search ?? '');
const performanceProbe = params.get('perf') === '1'
  ? createBrowserPerformanceProbe(globalThis)
  : null;
performanceProbe?.start();

bootP1BrowserApp(root, { performanceProbe }).then((app) => {
  globalThis.__maplessP1App = app;
  globalThis.__maplessP1Diagnostics = () => app.diagnostics();
}).catch((error) => {
  performanceProbe?.stop();
  globalThis.__maplessP1LastError = error instanceof Error ? error : new Error(String(error));
  console.error('[Mapless P1]', globalThis.__maplessP1LastError);
});
