(function () {
    var isLocalhost = !window.MASTRA_SERVER_PROTOCOL || !window.MASTRA_SERVER_HOST || (window.MASTRA_SERVER_HOST === 'localhost');
    var port = window.MASTRA_SERVER_PORT && window.MASTRA_SERVER_PORT !== '80' && window.MASTRA_SERVER_PORT !== '443' ? ':' + window.MASTRA_SERVER_PORT : '';
    var API_BASE_URL = isLocalhost ? '' : (window.MASTRA_SERVER_PROTOCOL + '://' + window.MASTRA_SERVER_HOST + port);
    var BASE_URL = '/shmastra/public';
    var isApp = window.location.pathname.startsWith('/apps/');

    // Patch fetch/XHR with auth token for Mastra requests
    var token = window.MASTRA_AUTH_TOKEN;
    if (token) {
        // Resolve "Mastra origin" off the document base, not the location, so
        // app pages served from cloud.com with `<base href="https://sandbox/…">`
        // still treat sandbox-bound fetches as Mastra-bound (and get the auth
        // header). For Mastra-served pages, document.baseURI === location.href
        // so this is equivalent to the old behaviour.
        var docBaseOrigin;
        try { docBaseOrigin = new URL(document.baseURI).origin; } catch { docBaseOrigin = window.location.origin; }
        var mastraOrigin = API_BASE_URL || docBaseOrigin;

        var isMastraUrl = function (url) {
            if (url == null) return false;
            try { return new URL(url, document.baseURI).origin === mastraOrigin; }
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
            headers.set('Authorization', 'Bearer ' + token);
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
                try { this.setRequestHeader('Authorization', 'Bearer ' + token); } catch {}
            }
            return originalSend.apply(this, arguments);
        };
    }

    function addScript(src, onload) {
        var script = document.createElement('script');
        script.async = false;
        script.src = BASE_URL + '/script/' + src;
        if (onload) script.onload = onload;
        document.head.appendChild(script);
    }

    function loadWidget() {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = BASE_URL + '/shmastra.css';
        document.head.appendChild(link);

        addScript('assistant-widget.iife.js', function () {
            AssistantWidget.initAssistantWidget({
                apiBaseUrl: API_BASE_URL,
                openOnStart: !isApp,
            });
        });
    }

    if (isApp) {
        // Ask the server "am I the owner of this sandbox?" — the answer
        // governs whether to load the 1MB coding-widget bundle. We don't
        // hardcode any URL-shape knowledge here (e.g. "/apps/shared/")
        // because sharing is a hosting-layer concept, not a shmastra one;
        // the only thing shmastra trusts is its own auth role.
        // Guests get 403 from /shmastra/api/* (authorizeUser deny rule),
        // standalone-without-auth has no ALS user and falls back to owner.
        fetch('/shmastra/api/user')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (data && data.role === 'owner') loadWidget();
            })
            .catch(function () {})
            .finally(function () {
                addScript('upload-file.js');
                addScript('html-preview.js');
            });
        return;
    }

    // Studio (non-app) path: original behaviour.
    if (!window.location.pathname.includes('/agents/session/')) {
        loadWidget();
    }
    addScript('upload-file.js');
    addScript('html-preview.js');
    addScript('spa-nav.js');
})();
