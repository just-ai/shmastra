(function () {
    const SPA_PATTERN = /\/(agents|workflows)\//;
    const APPS_PATTERN = /\/(apps)\//;
    const BASE_PATH = window.MASTRA_STUDIO_BASE_PATH || '';

    document.addEventListener('click', (e) => {
        const a = e.composedPath().find((el) => el instanceof HTMLAnchorElement);
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href) return;

        if (SPA_PATTERN.test(href)) {
            const finalHref = BASE_PATH && !href.startsWith(BASE_PATH) ? BASE_PATH + href : href;
            e.preventDefault();
            history.replaceState(null, '', finalHref);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }

        if (APPS_PATTERN.test(href)) {
            const finalHref = !href.startsWith("/shmastra/") ? `/shmastra${href}` : href;
            e.preventDefault();
            window.open(finalHref, '_blank');
        }
    });
})();
