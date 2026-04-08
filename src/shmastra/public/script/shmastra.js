(function () {
    const isLocalhost = !window.MASTRA_SERVER_PROTOCOL || !window.MASTRA_SERVER_HOST || (window.MASTRA_SERVER_HOST === 'localhost');
    const port = window.MASTRA_SERVER_PORT && window.MASTRA_SERVER_PORT !== '80' && window.MASTRA_SERVER_PORT !== '443' ? `:${window.MASTRA_SERVER_PORT}` : '';
    const BASE_ENDPOINT = isLocalhost ? "" : `${window.MASTRA_SERVER_PROTOCOL}://${window.MASTRA_SERVER_HOST}${port}`;
    const BASE_URL = `${BASE_ENDPOINT}/shmastra/public`;

    function addScript(src, onload) {
        var script = document.createElement('script');
        script.src = `${BASE_URL}/script/${src}`;
        if (onload) script.onload = onload;
        document.head.appendChild(script);
    }

    if (!window.location.pathname.includes('/agents/session/')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${BASE_URL}/shmastra.css`;
        document.head.appendChild(link);

        addScript('assistant-widget.iife.js', function () {
            AssistantWidget.initAssistantWidget({
                theme: 'dark',
                apiBaseUrl: BASE_ENDPOINT,
            });
        });
    }

    addScript('upload-file.js');
    addScript('html-preview.js');
    addScript('spa-nav.js');
})();
