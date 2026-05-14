import { Mastra } from './mastra.js';

// Resolve the Mastra origin from <base href> when present so apps served via a
// cloud frontend (which injects `<base href="https://<sandbox>/apps/<name>/">`)
// hit the sandbox directly instead of going back through the cloud proxy. With
// no <base>, document.baseURI equals location.href and this is equivalent to
// location.origin.
const docBaseOrigin = (() => {
  try { return new URL(document.baseURI).origin; }
  catch { return window.location.origin; }
})();

const API_BASE_URL = window.MASTRA_SERVER_URL
  || (window.MASTRA_SERVER_HOST
    ? `${window.MASTRA_SERVER_PROTOCOL || 'https'}://${window.MASTRA_SERVER_HOST}${window.MASTRA_SERVER_PORT && window.MASTRA_SERVER_PORT !== '80' && window.MASTRA_SERVER_PORT !== '443' ? ':' + window.MASTRA_SERVER_PORT : ''}`
    : docBaseOrigin);

let controller = new AbortController();

export const mastra = new Mastra({
  baseUrl: API_BASE_URL,
  apiPrefix: window.MASTRA_API_PREFIX || '/api',
  abortSignal: controller.signal,
});

export function abort() {
  controller.abort();
  controller = new AbortController();
  mastra.options.abortSignal = controller.signal;
}

export async function uploadFile(file, signal) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/shmastra/api/files`, { method: 'POST', body: form, signal });
  if (!res.ok) throw new Error('Upload failed');
  const { fileName } = await res.json();
  return fileName;
}
