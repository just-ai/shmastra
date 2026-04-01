(function () {
    const SPA_PATTERN = /\/(agents|workflows)\//;

    document.addEventListener('click', (e) => {
        const a = e.composedPath().find((el) => el instanceof HTMLAnchorElement);
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || !SPA_PATTERN.test(href)) return;

        const base = window.MASTRA_STUDIO_BASE_PATH || '';
        const finalHref = base && !href.startsWith(base) ? base + href : href;

        e.preventDefault();
        history.replaceState(null, '', finalHref);
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
})();
