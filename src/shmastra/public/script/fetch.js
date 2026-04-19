const MASTRA_AUTH_TOKEN = window.MASTRA_AUTH_TOKEN;
const MASTRA_SERVER_URL = window.MASTRA_SERVER_URL;

const mastraOrigin = (() => {
  if (!MASTRA_SERVER_URL) return window.location.origin;
  try { return new URL(MASTRA_SERVER_URL).origin; }
  catch { return window.location.origin; }
})();

function isMastraUrl(url) {
  if (url == null) return false;
  try { return new URL(url, window.location.href).origin === mastraOrigin; }
  catch { return false; }
}

function getRequestUrl(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return '';
}

function withAuth(input, init) {
  let headers;
  if (init && init.headers) {
    headers = new Headers(init.headers);
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    headers = new Headers(input.headers);
  } else {
    headers = new Headers();
  }
  headers.set('x-mastra-auth-token', MASTRA_AUTH_TOKEN);
  return { ...init, headers };
}

const originalFetch = window.fetch.bind(window);

const authFetch = (input, init) => {
  if (MASTRA_AUTH_TOKEN && isMastraUrl(getRequestUrl(input))) {
    return originalFetch(input, withAuth(input, init));
  }
  return originalFetch(input, init);
};

if (MASTRA_AUTH_TOKEN) {
  window.fetch = authFetch;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const IS_MASTRA = Symbol('shmastra.isMastraUrl');

  XMLHttpRequest.prototype.open = function (method, url) {
    this[IS_MASTRA] = isMastraUrl(url);
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (this[IS_MASTRA]) {
      try { this.setRequestHeader('x-mastra-auth-token', MASTRA_AUTH_TOKEN); }
      catch { /* header already sent or wrong state */ }
    }
    return originalSend.apply(this, arguments);
  };
}
