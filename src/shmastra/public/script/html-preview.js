(function () {
    const FILE_HTML_PATTERN = /\/api\/files\/[^"']+\.html/;

    function replaceHtmlLinks() {
        document.querySelectorAll('a[href]').forEach((a) => {
            if (a.dataset.htmlPreviewHandled) return;
            const href = a.getAttribute('href');
            if (!FILE_HTML_PATTERN.test(href)) return;
            a.dataset.htmlPreviewHandled = 'true';

            const iframe = document.createElement('iframe');
            iframe.src = href;
            iframe.style.cssText = 'width:100%;min-height:300px;margin:0;padding:0;border:0;';
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

            // Auto-resize iframe to fit content
            iframe.addEventListener('load', () => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    iframe.style.height = doc.documentElement.scrollHeight + 'px';
                } catch (e) {
                    // cross-origin – keep min-height
                }
            });

            a.after(iframe);
        });
    }

    const observer = new MutationObserver(() => replaceHtmlLinks());
    observer.observe(document.body, { childList: true, subtree: true });
    replaceHtmlLinks();
})();
