(function () {
  var token = window.MASTRA_AUTH_TOKEN;
  if (!token) return;

  var mastraOrigin = window.MASTRA_SERVER_URL
    ? new URL(window.MASTRA_SERVER_URL).origin
    : window.MASTRA_SERVER_HOST
      ? (window.MASTRA_SERVER_PROTOCOL || 'https') + '://' + window.MASTRA_SERVER_HOST +
        (window.MASTRA_SERVER_PORT && window.MASTRA_SERVER_PORT !== '80' && window.MASTRA_SERVER_PORT !== '443'
          ? ':' + window.MASTRA_SERVER_PORT : '')
      : window.location.origin;

  function isMastraUrl(url) {
    if (url == null) return false;
    try { return new URL(url, window.location.href).origin === mastraOrigin; }
    catch { return false; }
  }

  function getRequestUrl(input) {
    if (!input) return '';
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input instanceof Request) return input.url;
    return '';
  }

  function withAuth(input, init) {
    var headers;
    if (init && init.headers) {
      headers = new Headers(init.headers);
    } else if (input instanceof Request) {
      headers = new Headers(input.headers);
    } else {
      headers = new Headers();
    }
    headers.set('x-mastra-auth-token', token);
    return Object.assign({}, init, { headers: headers });
  }

  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (isMastraUrl(getRequestUrl(input))) {
      return originalFetch(input, withAuth(input, init));
    }
    return originalFetch(input, init);
  };

  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;
  var IS_MASTRA = Symbol('shmastra.isMastraUrl');

  XMLHttpRequest.prototype.open = function () {
    this[IS_MASTRA] = isMastraUrl(arguments[1]);
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (this[IS_MASTRA]) {
      try { this.setRequestHeader('x-mastra-auth-token', token); } catch {}
    }
    return originalSend.apply(this, arguments);
  };
})();
