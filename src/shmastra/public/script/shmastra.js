(function () {
    var isLocalhost = !window.MASTRA_SERVER_PROTOCOL || !window.MASTRA_SERVER_HOST || (window.MASTRA_SERVER_HOST === 'localhost');
    var port = window.MASTRA_SERVER_PORT && window.MASTRA_SERVER_PORT !== '80' && window.MASTRA_SERVER_PORT !== '443' ? ':' + window.MASTRA_SERVER_PORT : '';
    var API_BASE_URL = isLocalhost ? '' : (window.MASTRA_SERVER_PROTOCOL + '://' + window.MASTRA_SERVER_HOST + port);
    var BASE_URL = '/shmastra/public';
    var isApp = window.location.pathname.startsWith('/shmastra/apps/');

    // Patch fetch/XHR with auth token for Mastra requests
    var token = window.MASTRA_AUTH_TOKEN;
    if (token) {
        var mastraOrigin = API_BASE_URL || window.location.origin;

        var isMastraUrl = function (url) {
            if (url == null) return false;
            try { return new URL(url, window.location.href).origin === mastraOrigin; }
            catch { return false; }
        };

        var getRequestUrl = function (input) {
            if (!input) return '';
            if (typeof input === 'string') return input;
            if (input instanceof URL) return input.href;
            if (input instanceof Request) return input.url;
            return '';
        };

        var withAuth = function (input, init) {
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
        };

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
    }

    if (isApp) return;

    function addScript(src, onload) {
        var script = document.createElement('script');
        script.async = false;
        script.src = BASE_URL + '/script/' + src;
        if (onload) script.onload = onload;
        document.head.appendChild(script);
    }

    if (!window.location.pathname.includes('/agents/session/')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = BASE_URL + '/shmastra.css';
        document.head.appendChild(link);

        addScript('assistant-widget.iife.js', function () {
            AssistantWidget.initAssistantWidget({
                apiBaseUrl: API_BASE_URL,
            });
        });
    }

    addScript('upload-file.js');
    addScript('html-preview.js');
    addScript('spa-nav.js');
})();
