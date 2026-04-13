const MASTRA_AUTH_TOKEN = window.MASTRA_AUTH_TOKEN;

const authFetch = (url, init = {}) => {
  if (MASTRA_AUTH_TOKEN) {
    init.headers = { ...init.headers, 'x-mastra-auth-token': MASTRA_AUTH_TOKEN };
  }
  return fetch(url, init);
};

// Patch XMLHttpRequest to include auth token
if (MASTRA_AUTH_TOKEN) {
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    this.setRequestHeader('x-mastra-auth-token', MASTRA_AUTH_TOKEN);
    return originalSend.apply(this, arguments);
  };
}

export default authFetch;
